import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Staff sign in - Chatbot Monitor",
  description: "Sign in to the Chatbot Monitor staff workspace.",
  robots: { index: false, follow: false },
};

const FEATURES = [
  "Automatic NLP error flags",
  "Customer ratings and comments",
  "Escalation tickets and reports",
];

/**
 * Clerk appearance overrides. Keep the card and form consistent with the
 * slate and indigo palette used across the staff workspace.
 */
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#4f46e5",
    colorBackground: "#ffffff",
    colorText: "#0f172a",
    colorTextSecondary: "#64748b",
    colorInputBackground: "#f8fafc",
    colorInputText: "#0f172a",
    colorDanger: "#dc2626",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
    fontSize: "0.875rem",
  },
  elements: {
    rootBox: {
      width: "100%",
      maxWidth: "100%",
    },
    cardBox: {
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      borderRadius: "1rem",
      boxShadow:
        "0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.08)",
    },
    card: {
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      margin: 0,
      borderRadius: "1rem",
    },
    logoBox: { display: "none" },
    headerTitle: "text-2xl font-bold tracking-tight text-slate-900",
    headerSubtitle: "text-sm text-slate-500",
    socialButtonsRoot: { display: "none" },
    socialButtons: { display: "none" },
    dividerRow: { display: "none" },
    formButtonPrimary:
      "bg-indigo-600 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
    formFieldLabel: "font-medium text-slate-700",
    formFieldInput:
      "border-slate-200 bg-slate-50 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
    formFieldInputShowPasswordButton: "text-slate-400 hover:text-slate-600",
    footer: {
      backgroundColor: "transparent",
      backgroundImage: "none",
    },
    footerAction: { display: "none" },
    footerItem: { display: "none" },
    footerActionLink: "font-semibold text-indigo-600 hover:text-indigo-500",
    alert: "border-red-200 bg-red-50",
    alertText: "text-red-700",
    otpCodeFieldInput: "border-slate-200 bg-slate-50",
    formResendCodeLink: "font-medium text-indigo-600",
    identityPreviewText: "text-slate-700",
    identityPreviewEditButton: "text-indigo-600",
  },
};

function LogoMark({ className }: { className: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 ${className}`}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-5 4v-4.35A2.5 2.5 0 0 1 4 13.5v-7Z" />
        <path d="M8 9h8" />
        <path d="M8 12h5" />
      </svg>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <rect height="11" rx="2" width="16" x="4" y="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ArrowUpRightIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function StarRating() {
  return (
    <div
      aria-label="4 out of 5 stars"
      className="flex items-center gap-0.5"
      role="img"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${
            star <= 4 ? "text-amber-300" : "text-slate-600"
          }`}
          fill={star <= 4 ? "currentColor" : "none"}
          key={star}
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 0 0 .95-.69l1.07-3.292Z" />
        </svg>
      ))}
    </div>
  );
}

/**
 * Staff login page (design screen 2.2.1).
 * Clerk handles the credentials, the session and the brute-force lockout.
 */
export default function SignInPage() {
  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden bg-slate-950 lg:flex lg:flex-col lg:p-8 xl:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 10%, rgba(99,102,241,0.30), transparent 35%), radial-gradient(circle at 85% 85%, rgba(56,189,248,0.12), transparent 40%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "linear-gradient(to bottom, black, transparent 92%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black, transparent 92%)",
            }}
          />
          <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <LogoMark className="h-11 w-11" />
            <div>
              <p className="font-semibold text-white">Chatbot Monitor</p>
              <p className="text-xs text-slate-400">
                NLP error &amp; feedback system
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col justify-center py-8 xl:py-10">
          <div className="max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live monitoring for support teams
            </span>
            <p className="mt-6 text-3xl font-bold tracking-tight text-white xl:text-4xl">
              See what your chatbot misses.
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300 xl:text-base xl:leading-7">
              Review flagged conversations, follow customer ratings, and
              resolve escalations in one staff workspace.
            </p>

            <ul className="mt-6 space-y-2.5">
              {FEATURES.map((feature) => (
                <li
                  className="flex items-center gap-3 text-sm text-slate-300"
                  key={feature}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/15 text-indigo-300">
                    <CheckIcon />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative">
          <div className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Example review
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                Irrelevant 0.92
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-slate-800 px-3.5 py-2.5 text-sm text-slate-200">
                Where is my order?
              </div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-indigo-400/20 bg-indigo-500/10 px-3.5 py-2.5 text-sm text-indigo-100">
                Our support desk is open Monday to Friday, from 8:00 to 18:00.
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <StarRating />
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                Flagged for review
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Built for teams that care about answer quality.
          </p>
        </div>
      </section>

      {/* Sign-in panel */}
      <section className="flex min-h-screen min-w-0 flex-col bg-slate-50">
        <div className="flex items-center justify-between px-6 py-6 sm:px-10 lg:px-12">
          <Link
            className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 lg:hidden"
            href="/"
          >
            <LogoMark className="h-9 w-9" />
            <span className="text-sm font-semibold text-slate-900">
              Chatbot Monitor
            </span>
          </Link>
          <Link
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl text-sm font-medium text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            href="/chat"
          >
            Customer chat
            <ArrowUpRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center px-6 pb-10 sm:px-10 lg:px-12">
          <div className="w-full min-w-0 max-w-[400px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <LockIcon className="h-3.5 w-3.5" />
              Staff portal
            </span>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Sign in to review conversations, monitor answer quality, and
              resolve escalations.
            </p>

            <div className="mt-6">
              <SignIn
                appearance={CLERK_APPEARANCE}
                fallbackRedirectUrl="/admin"
                withSignUp={false}
              />
            </div>

            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-xs leading-5 text-slate-500">
              <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p>
                Staff access only. Contact your administrator if you need an
                account.
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Chatbot Monitor · NLP error monitoring and feedback
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
