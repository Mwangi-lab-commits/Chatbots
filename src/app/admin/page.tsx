import Link from "next/link";
import { ErrorsLineChart, SimpleBarChart } from "@/components/admin/Charts";
import { formatDateTime } from "@/lib/format";
import { getDashboardData } from "@/lib/queries";

export const dynamic = "force-dynamic";

const ERROR_TYPE_COLORS: Record<string, string> = {
  Irrelevant: "#f59e0b",
  Repetitive: "#6366f1",
  Misinterpreted: "#ef4444",
};

function StatCard(props: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{props.label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{props.value}</p>
      {props.hint && <p className="mt-1 text-xs text-slate-400">{props.hint}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total conversations"
          value={String(data.totals.conversations)}
        />
        <StatCard
          label="NLP errors flagged"
          value={String(data.totals.errorsFlagged)}
        />
        <StatCard
          label="Average satisfaction"
          value={
            data.totals.avgRating === null
              ? "-"
              : `${data.totals.avgRating.toFixed(1)} / 5`
          }
          hint="From customer star ratings"
        />
        <StatCard
          label="Open escalations"
          value={String(data.totals.openEscalations)}
          hint="Pending or in progress"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            NLP errors over the last 30 days
          </h2>
          <div className="mt-4">
            <ErrorsLineChart data={data.daily} />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            Errors by type
          </h2>
          <div className="mt-4">
            <SimpleBarChart data={data.byType.map((entry) => ({ label: entry.type, count: entry.count }))} color="#6366f1" />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Recent activity</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Latest flags
            </h3>
            <ul className="mt-2 space-y-2">
              {data.recentFlags.length === 0 && (
                <li className="text-sm text-slate-400">No flags yet.</li>
              )}
              {data.recentFlags.map((flag) => (
                <li key={flag.id} className="text-sm">
                  <Link
                    href={`/admin/flagged/${flag.conversationId}`}
                    className="block rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:border-indigo-200"
                  >
                    <span
                      className="mr-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: ERROR_TYPE_COLORS[flag.type] ?? "#6366f1" }}
                    >
                      {flag.type}
                    </span>
                    <span className="text-slate-700">
                      {flag.content.slice(0, 60)}
                      {flag.content.length > 60 ? "..." : ""}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {formatDateTime(flag.detectedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Latest tickets
            </h3>
            <ul className="mt-2 space-y-2">
              {data.recentEscalations.length === 0 && (
                <li className="text-sm text-slate-400">No tickets yet.</li>
              )}
              {data.recentEscalations.map((escalation) => (
                <li key={escalation.id} className="text-sm">
                  <Link
                    href="/admin/complaints"
                    className="block rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:border-indigo-200"
                  >
                    <span className="font-mono text-xs text-slate-600">
                      {escalation.ticketCode}
                    </span>
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {escalation.status}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {escalation.assignedToName ?? "Not assigned"} &middot;{" "}
                      {formatDateTime(escalation.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Latest ratings
            </h3>
            <ul className="mt-2 space-y-2">
              {data.recentFeedback.length === 0 && (
                <li className="text-sm text-slate-400">No ratings yet.</li>
              )}
              {data.recentFeedback.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="text-amber-500">
                      {"★".repeat(entry.rating)}
                      {"☆".repeat(5 - entry.rating)}
                    </span>
                    <span className="mt-1 block text-slate-700">
                      {entry.content.slice(0, 60)}
                      {entry.content.length > 60 ? "..." : ""}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {formatDateTime(entry.submittedAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
