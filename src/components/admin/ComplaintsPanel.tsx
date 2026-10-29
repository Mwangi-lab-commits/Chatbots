"use client";

import { useState } from "react";
import { updateEscalation } from "@/app/admin/complaints/actions";
import type { StaffUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import type { EscalationRow } from "@/lib/queries";

const STATUS_BADGES: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-emerald-100 text-emerald-800",
};

export default function ComplaintsPanel({
  rows,
  staff,
}: {
  rows: EscalationRow[];
  staff: StaffUser[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    rows[0]?.id ?? null,
  );
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
        No escalation tickets found for this filter.
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Ticket
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Reason
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Assigned to
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">
                Created
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`cursor-pointer hover:bg-slate-50 ${
                  row.id === selectedId ? "bg-indigo-50/60" : ""
                }`}
                onClick={() => setSelectedId(row.id)}
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">
                  {row.ticket_code}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.reason}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[row.status] ?? "bg-slate-100 text-slate-700"}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {row.assigned_to_name ?? "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  {formatDateTime(row.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(row.id);
                    }}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-sm font-semibold text-slate-800">
              {selected.ticket_code}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[selected.status] ?? "bg-slate-100 text-slate-700"}`}
            >
              {selected.status}
            </span>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Session</dt>
              <dd className="font-mono text-slate-700">
                {selected.anonCode ?? "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Reason</dt>
              <dd className="text-right text-slate-700">{selected.reason}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-700">
                {formatDateTime(selected.created_at)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Resolved</dt>
              <dd className="text-slate-700">
                {formatDateTime(selected.resolved_at)}
              </dd>
            </div>
          </dl>

          {selected.description && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p className="text-xs font-medium text-slate-500">
                Customer message
              </p>
              <p className="mt-1">{selected.description}</p>
            </div>
          )}

          <form
            key={selected.id}
            action={updateEscalation}
            className="mt-5 space-y-4"
          >
            <input
              type="hidden"
              name="escalation_id"
              value={selected.id}
            />
            <div>
              <label
                htmlFor="assigned_to_id"
                className="block text-sm font-medium text-slate-700"
              >
                Assign agent
              </label>
              <select
                id="assigned_to_id"
                name="assigned_to_id"
                defaultValue={selected.assigned_to_id ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Not assigned</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
              {staff.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No staff members found in Clerk.
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-slate-700"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={selected.status}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Resolved</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="resolution_note"
                className="block text-sm font-medium text-slate-700"
              >
                Feedback to customer
              </label>
              <textarea
                id="resolution_note"
                name="resolution_note"
                rows={3}
                defaultValue={selected.resolution_note ?? ""}
                placeholder="Explain the resolution or reply to the customer."
                className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <a
                href={`/admin/flagged/${selected.conversation_id}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                View conversation
              </a>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Save ticket
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
