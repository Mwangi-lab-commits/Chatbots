import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const MAX_COMMENT_LENGTH = 255;

/**
 * POST /api/feedback
 * Body: { messageId: string, rating: number, comment?: string }
 *
 * Save or update the rating of one chatbot message. The feedback table has a
 * unique constraint on message_id, so an upsert replaces an earlier rating.
 */
export async function POST(request: Request) {
  let body: { messageId?: string; rating?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messageId = body.messageId?.trim();
  const rating = Number(body.rating);
  const comment = (body.comment ?? "").trim();

  if (!messageId) {
    return NextResponse.json({ error: "messageId is required." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "The rating must be a whole number from 1 to 5." },
      { status: 400 },
    );
  }
  if (comment.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `The comment must be at most ${MAX_COMMENT_LENGTH} characters.` },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabase();

    // Only chatbot messages can be rated.
    const { data: message } = await supabase
      .from("messages")
      .select("id, sender")
      .eq("id", messageId)
      .maybeSingle();
    if (!message || message.sender !== "Bot") {
      return NextResponse.json(
        { error: "The message does not exist or is not a chatbot message." },
        { status: 404 },
      );
    }

    const { data: feedback, error } = await supabase
      .from("feedback")
      .upsert(
        {
          message_id: messageId,
          rating,
          comment: comment.length > 0 ? comment : null,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "message_id" },
      )
      .select("id, message_id, rating, comment, submitted_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("POST /api/feedback failed:", error);
    return NextResponse.json(
      { error: "The server could not save the feedback." },
      { status: 500 },
    );
  }
}
