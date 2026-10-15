"use client";

import Link from "next/link";
import { useState } from "react";
import type { EscalationStatus } from "@/lib/types";

interface TicketStatus {
  ticket_code: string;
  reason: string;
  status: EscalationStatus;
  assigned_to_name: string | null;
  created_at: string;
  resolved_at: string | null;
}

const STATUS_STYLES: Record<EscalationStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-emerald-100 text-emerald-800",
};

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function StatusChecker() {
  const [ticket, setTicket] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TicketStatus | null>(null);

  async function checkTicket() {
    const code = ticket.trim();
    if (code.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(
        `/api/escalations?ticket=${encodeURIComponent(code)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The ticket could not be found.");
        return;
      }
      setResult(data.escalation);
    } catch {
      setError("The ticket could not be found. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Check ticket status
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter the ticket number you received after submitting an escalation
          request.
        </p>
      </div>

      <div className="mt-8 flex gap-3">
        <input
          type="text"
          value={ticket}
          onChange={(event) => setTicket(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void checkTicket();
          }}
          placeholder="TKT-XXXXXXXX"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 font-mono text-sm uppercase focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void checkTicket()}
          disabled={busy || ticket.trim().length === 0}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Checking..." : "Check status"}
        </button>
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-mono text-sm text-slate-800">
              {result.ticket_code}
            </p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[result.status]}`}
            >
              {result.status}
            </span>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Reason</dt>
              <dd className="text-right font-medium text-slate-800">
                {result.reason}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Handled by</dt>
              <dd className="text-right font-medium text-slate-800">
                {result.assigned_to_name ?? "Not assigned yet"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Submitted</dt>
              <dd className="text-right font-medium text-slate-800">
                {formatDateTime(result.created_at)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Resolved</dt>
              <dd className="text-right font-medium text-slate-800">
                {formatDateTime(result.resolved_at)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <p className="mt-10 text-center text-sm text-slate-500">
        <Link href="/chat" className="text-indigo-600 hover:text-indigo-500">
          Return to the chat
        </Link>
      </p>
    </main>
  );
}
