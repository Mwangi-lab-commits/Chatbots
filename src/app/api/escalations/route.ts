import { NextResponse } from "next/server";
import { newSessionCode, newTicketCode } from "@/lib/codes";
import { getSupabase } from "@/lib/supabase";
import type { EscalationReason } from "@/lib/types";

const REASONS: EscalationReason[] = [
  "Irrelevant response",
  "Repeated answers",
  "Misunderstood question",
  "Other",
];

const MAX_DESCRIPTION_LENGTH = 1000;

/**
 * POST /api/escalations
 * Body: { sessionCode?: string, reason: string, description: string }
 * Create an escalation ticket and the chat session if it does not exist yet.
 * This lets a customer ask for a human agent before the first chatbot reply.
 */
export async function POST(request: Request) {
  let body: { sessionCode?: string; reason?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const requestedSessionCode = body.sessionCode?.trim();
  const reason = body.reason as EscalationReason | undefined;
  const description = (body.description ?? "").trim();

  if (!reason || !REASONS.includes(reason)) {
    return NextResponse.json(
      { error: `The reason must be one of: ${REASONS.join(", ")}.` },
      { status: 400 },
    );
  }
  if (description.length === 0 || description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `The description must be 1 to ${MAX_DESCRIPTION_LENGTH} characters.` },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabase();
    let customerId: string;
    let sessionCode = requestedSessionCode;

    if (sessionCode) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("anon_code", sessionCode)
        .maybeSingle();
      if (!customer) {
        return NextResponse.json({ error: "Session not found." }, { status: 404 });
      }
      customerId = customer.id;
    } else {
      sessionCode = newSessionCode();
      const { data: customer, error } = await supabase
        .from("customers")
        .insert({ anon_code: sessionCode })
        .select("id")
        .single();
      if (error) throw error;
      customerId = customer.id;
    }

    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("customer_id", customerId)
      .eq("status", "Active")
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId = existingConversation?.id;
    if (!conversationId) {
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({ customer_id: customerId })
        .select("id")
        .single();
      if (error) throw error;
      conversationId = conversation.id;
    }

    const { data: escalation, error } = await supabase
      .from("escalations")
      .insert({
        ticket_code: newTicketCode(),
        conversation_id: conversationId,
        reason,
        description,
      })
      .select("id, ticket_code, status, created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ escalation, sessionCode });
  } catch (error) {
    console.error("POST /api/escalations failed:", error);
    return NextResponse.json(
      { error: "The server could not create the ticket." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/escalations?ticket=TKT-XXXX
 * Public ticket status lookup. Returns safe fields only.
 */
export async function GET(request: Request) {
  const ticket = new URL(request.url).searchParams.get("ticket")?.trim();
  if (!ticket) {
    return NextResponse.json({ error: "ticket is required." }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { data: escalation } = await supabase
      .from("escalations")
      .select("ticket_code, reason, status, assigned_to_name, created_at, resolved_at")
      .eq("ticket_code", ticket.toUpperCase())
      .maybeSingle();
    if (!escalation) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    return NextResponse.json({ escalation });
  } catch (error) {
    console.error("GET /api/escalations failed:", error);
    return NextResponse.json(
      { error: "The server could not load the ticket." },
      { status: 500 },
    );
  }
}
