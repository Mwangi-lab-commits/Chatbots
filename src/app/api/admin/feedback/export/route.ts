import { auth } from "@clerk/nextjs/server";
import { toCsv } from "@/lib/format";
import { getFeedbackData } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/feedback/export
 * Download all feedback entries as a CSV file. Staff only.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const data = await getFeedbackData();
    const csv = toCsv(
      ["Submitted", "Rating", "Comment", "Chatbot response"],
      data.rows.map((row) => [
        row.submittedAt,
        row.rating,
        row.comment ?? "",
        row.messageContent,
      ]),
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="feedback-export.csv"',
      },
    });
  } catch (error) {
    console.error("GET /api/admin/feedback/export failed:", error);
    return new Response("Export failed.", { status: 500 });
  }
}
