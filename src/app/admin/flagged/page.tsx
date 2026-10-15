import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { getFlaggedRows } from "@/lib/queries";

export const dynamic = "force-dynamic";

const TYPE_BADGES: Record<string, string> = {
  Irrelevant: "bg-amber-100 text-amber-800",
  Repetitive: "bg-indigo-100 text-indigo-800",
  Misinterpreted: "bg-red-100 text-red-800",
};

export default async function FlaggedPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    type?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const rows = await getFlaggedRows({
    from: params.from,
    to: params.to,
    type: params.type,
    q: params.q,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Flagged conversations
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Chatbot replies that the error detector flagged as irrelevant,
          repetitive or misinterpreted. Showing up to 200 flags.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div>
          <label htmlFor="from" className="block text-xs font-medium text-slate-500">
            From
          </label>
          <input
            type="date"
            id="from"
            name="from"
            defaultValue={params.from ?? ""}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs font-medium text-slate-500">
            To
          </label>
          <input
            type="date"
            id="to"
            name="to"
            defaultValue={params.to ?? ""}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-xs font-medium text-slate-500">
            Error type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={params.type ?? "All"}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option>All</option>
            <option>Irrelevant</option>
            <option>Repetitive</option>
            <option>Misinterpreted</option>
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="block text-xs font-medium text-slate-500">
            Search chatbot replies
          </label>
          <input
            type="text"
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search text..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Apply filters
        </button>
        <Link
          href="/admin/flagged"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Reset
        </Link>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Date
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Customer message
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Chatbot response
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Error type
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Confidence
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No flags found for these filters.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.flagId} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatDateTime(row.detectedAt)}
                </td>
                <td className="max-w-xs px-4 py-3 text-slate-700">
                  {row.customerContent ?? "-"}
                </td>
                <td className="max-w-xs px-4 py-3 text-slate-700">
                  {row.botContent}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_BADGES[row.errorType] ?? "bg-slate-100 text-slate-700"}`}
                  >
                    {row.errorType}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {(row.confidence * 100).toFixed(0)}%
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link
                    href={`/admin/flagged/${row.conversationId}`}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    View conversation
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
