"use client";

import { useState } from "react";
import { generateReport } from "@/app/admin/reports/actions";
import { SimpleBarChart } from "@/components/admin/Charts";
import { toCsv } from "@/lib/format";
import type { ReportData } from "@/lib/reports";

const REPORT_TYPES = [
  "NLP error summary",
  "Customer satisfaction",
  "Escalation report",
  "Chatbot performance",
];

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultDates(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: isoDate(from), to: isoDate(to) };
}

function downloadCsv(data: ReportData) {
  const csv = toCsv(data.table.header, data.table.rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.type.replace(/\s+/g, "-").toLowerCase()}-${data.from}-to-${data.to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPanel({ staffName }: { staffName: string }) {
  const [from, setFrom] = useState(() => defaultDates().from);
  const [to, setTo] = useState(() => defaultDates().to);
  const [type, setType] = useState(REPORT_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportData | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("from", from);
      formData.set("to", to);
      const response = await generateReport(formData);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(response.data);
    } catch {
      setError("The report could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div>
          <label htmlFor="report-type" className="block text-xs font-medium text-slate-500">
            Report type
          </label>
          <select
            id="report-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            {REPORT_TYPES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="report-from" className="block text-xs font-medium text-slate-500">
            From
          </label>
          <input
            type="date"
            id="report-from"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="report-to" className="block text-xs font-medium text-slate-500">
            To
          </label>
          <input
            type="date"
            id="report-to"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Generating..." : "Generate report"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 print:hidden">
            <button
              type="button"
              onClick={() => downloadCsv(result)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Print / Save as PDF
            </button>
          </div>

          <div
            id="report-print"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-900">{result.type}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Period: {result.from} to {result.to} &middot; Generated by{" "}
              {staffName} on{" "}
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date())}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {result.summaries.map((summary) => (
                <div
                  key={summary.label}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-medium text-slate-500">
                    {summary.label}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {summary.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <SimpleBarChart data={result.chart} height={240} />
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {result.table.header.map((header) => (
                      <th
                        key={header}
                        className="px-3 py-2 text-left font-semibold text-slate-600"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.table.rows.slice(0, 50).map((row, index) => (
                    <tr key={index}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 text-slate-700">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.table.rows.length > 50 && (
                <p className="mt-2 text-xs text-slate-400">
                  Showing the first 50 of {result.table.rows.length} rows.
                  Download the CSV for the full list.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
