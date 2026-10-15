import Link from "next/link";
import { SimpleBarChart } from "@/components/admin/Charts";
import { formatDateTime } from "@/lib/format";
import { getFeedbackData } from "@/lib/queries";

export const dynamic = "force-dynamic";

function StatCard(props: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{props.label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{props.value}</p>
      {props.hint && <p className="mt-1 text-xs text-slate-400">{props.hint}</p>}
    </div>
  );
}

export default async function FeedbackPage() {
  const data = await getFeedbackData();
  const { stats } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Customer feedback and satisfaction
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ratings submitted by customers after each chatbot reply.
          </p>
        </div>
        <Link
          href="/api/admin/feedback/export"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Export CSV
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Average rating"
          value={stats.avgRating === null ? "-" : `${stats.avgRating.toFixed(2)} / 5`}
          hint={`${stats.total} ratings submitted`}
        />
        <StatCard
          label="Marked helpful"
          value={stats.helpfulShare === null ? "-" : `${(stats.helpfulShare * 100).toFixed(0)}%`}
          hint="Ratings of 4 or 5"
        />
        <StatCard
          label="Marked not helpful"
          value={stats.unhelpfulShare === null ? "-" : `${(stats.unhelpfulShare * 100).toFixed(0)}%`}
          hint="Ratings of 1 or 2"
        />
        <StatCard
          label="Avg rating of flagged replies"
          value={
            stats.avgFlaggedRating === null
              ? "-"
              : `${stats.avgFlaggedRating.toFixed(2)} / 5`
          }
          hint="Replies with at least one NLP error flag"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">
          Rating distribution
        </h2>
        <div className="mt-4 max-w-xl">
          <SimpleBarChart
            data={stats.distribution.map((entry) => ({
              label: `${entry.rating} star`,
              count: entry.count,
            }))}
            color="#f59e0b"
            height={220}
          />
        </div>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Submitted
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Rating
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Chatbot response
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Comment
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No feedback has been submitted yet.
                </td>
              </tr>
            )}
            {data.rows.slice(0, 200).map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatDateTime(row.submittedAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="text-amber-500">
                    {"★".repeat(row.rating)}
                    {"☆".repeat(5 - row.rating)}
                  </span>
                </td>
                <td className="max-w-md px-4 py-3 text-slate-700">
                  {row.messageContent}
                </td>
                <td className="max-w-xs px-4 py-3 text-slate-500">
                  {row.comment ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.rows.length > 200 && (
        <p className="text-xs text-slate-400">
          Showing the latest 200 of {data.rows.length} feedback entries. Export
          CSV to get the full list.
        </p>
      )}
    </div>
  );
}
