import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { getConversationDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

const TYPE_BADGES: Record<string, string> = {
  Irrelevant: "bg-amber-100 text-amber-800",
  Repetitive: "bg-indigo-100 text-indigo-800",
  Misinterpreted: "bg-red-100 text-red-800",
};

const STATUS_BADGES: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-emerald-100 text-emerald-800",
};

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getConversationDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Conversation review
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Session{" "}
            <span className="font-mono text-slate-700">
              {detail.conversation.anonCode ?? "-"}
            </span>{" "}
            &middot; {detail.conversation.status} &middot; started{" "}
            {formatDateTime(detail.conversation.startTime)}
            {detail.conversation.endTime
              ? `, ended ${formatDateTime(detail.conversation.endTime)}`
              : ""}
          </p>
        </div>
        <Link
          href="/admin/flagged"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Back to flagged list
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          {detail.messages.map((message) =>
            message.sender === "Customer" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2.5 text-sm text-white">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="mt-1 text-right text-[11px] text-indigo-200">
                    {formatDateTime(message.sent_at)}
                  </p>
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-[70%] space-y-1.5">
                  <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatDateTime(message.sent_at)}
                    </p>
                  </div>
                  {message.flags.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-1">
                      {message.flags.map((flag) => (
                        <span
                          key={flag.id}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TYPE_BADGES[flag.error_type] ?? "bg-slate-100 text-slate-700"}`}
                        >
                          {flag.error_type} &middot;{" "}
                          {(flag.confidence_score * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  )}
                  {message.feedback && (
                    <p className="px-1 text-xs text-slate-500">
                      Customer rating:{" "}
                      <span className="text-amber-500">
                        {"★".repeat(message.feedback.rating)}
                        {"☆".repeat(5 - message.feedback.rating)}
                      </span>
                      {message.feedback.comment
                        ? ` — ${message.feedback.comment}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
            ),
          )}
          {detail.messages.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              This conversation has no messages.
            </p>
          )}
        </div>
      </div>

      {detail.escalations.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            Escalation tickets for this conversation
          </h2>
          <ul className="mt-3 space-y-2">
            {detail.escalations.map((escalation) => (
              <li
                key={escalation.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-mono text-slate-700">
                  {escalation.ticket_code}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGES[escalation.status] ?? "bg-slate-100 text-slate-700"}`}
                >
                  {escalation.status}
                </span>
                <span className="text-slate-500">{escalation.reason}</span>
                <span className="text-slate-400">
                  {escalation.assigned_to_name ?? "Not assigned"}
                </span>
                <Link
                  href="/admin/complaints"
                  className="ml-auto font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
