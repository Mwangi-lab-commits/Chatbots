import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import SidebarNav from "@/components/admin/SidebarNav";
import { getStaffUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Staff dashboard - Chatbot Monitor",
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Resource-based authentication check. Clerk redirects signed-out staff
  // to the sign-in page.
  await auth.protect();

  const staff = await getStaffUser();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 lg:flex print:hidden">
        <div className="border-b border-slate-800 px-5 py-5">
          <p className="font-semibold text-white">Chatbot Monitor</p>
          <p className="mt-0.5 text-xs text-slate-400">
            NLP error and feedback system
          </p>
        </div>
        <SidebarNav />
        <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-400">
          Support staff area
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 print:hidden">
          <div className="lg:hidden">
            <Link className="text-sm font-semibold text-slate-800" href="/admin">
              Chatbot Monitor
            </Link>
          </div>
          <p className="hidden text-sm text-slate-500 lg:block">
            Chatbot NLP error monitoring dashboard
          </p>
          <div className="flex items-center gap-3">
            {staff && (
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">
                  {staff.name}
                </p>
                <p className="text-xs capitalize text-slate-500">
                  {staff.role}
                </p>
              </div>
            )}
            <UserButton />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
