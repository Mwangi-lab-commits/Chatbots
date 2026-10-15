import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/chat/close
 * Body: { sessionCode: string }
 * Close the active conversation of the session.
 */
export async function POST(request: Request) {
  let body: { sessionCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sessionCode = body.sessionCode?.trim();
  if (!sessionCode) {
    return NextResponse.json({ error: "sessionCode is required." }, { status: 400 });
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
      .eq("status", "Active")
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conversation) {
      return NextResponse.json({ error: "No active conversation." }, { status: 404 });
    }

    const { error } = await supabase
      .from("conversations")
      .update({ status: "Closed", end_time: new Date().toISOString() })
      .eq("id", conversation.id);
    if (error) throw error;

    return NextResponse.json({ closed: true });
  } catch (error) {
    console.error("POST /api/chat/close failed:", error);
    return NextResponse.json(
      { error: "The server could not close the session." },
      { status: 500 },
    );
  }
}
