import { dayKey } from "./format";
import { getSupabase } from "./supabase";
import type { ErrorType, Escalation, Feedback, Message } from "./types";

/** Maximum number of rows used in in-memory aggregations. */
const AGGREGATION_LIMIT = 10000;

/** Maximum number of rows shown in list screens. */
export const LIST_LIMIT = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export interface DashboardData {
  totals: {
    conversations: number;
    errorsFlagged: number;
    avgRating: number | null;
    openEscalations: number;
  };
  daily: { day: string; count: number }[];
  byType: { type: ErrorType; count: number }[];
  recentFlags: {
    id: string;
    type: ErrorType;
    confidence: number;
    detectedAt: string;
    content: string;
    conversationId: string;
  }[];
  recentEscalations: {
    id: string;
    ticketCode: string;
    status: string;
    createdAt: string;
    assignedToName: string | null;
  }[];
  recentFeedback: {
    id: string;
    rating: number;
    submittedAt: string;
    content: string;
  }[];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildDailySeries(
  timestamps: string[],
  days: number,
): { day: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const timestamp of timestamps) {
    const key = dayKey(timestamp);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const series: { day: string; count: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - i);
    const key = date.toISOString().slice(0, 10);
    series.push({ day: key, count: counts.get(key) ?? 0 });
  }
  return series;
}

/** All data for the admin dashboard (design screen 2.2.4). */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabase();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  since.setUTCHours(0, 0, 0, 0);

  const [
    conversationsCount,
    flagsCount,
    openEscalationsCount,
    ratingsResult,
    recentFlagsResult,
    dailyFlagsResult,
    typeFlagsResult,
    recentEscalationsResult,
    recentFeedbackResult,
  ] = await Promise.all([
    supabase.from("conversations").select("*", { count: "exact", head: true }),
    supabase.from("error_flags").select("*", { count: "exact", head: true }),
    supabase
      .from("escalations")
      .select("*", { count: "exact", head: true })
      .neq("status", "Resolved"),
    supabase.from("feedback").select("rating").limit(AGGREGATION_LIMIT),
    supabase
      .from("error_flags")
      .select("id, error_type, confidence_score, detected_at, message_id, messages!inner(content, conversation_id)")
      .order("detected_at", { ascending: false })
      .limit(5),
    supabase
      .from("error_flags")
      .select("detected_at")
      .gte("detected_at", since.toISOString())
      .limit(AGGREGATION_LIMIT),
    supabase.from("error_flags").select("error_type").limit(AGGREGATION_LIMIT),
    supabase
      .from("escalations")
      .select("id, ticket_code, status, created_at, assigned_to_name")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("feedback")
      .select("id, rating, submitted_at, message_id, messages!inner(content)")
      .order("submitted_at", { ascending: false })
      .limit(5),
  ]);

  const ratings = (ratingsResult.data ?? []).map((row) => row.rating as number);

  const daily = buildDailySeries(
    (dailyFlagsResult.data ?? []).map((row) => row.detected_at as string),
    30,
  );

  const typeCounts = new Map<ErrorType, number>();
  for (const row of typeFlagsResult.data ?? []) {
    const type = row.error_type as ErrorType;
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }
  const byType: { type: ErrorType; count: number }[] = [
    "Irrelevant",
    "Repetitive",
    "Misinterpreted",
  ].map((type) => ({ type: type as ErrorType, count: typeCounts.get(type as ErrorType) ?? 0 }));

  const recentFlags = (recentFlagsResult.data ?? []).map((row) => {
    const joined = row.messages as unknown as { content: string; conversation_id: string } | null;
    return {
      id: row.id as string,
      type: row.error_type as ErrorType,
      confidence: Number(row.confidence_score),
      detectedAt: row.detected_at as string,
      content: joined?.content ?? "",
      conversationId: joined?.conversation_id ?? "",
    };
  });

  const recentEscalations = (recentEscalationsResult.data ?? []).map((row) => ({
    id: row.id as string,
    ticketCode: row.ticket_code as string,
    status: row.status as string,
    createdAt: row.created_at as string,
    assignedToName: (row.assigned_to_name as string | null) ?? null,
  }));

  const recentFeedback = (recentFeedbackResult.data ?? []).map((row) => {
    const joined = row.messages as unknown as { content: string } | null;
    return {
      id: row.id as string,
      rating: row.rating as number,
      submittedAt: row.submitted_at as string,
      content: joined?.content ?? "",
    };
  });

  return {
    totals: {
      conversations: conversationsCount.count ?? 0,
      errorsFlagged: flagsCount.count ?? 0,
      avgRating: average(ratings),
      openEscalations: openEscalationsCount.count ?? 0,
    },
    daily,
    byType,
    recentFlags,
    recentEscalations,
    recentFeedback,
  };
}

export interface FlaggedRow {
  flagId: string;
  errorType: ErrorType;
  confidence: number;
  detectedAt: string;
  botMessageId: string;
  botContent: string;
  conversationId: string;
  customerContent: string | null;
}

/** Flagged chatbot replies for the error log screen (design screen 2.2.5). */
export async function getFlaggedRows(filters: {
  from?: string;
  to?: string;
  type?: string;
  q?: string;
}): Promise<FlaggedRow[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("error_flags")
    .select(
      "id, error_type, confidence_score, detected_at, message_id, messages!inner(id, content, conversation_id)",
    )
    .order("detected_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (filters.from) {
    query = query.gte("detected_at", `${filters.from}T00:00:00.000Z`);
  }
  if (filters.to) {
    query = query.lte("detected_at", `${filters.to}T23:59:59.999Z`);
  }
  if (filters.type && filters.type !== "All") {
    query = query.eq("error_type", filters.type);
  }
  if (filters.q) {
    query = query.ilike("messages.content", `%${filters.q}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => {
    const joined = row.messages as unknown as {
      id: string;
      content: string;
      conversation_id: string;
    } | null;
    return {
      flagId: row.id as string,
      errorType: row.error_type as ErrorType,
      confidence: Number(row.confidence_score),
      detectedAt: row.detected_at as string,
      botMessageId: joined?.id ?? "",
      botContent: joined?.content ?? "",
      conversationId: joined?.conversation_id ?? "",
    };
  });

  // Find the customer message that came before each flagged bot reply.
  const conversationIds = [...new Set(rows.map((row) => row.conversationId))].filter(
    (id) => id.length > 0,
  );
  const history: Message[] = [];
  for (const group of chunk(conversationIds, 50)) {
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender, content, sent_at")
      .in("conversation_id", group)
      .order("sent_at", { ascending: true });
    if (messagesError) throw new Error(messagesError.message);
    history.push(...((messages ?? []) as Message[]));
  }

  const byConversation = new Map<string, Message[]>();
  for (const message of history) {
    const list = byConversation.get(message.conversation_id) ?? [];
    list.push(message);
    byConversation.set(message.conversation_id, list);
  }

  return rows.map((row) => {
    const conversationMessages = byConversation.get(row.conversationId) ?? [];
    const index = conversationMessages.findIndex((m) => m.id === row.botMessageId);
    const precedingCustomer = conversationMessages
      .slice(0, Math.max(index, 0))
      .reverse()
      .find((m) => m.sender === "Customer");
    return { ...row, customerContent: precedingCustomer?.content ?? null };
  });
}

export interface ConversationDetail {
  conversation: {
    id: string;
    status: string;
    startTime: string;
    endTime: string | null;
    anonCode: string | null;
  };
  messages: (Message & {
    flags: { id: string; error_type: ErrorType; confidence_score: number }[];
    feedback: Feedback | null;
  })[];
  escalations: Escalation[];
}

/** Full exchange of one conversation (detail view from the error log). */
export async function getConversationDetail(
  conversationId: string,
): Promise<ConversationDetail | null> {
  const supabase = getSupabase();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, status, start_time, end_time, customers(anon_code)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender, content, sent_at, error_flags(id, message_id, error_type, confidence_score, detected_at), feedback(id, message_id, rating, comment, submitted_at)",
    )
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: true })
    .order("id", { ascending: true });
  if (messagesError) throw new Error(messagesError.message);

  const { data: escalations } = await supabase
    .from("escalations")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  const customer = conversation.customers as unknown as { anon_code: string } | null;

  return {
    conversation: {
      id: conversation.id,
      status: conversation.status,
      startTime: conversation.start_time,
      endTime: conversation.end_time,
      anonCode: customer?.anon_code ?? null,
    },
    messages: (messages ?? []).map((row) => ({
      ...(row as unknown as Message),
      flags: (row.error_flags ?? []) as ConversationDetail["messages"][number]["flags"],
      feedback: (Array.isArray(row.feedback)
        ? (row.feedback[0] ?? null)
        : null) as Feedback | null,
    })),
    escalations: (escalations ?? []) as Escalation[],
  };
}

export interface FeedbackData {
  stats: {
    total: number;
    avgRating: number | null;
    helpfulShare: number | null;
    unhelpfulShare: number | null;
    avgFlaggedRating: number | null;
    distribution: { rating: number; count: number }[];
  };
  rows: {
    id: string;
    messageId: string;
    rating: number;
    comment: string | null;
    submittedAt: string;
    messageContent: string;
  }[];
}

/** Feedback and satisfaction data (design screen 2.2.6). */
export async function getFeedbackData(): Promise<FeedbackData> {
  const supabase = getSupabase();

  const [feedbackResult, flaggedResult] = await Promise.all([
    supabase
      .from("feedback")
      .select("id, message_id, rating, comment, submitted_at, messages!inner(content)")
      .order("submitted_at", { ascending: false })
      .limit(AGGREGATION_LIMIT),
    supabase.from("error_flags").select("message_id").limit(AGGREGATION_LIMIT),
  ]);

  const flaggedMessageIds = new Set(
    (flaggedResult.data ?? []).map((row) => row.message_id as string),
  );

  const rows = (feedbackResult.data ?? []).map((row) => {
    const joined = row.messages as unknown as { content: string } | null;
    return {
      id: row.id as string,
      messageId: row.message_id as string,
      rating: row.rating as number,
      comment: (row.comment as string | null) ?? null,
      submittedAt: row.submitted_at as string,
      messageContent: joined?.content ?? "",
    };
  });

  const ratings = rows.map((row) => row.rating);
  const helpful = ratings.filter((rating) => rating >= 4).length;
  const unhelpful = ratings.filter((rating) => rating <= 2).length;
  const flaggedRatings = rows
    .filter((row) => flaggedMessageIds.has(row.messageId))
    .map((row) => row.rating);

  const distribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: ratings.filter((value) => value === rating).length,
  }));

  return {
    stats: {
      total: ratings.length,
      avgRating: average(ratings),
      helpfulShare: ratings.length > 0 ? helpful / ratings.length : null,
      unhelpfulShare: ratings.length > 0 ? unhelpful / ratings.length : null,
      avgFlaggedRating: average(flaggedRatings),
      distribution,
    },
    rows,
  };
}

export interface EscalationRow extends Escalation {
  anonCode: string | null;
}

/** Escalation tickets for the complaints screen (design screen 2.2.7). */
export async function getEscalationRows(statusFilter?: string): Promise<EscalationRow[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("escalations")
    .select("*, conversations(customers(anon_code))")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (statusFilter && statusFilter !== "All") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const conversation = row.conversations as unknown as {
      customers: { anon_code: string } | null;
    } | null;
    return {
      ...(row as unknown as Escalation),
      anonCode: conversation?.customers?.anon_code ?? null,
    };
  });
}
