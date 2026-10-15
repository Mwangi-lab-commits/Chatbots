"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChatMessageView, EscalationReason } from "@/lib/types";

const STORAGE_KEY = "chat_session_code";

const REASONS: EscalationReason[] = [
  "Irrelevant response",
  "Repeated answers",
  "Misunderstood question",
  "Other",
];

function timeOf(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const FALLBACK_MESSAGE =
  "Hello! I am the support assistant. Ask me about delivery, refunds, payments, or your account.";

export default function ChatWindow() {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [ratingBusy, setRatingBusy] = useState<string | null>(null);

  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] =
    useState<EscalationReason>("Irrelevant response");
  const [escalateDescription, setEscalateDescription] = useState("");
  const [escalateBusy, setEscalateBusy] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Restore the session after a page reload.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    fetch(`/api/chat?sessionCode=${encodeURIComponent(saved)}`)
      .then(async (response) => {
        if (!response.ok) {
          window.localStorage.removeItem(STORAGE_KEY);
          return;
        }
        const data = await response.json();
        setSessionCode(data.sessionCode);
        setMessages(data.messages ?? []);
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage() {
    const message = draft.trim();
    if (message.length === 0 || sending) return;
    setSending(true);
    setError(null);
    setDraft("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode, message }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The message could not be sent.");
        return;
      }
      setSessionCode(data.sessionCode);
      window.localStorage.setItem(STORAGE_KEY, data.sessionCode);
      setMessages((previous) => [...previous, ...data.messages]);
    } catch {
      setError("The message could not be sent. Check your connection.");
    } finally {
      setSending(false);
    }
  }

  async function rate(messageId: string, rating: number) {
    setRatingBusy(messageId);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The rating could not be saved.");
        return;
      }
      setMessages((previous) =>
        previous.map((message) =>
          message.id === messageId
            ? { ...message, feedback: data.feedback }
            : message,
        ),
      );
    } catch {
      setError("The rating could not be saved. Check your connection.");
    } finally {
      setRatingBusy(null);
    }
  }

  async function saveComment(messageId: string) {
    const message = messages.find((item) => item.id === messageId);
    const rating = message?.feedback?.rating ?? 5;
    setRatingBusy(messageId);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating, comment: commentDraft }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The comment could not be saved.");
        return;
      }
      setMessages((previous) =>
        previous.map((item) =>
          item.id === messageId ? { ...item, feedback: data.feedback } : item,
        ),
      );
      setCommentFor(null);
      setCommentDraft("");
    } catch {
      setError("The comment could not be saved. Check your connection.");
    } finally {
      setRatingBusy(null);
    }
  }

  async function submitEscalation() {
    if (!sessionCode) return;
    setEscalateBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode,
          reason: escalateReason,
          description: escalateDescription,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The ticket could not be created.");
        setEscalateOpen(false);
        return;
      }
      setTicket(data.escalation.ticket_code);
      setEscalateDescription("");
    } catch {
      setError("The ticket could not be created. Check your connection.");
      setEscalateOpen(false);
    } finally {
      setEscalateBusy(false);
    }
  }

  async function endSession() {
    if (!sessionCode) return;
    try {
      await fetch("/api/chat/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode }),
      });
    } catch {
      // The session ends locally even if the closing call fails.
    }
    startNewSession();
  }

  function startNewSession() {
    setSessionCode(null);
    setMessages([]);
    setDraft("");
    setTicket(null);
    setError(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const canEscalate = messages.some((message) => message.sender === "Customer");

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      {/* Main chat area */}
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Support Assistant
            </h1>
            <p className="text-xs text-slate-500">
              Anonymous session. Your name is not recorded.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Home
          </Link>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-6">
          {messages.length === 0 && !sending && (
            <div className="mx-auto max-w-md rounded-xl bg-white p-5 text-center text-sm text-slate-600 shadow-sm">
              {FALLBACK_MESSAGE}
            </div>
          )}

          {messages.map((message) =>
            message.sender === "Customer" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2.5 text-sm text-white">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="mt-1 text-right text-[11px] text-indigo-200">
                    {timeOf(message.sent_at)}
                  </p>
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-[80%]">
                  <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {timeOf(message.sent_at)}
                    </p>
                  </div>
                  <BotFeedback
                    message={message}
                    busy={ratingBusy === message.id}
                    commentOpen={commentFor === message.id}
                    commentDraft={commentDraft}
                    onRate={(value) => rate(message.id, value)}
                    onOpenComment={() => {
                      setCommentFor(message.id);
                      setCommentDraft(message.feedback?.comment ?? "");
                    }}
                    onCommentDraft={setCommentDraft}
                    onSaveComment={() => saveComment(message.id)}
                    onCancelComment={() => {
                      setCommentFor(null);
                      setCommentDraft("");
                    }}
                    onEscalate={() => setEscalateOpen(true)}
                  />
                </div>
              </div>
            ),
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-400 shadow-sm">
                The assistant is typing...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="px-5 pb-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="border-t border-slate-200 bg-white px-5 py-4">
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              rows={2}
              maxLength={1000}
              placeholder="Type your question. Press Enter to send."
              className="min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={sending || draft.trim().length === 0}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Side panel */}
      <aside className="w-full shrink-0 space-y-4 border-t border-slate-200 bg-white p-5 lg:w-72 lg:border-l lg:border-t-0">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Session reference</p>
          <p className="mt-1 font-mono text-sm text-slate-800">
            {sessionCode ?? "New session"}
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setEscalateOpen(true)}
            disabled={!canEscalate}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Talk to a human
          </button>
          <Link
            href="/status"
            className="block w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Check ticket status
          </Link>
          <button
            type="button"
            onClick={startNewSession}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            New chat
          </button>
          <button
            type="button"
            onClick={() => void endSession()}
            disabled={!canEscalate}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            End session
          </button>
        </div>

        {ticket && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-medium text-emerald-700">
              Ticket created
            </p>
            <p className="mt-1 font-mono text-sm text-emerald-900">{ticket}</p>
            <p className="mt-1 text-xs text-emerald-700">
              Save this code. Use it on the Check ticket status page.
            </p>
          </div>
        )}

        <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
          <p className="font-medium text-slate-600">Privacy notice</p>
          <p className="mt-1">
            This chat is anonymous. The system stores the conversation text,
            your ratings and any tickets you raise. It does not store your
            name, phone number, or email address. It follows the Data
            Protection Act, 2019 (Kenya).
          </p>
        </div>
      </aside>

      {/* Escalation dialog */}
      {escalateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Escalate to a human agent
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Chat reference:{" "}
              <span className="font-mono">{sessionCode ?? "-"}</span>
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="escalate-reason"
                  className="block text-sm font-medium text-slate-700"
                >
                  Reason
                </label>
                <select
                  id="escalate-reason"
                  value={escalateReason}
                  onChange={(event) =>
                    setEscalateReason(event.target.value as EscalationReason)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="escalate-description"
                  className="block text-sm font-medium text-slate-700"
                >
                  Describe the problem
                </label>
                <textarea
                  id="escalate-description"
                  value={escalateDescription}
                  onChange={(event) =>
                    setEscalateDescription(event.target.value)
                  }
                  rows={4}
                  maxLength={1000}
                  placeholder="Explain what went wrong with the chatbot reply."
                  className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEscalateOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitEscalation()}
                  disabled={escalateBusy || escalateDescription.trim().length === 0}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {escalateBusy ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Rating and escalation actions below one chatbot reply. */
function BotFeedback(props: {
  message: ChatMessageView;
  busy: boolean;
  commentOpen: boolean;
  commentDraft: string;
  onRate: (rating: number) => void;
  onOpenComment: () => void;
  onCommentDraft: (value: string) => void;
  onSaveComment: () => void;
  onCancelComment: () => void;
  onEscalate: () => void;
}) {
  const { message, busy, commentOpen } = props;
  const feedback = message.feedback;

  return (
    <div className="mt-1.5 pl-1">
      {!feedback ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            disabled={busy}
            onClick={() => props.onRate(5)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
          >
            Helpful
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => props.onRate(1)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-red-300 hover:text-red-700 disabled:opacity-50"
          >
            Not helpful
          </button>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                disabled={busy}
                onClick={() => props.onRate(star)}
                title={`Rate ${star} of 5`}
                className="text-base leading-none text-slate-300 hover:text-amber-400 disabled:opacity-50"
              >
                ★
              </button>
            ))}
          </span>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={props.onEscalate}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-indigo-300 hover:text-indigo-700"
          >
            Escalate
          </button>
        </div>
      ) : (
        <div className="text-xs text-slate-500">
          <p>
            Your rating:{" "}
            <span className="text-amber-500">
              {"★".repeat(feedback.rating)}
              {"☆".repeat(5 - feedback.rating)}
            </span>{" "}
            ({feedback.rating}/5)
          </p>
          {feedback.comment && (
            <p className="mt-0.5 italic text-slate-400">
              Comment: {feedback.comment}
            </p>
          )}
          {!commentOpen && !feedback.comment && (
            <button
              type="button"
              onClick={props.onOpenComment}
              className="mt-1 text-indigo-600 hover:text-indigo-500"
            >
              Add a comment
            </button>
          )}
          {commentOpen && (
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="text"
                value={props.commentDraft}
                onChange={(event) => props.onCommentDraft(event.target.value)}
                maxLength={255}
                placeholder="What went wrong?"
                className="w-56 rounded-lg border border-slate-300 px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={busy}
                onClick={props.onSaveComment}
                className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={props.onCancelComment}
                className="text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
