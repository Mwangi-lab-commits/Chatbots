import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Chatbot NLP Error Monitoring and Feedback System
        </h1>
        <p className="mt-4 text-slate-600">
          Talk to the support chatbot. Rate its answers. Escalate unresolved
          problems to a human agent.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/chat"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Start chatting
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Staff sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
