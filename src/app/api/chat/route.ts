import { NextResponse } from "next/server";
import { generateBotReply } from "@/lib/chatbot";
import { newSessionCode } from "@/lib/codes";
import { detectErrors, isReask, reaskSimilarity } from "@/lib/nlp";
import { getSupabase } from "@/lib/supabase";
import type { ErrorFlag, Feedback, Message } from "@/lib/types";

const MAX_MESSAGE_LENGTH = 1000;

// Allow time for the OpenRouter request plus the database writes.
export const maxDuration = 30;

interface ChatMessagePayload extends Message {
  flags: ErrorFlag[];
  feedback: Feedback | null;
}

/**
 * POST /api/chat
 * Body: { sessionCode?: string, message: string }
 *
 * Steps:
 * 1. Find or create the anonymous session and the active conversation.
 * 2. Check if the customer re-asked the last question. If yes, flag the
 *    previous bot reply as Misinterpreted.
 * 3. Save the customer message.
 * 4. Generate the bot reply and run the NLP error detector.
 * 5. Save the bot reply and every flag.
 */
export async function POST(request: Request) {
  let body: { sessionCode?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (message.length === 0 || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `The message must be 1 to ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabase();

    // Step 1: resolve the session and the active conversation.
    let customerId: string | null = null;
    let sessionCode: string | null = null;
    let conversationId: string | null = null;

    if (body.sessionCode) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id, anon_code")
        .eq("anon_code", body.sessionCode)
        .maybeSingle();
      if (customer) {
        customerId = customer.id;
        sessionCode = customer.anon_code;
        const { data: conversation } = await supabase
          .from("conversations")
          .select("id")
          .eq("customer_id", customer.id)
          .eq("status", "Active")
          .order("start_time", { ascending: false })
          .limit(1)
          .maybeSingle();
        conversationId = conversation?.id ?? null;
      }
    }

    if (!customerId) {
      sessionCode = newSessionCode();
      const { data: customer, error } = await supabase
        .from("customers")
        .insert({ anon_code: sessionCode })
        .select("id")
        .single();
      if (error) throw error;
      customerId = customer.id;
    }

    if (!conversationId) {
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({ customer_id: customerId })
        .select("id")
        .single();
      if (error) throw error;
      conversationId = conversation.id;
    }

    // Load the conversation history (oldest first).
    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender, content, sent_at")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true })
      .order("id", { ascending: true });
    if (historyError) throw historyError;
    const messages: Message[] = history ?? [];

    // Step 2: re-ask check.
    const customerMessages = messages.filter((m) => m.sender === "Customer");
    const lastCustomerMessage = customerMessages[customerMessages.length - 1];
    if (lastCustomerMessage) {
      const similarity = reaskSimilarity(message, lastCustomerMessage.content);
      if (isReask(similarity)) {
        const lastIndex = messages.findIndex(
          (m) => m.id === lastCustomerMessage.id,
        );
        const previousBotReply = messages
          .slice(lastIndex + 1)
          .find((m) => m.sender === "Bot");
        if (previousBotReply) {
          const { data: existingFlag } = await supabase
            .from("error_flags")
            .select("id")
            .eq("message_id", previousBotReply.id)
            .eq("error_type", "Misinterpreted")
            .maybeSingle();
          if (!existingFlag) {
            const { error: flagError } = await supabase
              .from("error_flags")
              .insert({
                message_id: previousBotReply.id,
                error_type: "Misinterpreted",
                confidence_score: similarity,
              });
            if (flagError) throw flagError;
          }
        }
      }
    }

    // Step 3: save the customer message.
    const { data: customerMessage, error: customerInsertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender: "Customer",
        content: message,
      })
      .select("id, conversation_id, sender, content, sent_at")
      .single();
    if (customerInsertError) throw customerInsertError;

    // Step 4: generate the bot reply and detect NLP errors.
    const historyForBot = messages.map((m) => ({
      sender: m.sender,
      content: m.content,
    }));
    const botText = await generateBotReply(message, historyForBot);
    const previousBotTexts = messages
      .filter((m) => m.sender === "Bot")
      .map((m) => m.content);
    const detected = detectErrors({
      botText,
      customerText: message,
      previousBotTexts,
    });

    // Step 5: save the bot reply and its flags.
    const { data: botMessage, error: botInsertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender: "Bot",
        content: botText,
      })
      .select("id, conversation_id, sender, content, sent_at")
      .single();
    if (botInsertError) throw botInsertError;

    let flags: ErrorFlag[] = [];
    if (detected.length > 0) {
      const { data: insertedFlags, error: flagsError } = await supabase
        .from("error_flags")
        .insert(
          detected.map((error) => ({
            message_id: botMessage.id,
            error_type: error.type,
            confidence_score: error.confidence,
          })),
        )
        .select("id, message_id, error_type, confidence_score, detected_at");
      if (flagsError) throw flagsError;
      flags = insertedFlags ?? [];
    }

    const payload: ChatMessagePayload[] = [
      { ...(customerMessage as Message), flags: [], feedback: null },
      { ...(botMessage as Message), flags, feedback: null },
    ];

    return NextResponse.json({
      sessionCode,
      conversationId,
      messages: payload,
    });
  } catch (error) {
    console.error("POST /api/chat failed:", error);
    return NextResponse.json(
      { error: "The server could not process the message." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/chat?sessionCode=CHT-XXXX
 * Restore the active conversation after a page reload.
 */
export async function GET(request: Request) {
  const sessionCode = new URL(request.url).searchParams.get("sessionCode");
  if (!sessionCode) {
    return NextResponse.json({ error: "sessionCode is required." }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { data: customer } = await supabase
      .from("customers")
      .select("id, anon_code")
      .eq("anon_code", sessionCode)
      .maybeSingle();
    if (!customer) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("customer_id", customer.id)
      .eq("status", "Active")
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conversation) {
      return NextResponse.json({ sessionCode, messages: [] });
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender, content, sent_at, error_flags(id, message_id, error_type, confidence_score, detected_at), feedback(id, message_id, rating, comment, submitted_at)")
      .eq("conversation_id", conversation.id)
      .order("sent_at", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;

    const payload: ChatMessagePayload[] = (messages ?? []).map((row) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      sender: row.sender,
      content: row.content,
      sent_at: row.sent_at,
      flags: row.error_flags ?? [],
      feedback: Array.isArray(row.feedback)
        ? (row.feedback[0] ?? null)
        : (row.feedback ?? null),
    }));

    return NextResponse.json({ sessionCode, messages: payload });
  } catch (error) {
    console.error("GET /api/chat failed:", error);
    return NextResponse.json(
      { error: "The server could not load the conversation." },
      { status: 500 },
    );
  }
}
