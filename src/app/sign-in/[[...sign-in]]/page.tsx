import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Staff sign in - Chatbot Monitor",
};

/**
 * Staff login page (design screen 2.2.1).
 * Clerk handles the credentials, the session and the brute-force lockout.
 */
export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <SignIn fallbackRedirectUrl="/admin" />
    </main>
  );
}
