"use server";

import { revalidatePath } from "next/cache";
import { requireStaffUser } from "@/lib/auth";
import { buildReportData, saveReport, type ReportData } from "@/lib/reports";
import type { ReportType } from "@/lib/types";

const REPORT_TYPES: ReportType[] = [
  "NLP error summary",
  "Customer satisfaction",
  "Escalation report",
  "Chatbot performance",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

export type GenerateReportResult =
  | { ok: true; data: ReportData }
  | { ok: false; error: string };

/**
 * Generate one report, save it in the reports table and return the data
 * for the preview. Called from the reports screen (design screen 2.2.8).
 */
export async function generateReport(
  formData: FormData,
): Promise<GenerateReportResult> {
  try {
    const staff = await requireStaffUser();

    const type = String(formData.get("type") ?? "") as ReportType;
    const from = String(formData.get("from") ?? "");
    const to = String(formData.get("to") ?? "");

    if (!REPORT_TYPES.includes(type)) {
      return { ok: false, error: "Select a valid report type." };
    }
    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
      return { ok: false, error: "Select a valid date range." };
    }
    if (from > to) {
      return { ok: false, error: "The start date must be before the end date." };
    }
    const days =
      (new Date(`${to}T00:00:00Z`).getTime() -
        new Date(`${from}T00:00:00Z`).getTime()) /
      86400000;
    if (days > MAX_RANGE_DAYS) {
      return {
        ok: false,
        error: `The date range must be ${MAX_RANGE_DAYS} days or less.`,
      };
    }

    const data = await buildReportData(type, from, to);
    await saveReport({
      generatedById: staff.id,
      generatedByName: staff.name,
      type,
      from,
      to,
    });
    revalidatePath("/admin/reports");
    return { ok: true, data };
  } catch (error) {
    console.error("generateReport failed:", error);
    return { ok: false, error: "The report could not be generated." };
  }
}
