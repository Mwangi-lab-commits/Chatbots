import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Staff sign up - Chatbot Monitor",
};

/**
 * Staff sign-up page.
 *
 * Public sign-ups are disabled in Clerk for production. Keep this page for
 * first-time setup and invitation links. Staff accounts are normally created
 * in the Clerk dashboard.
 */
export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <SignUp fallbackRedirectUrl="/admin" />
    </main>
  );
}
