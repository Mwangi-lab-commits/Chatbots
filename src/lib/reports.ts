import { dayKey, formatDate } from "./format";
import { getSupabase } from "./supabase";
import type { ErrorType, ReportType } from "./types";

/** Maximum number of rows used to build one report. */
const REPORT_LIMIT = 10000;

export interface ReportData {
  type: ReportType;
  from: string;
  to: string;
  summaries: { label: string; value: string }[];
  chart: { label: string; count: number }[];
  table: { header: string[]; rows: (string | number)[][] };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fixed(value: number | null, digits = 1): string {
  return value === null ? "-" : value.toFixed(digits);
}

function percent(part: number, total: number): string {
  if (total === 0) return "-";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function excerpt(text: string, length = 80): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length)}...` : clean;
}

function rangeStart(from: string): string {
  return `${from}T00:00:00.000Z`;
}

function rangeEnd(to: string): string {
  return `${to}T23:59:59.999Z`;
}

/**
 * Build the data of one report (design screen 2.2.8).
 * Every report has summary metrics, a chart series and a table.
 */
export async function buildReportData(
  type: ReportType,
  from: string,
  to: string,
): Promise<ReportData> {
  const supabase = getSupabase();
  const start = rangeStart(from);
  const end = rangeEnd(to);

  if (type === "NLP error summary") {
    const { data, error } = await supabase
      .from("error_flags")
      .select("id, error_type, confidence_score, detected_at, messages!inner(content)")
      .gte("detected_at", start)
      .lte("detected_at", end)
      .order("detected_at", { ascending: false })
      .limit(REPORT_LIMIT);
    if (error) throw new Error(error.message);

    const flags = (data ?? []).map((row) => {
      const joined = row.messages as unknown as { content: string } | null;
      return {
        type: row.error_type as ErrorType,
        confidence: Number(row.confidence_score),
        detectedAt: row.detected_at as string,
        content: joined?.content ?? "",
      };
    });

    const typeCounts: { label: ErrorType; count: number }[] = (
      ["Irrelevant", "Repetitive", "Misinterpreted"] as ErrorType[]
    ).map((label) => ({
      label,
      count: flags.filter((flag) => flag.type === label).length,
    }));
    const mostCommon = [...typeCounts].sort((a, b) => b.count - a.count)[0];

    return {
      type,
      from,
      to,
      summaries: [
        { label: "Total flags", value: String(flags.length) },
        ...typeCounts.map((entry) => ({
          label: `${entry.label} flags`,
          value: String(entry.count),
        })),
        {
          label: "Average confidence",
          value: fixed(average(flags.map((flag) => flag.confidence)), 2),
        },
        {
          label: "Most common error",
          value: mostCommon && mostCommon.count > 0 ? mostCommon.label : "-",
        },
      ],
      chart: typeCounts,
      table: {
        header: ["Detected", "Error type", "Confidence", "Chatbot response"],
        rows: flags.map((flag) => [
          formatDate(flag.detectedAt),
          flag.type,
          flag.confidence.toFixed(2),
          excerpt(flag.content),
        ]),
      },
    };
  }

  if (type === "Customer satisfaction") {
    const { data, error } = await supabase
      .from("feedback")
      .select("id, rating, comment, submitted_at, messages!inner(content)")
      .gte("submitted_at", start)
      .lte("submitted_at", end)
      .order("submitted_at", { ascending: false })
      .limit(REPORT_LIMIT);
    if (error) throw new Error(error.message);

    const entries = (data ?? []).map((row) => {
      const joined = row.messages as unknown as { content: string } | null;
      return {
        rating: row.rating as number,
        comment: (row.comment as string | null) ?? "",
        submittedAt: row.submitted_at as string,
        content: joined?.content ?? "",
      };
    });

    const ratings = entries.map((entry) => entry.rating);
    const helpful = ratings.filter((rating) => rating >= 4).length;
    const unhelpful = ratings.filter((rating) => rating <= 2).length;

    return {
      type,
      from,
      to,
      summaries: [
        { label: "Responses rated", value: String(ratings.length) },
        { label: "Average rating", value: fixed(average(ratings), 2) },
        { label: "Marked helpful (4-5)", value: percent(helpful, ratings.length) },
        { label: "Marked not helpful (1-2)", value: percent(unhelpful, ratings.length) },
      ],
      chart: [1, 2, 3, 4, 5].map((rating) => ({
        label: `${rating} star`,
        count: ratings.filter((value) => value === rating).length,
      })),
      table: {
        header: ["Submitted", "Rating", "Comment", "Chatbot response"],
        rows: entries.map((entry) => [
          formatDate(entry.submittedAt),
          entry.rating,
          entry.comment,
          excerpt(entry.content),
        ]),
      },
    };
  }

  if (type === "Escalation report") {
    const { data, error } = await supabase
      .from("escalations")
      .select("ticket_code, reason, status, assigned_to_name, created_at, resolved_at")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false })
      .limit(REPORT_LIMIT);
    if (error) throw new Error(error.message);

    const tickets = data ?? [];
    const open = tickets.filter((ticket) => ticket.status !== "Resolved").length;
    const resolved = tickets.filter((ticket) => ticket.status === "Resolved");
    const resolutionHours = resolved
      .filter((ticket) => ticket.resolved_at)
      .map(
        (ticket) =>
          (new Date(ticket.resolved_at as string).getTime() -
            new Date(ticket.created_at as string).getTime()) /
          (1000 * 60 * 60),
      );

    return {
      type,
      from,
      to,
      summaries: [
        { label: "Total tickets", value: String(tickets.length) },
        { label: "Open tickets", value: String(open) },
        { label: "Resolved tickets", value: String(resolved.length) },
        {
          label: "Average resolution time",
          value:
            resolutionHours.length > 0
              ? `${fixed(average(resolutionHours), 1)} hours`
              : "-",
        },
      ],
      chart: ["Pending", "In Progress", "Resolved"].map((status) => ({
        label: status,
        count: tickets.filter((ticket) => ticket.status === status).length,
      })),
      table: {
        header: ["Ticket", "Reason", "Status", "Assigned to", "Created", "Resolved"],
        rows: tickets.map((ticket) => [
          ticket.ticket_code as string,
          ticket.reason as string,
          ticket.status as string,
          (ticket.assigned_to_name as string | null) ?? "Not assigned",
          formatDate(ticket.created_at as string),
          ticket.resolved_at ? formatDate(ticket.resolved_at as string) : "-",
        ]),
      },
    };
  }

  // Chatbot performance
  const [botReplies, customerMessages, flags, conversations, feedback] =
    await Promise.all([
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender", "Bot")
        .gte("sent_at", start)
        .lte("sent_at", end),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender", "Customer")
        .gte("sent_at", start)
        .lte("sent_at", end),
      supabase
        .from("error_flags")
        .select("detected_at")
        .gte("detected_at", start)
        .lte("detected_at", end)
        .limit(REPORT_LIMIT),
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .gte("start_time", start)
        .lte("start_time", end),
      supabase
        .from("feedback")
        .select("rating")
        .gte("submitted_at", start)
        .lte("submitted_at", end)
        .limit(REPORT_LIMIT),
    ]);

  const flagTimestamps = (flags.data ?? []).map((row) => row.detected_at as string);
  const dailyCounts = new Map<string, number>();
  for (const timestamp of flagTimestamps) {
    const key = dayKey(timestamp);
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  }

  const days: { label: string; count: number }[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const last = new Date(`${to}T00:00:00.000Z`);
  let guard = 0;
  while (cursor <= last && guard < 366) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({ label: key, count: dailyCounts.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }

  const ratings = (feedback.data ?? []).map((row) => row.rating as number);
  const botCount = botReplies.count ?? 0;
  const flagCount = flagTimestamps.length;

  return {
    type,
    from,
    to,
    summaries: [
      { label: "Conversations started", value: String(conversations.count ?? 0) },
      { label: "Customer messages", value: String(customerMessages.count ?? 0) },
      { label: "Chatbot replies", value: String(botCount) },
      { label: "NLP errors flagged", value: String(flagCount) },
      { label: "Flag rate", value: percent(flagCount, botCount) },
      { label: "Average rating", value: fixed(average(ratings), 2) },
    ],
    chart: days,
    table: {
      header: ["Day", "Flags"],
      rows: days.map((day) => [day.label, day.count]),
    },
  };
}

/** Save one generated report in the reports table. */
export async function saveReport(input: {
  generatedById: string;
  generatedByName: string;
  type: ReportType;
  from: string;
  to: string;
}): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("reports").insert({
    generated_by_id: input.generatedById,
    generated_by_name: input.generatedByName,
    report_type: input.type,
    date_from: input.from,
    date_to: input.to,
  });
  if (error) throw new Error(error.message);
}

/** The latest generated reports, for the reports screen. */
export async function getRecentReports(limit = 10) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select("id, generated_by_name, report_type, date_from, date_to, generated_at")
    .order("generated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
