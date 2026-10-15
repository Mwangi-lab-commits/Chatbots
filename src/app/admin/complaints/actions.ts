"use server";

import { revalidatePath } from "next/cache";
import { listStaff, requireStaffUser } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

const VALID_STATUSES = ["Pending", "In Progress", "Resolved"];

/**
 * Update one escalation ticket: assign an agent, change the status and save
 * a resolution note. Called from the complaints screen (design screen 2.2.7).
 */
export async function updateEscalation(formData: FormData): Promise<void> {
  await requireStaffUser();

  const id = String(formData.get("escalation_id") ?? "");
  const assignedToId = String(formData.get("assigned_to_id") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const resolutionNote = String(formData.get("resolution_note") ?? "").trim();

  if (!id || !VALID_STATUSES.includes(status)) {
    throw new Error("Invalid ticket update.");
  }

  // Look up the agent name on the server. Do not trust the client.
  let assignedToName: string | null = null;
  if (assignedToId) {
    const staff = await listStaff();
    assignedToName =
      staff.find((member) => member.id === assignedToId)?.name ?? null;
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("escalations")
    .update({
      assigned_to_id: assignedToId || null,
      assigned_to_name: assignedToName,
      status,
      resolution_note: resolutionNote || null,
      resolved_at: status === "Resolved" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/complaints");
}
