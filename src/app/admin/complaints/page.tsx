import Link from "next/link";
import ComplaintsPanel from "@/components/admin/ComplaintsPanel";
import { listStaff } from "@/lib/auth";
import { getEscalationRows } from "@/lib/queries";

export const dynamic = "force-dynamic";

const FILTERS = ["All", "Pending", "In Progress", "Resolved"];

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const activeFilter = params.status ?? "All";
  const [rows, staff] = await Promise.all([
    getEscalationRows(activeFilter),
    listStaff(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Complaints and escalations
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Escalation tickets raised by customers. Assign an agent, update the
          status and record a resolution note.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={filter === "All" ? "/admin/complaints" : `/admin/complaints?status=${encodeURIComponent(filter)}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              activeFilter === filter
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {filter}
          </Link>
        ))}
      </div>

      <ComplaintsPanel rows={rows} staff={staff} />
    </div>
  );
}
