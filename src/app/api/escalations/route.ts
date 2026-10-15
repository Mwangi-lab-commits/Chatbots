import { NextResponse } from "next/server";
import { newTicketCode } from "@/lib/codes";
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
 * Body: { sessionCode: string, reason: string, description: string }
 * Create an escalation ticket for the active conversation.
 */
export async function POST(request: Request) {
  let body: { sessionCode?: string; reason?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sessionCode = body.sessionCode?.trim();
  const reason = body.reason as EscalationReason | undefined;
  const description = (body.description ?? "").trim();

  if (!sessionCode) {
    return NextResponse.json({ error: "sessionCode is required." }, { status: 400 });
  }
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
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("anon_code", sessionCode)
      .maybeSingle();
    if (!customer) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("customer_id", customer.id)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conversation) {
      return NextResponse.json(
        { error: "The session has no conversation to escalate." },
        { status: 404 },
      );
    }

    const { data: escalation, error } = await supabase
      .from("escalations")
      .insert({
        ticket_code: newTicketCode(),
        conversation_id: conversation.id,
        reason,
        description,
      })
      .select("id, ticket_code, status, created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ escalation });
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
