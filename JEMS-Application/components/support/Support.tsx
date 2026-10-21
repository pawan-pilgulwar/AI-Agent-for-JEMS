"use client";

import { useEffect, useRef, useState } from "react";
import {
  type LucideIcon,
  Check,
  Mail,
  MessageCircle,
  Phone,
  X,
} from "lucide-react";
import ComposeDemo from "@/components/compose/ComposeDemo";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card } from "@/components/dashboard/student/ui";
import type { TicketStatus, TicketView } from "@/lib/db/student-actions";

interface Channel {
  title: string;
  desc: string;
  status: string;
  cta: string;
  icon: LucideIcon;
  online?: boolean;
}

const CHANNELS: Channel[] = [
  { title: "Live Chat", desc: "Chat with our team", status: "Avg reply < 2 min", cta: "Start chat", icon: MessageCircle, online: true },
  { title: "Email", desc: "support@jems.com", status: "Replies within 24h", cta: "Send email", icon: Mail },
  { title: "Call us", desc: "Mon–Fri, 9–6 IST", status: "Available now", cta: "Call now", icon: Phone, online: true },
];

const CATEGORIES = [
  "Account & login",
  "Resume Builder",
  "Mock Interviews",
  "Job matching",
  "Billing & plans",
  "Something else",
];

function statusTone(s: TicketStatus) {
  if (s === "Resolved") return "bg-emerald/10 text-emerald";
  if (s === "In progress") return "bg-slate/10 text-slate";
  return "bg-gold/10 text-[#b45309]";
}

const inputClass =
  "h-11 w-full rounded-lg border border-lightgray bg-white px-3 text-sm text-navy outline-none transition-colors placeholder:text-mediumgray focus:border-slate focus:ring-2 focus:ring-slate/15";

export default function Support({ initialTickets }: { initialTickets: TicketView[] }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<TicketView | null>(null);
  const [tickets, setTickets] = useState<TicketView[]>(initialTickets);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Bring the chat into view when it's opened from the channel card.
  useEffect(() => {
    if (chatOpen) chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [chatOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/student/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { ticket?: TicketView; error?: string };
      if (!res.ok || !data.ticket) throw new Error(data.error || "Could not submit the ticket.");
      setTickets((t) => [data.ticket!, ...t]);
      setSent(data.ticket);
      setSubject("");
      setCategory("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Channels */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.title} className="flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate/10 text-slate">
                    <Icon className="h-5 w-5" />
                  </span>
                  {c.online && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald">
                      <span className="h-2 w-2 rounded-full bg-emerald" />
                      Online
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-base font-bold text-navy">{c.title}</h3>
                <p className="text-xs text-mediumgray">{c.desc}</p>
                <p className="mt-1 flex-1 text-[11px] font-medium text-mediumgray">{c.status}</p>
                <button
                  type="button"
                  onClick={c.title === "Live Chat" ? () => setChatOpen(true) : undefined}
                  className="mt-4 w-full rounded-lg border border-lightgray py-2.5 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate"
                >
                  {c.cta}
                </button>
              </Card>
            );
          })}
        </div>

        {/* Live chat */}
        {chatOpen && (
          <Card className="scroll-mt-20" ref={chatRef}>
            <div className="flex items-center justify-between border-b border-lightgray px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald" />
                <h2 className="text-sm font-semibold text-navy">Live chat</h2>
                <span className="text-xs text-mediumgray">· Avg reply &lt; 2 min</span>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-mediumgray transition-colors hover:bg-surface hover:text-navy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ComposeDemo className="p-5" />
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Submit a ticket */}
          <Card className="lg:col-span-3">
            <div className="border-b border-lightgray px-5 py-3.5">
              <h2 className="text-sm font-semibold text-navy">Submit a ticket</h2>
            </div>
            <div className="p-5">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald/10 text-emerald">
                    <Check className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-navy">Ticket {sent.ticketNo} submitted</p>
                  <p className="mt-1 text-xs text-mediumgray">
                    We&apos;ve received your request and will reply by email shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(null)}
                    className="mt-5 rounded-lg border border-lightgray px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate"
                  >
                    Submit another
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label htmlFor="sup-subject" className="mb-1.5 block text-xs font-medium text-navy">
                      Subject
                    </label>
                    <input
                      id="sup-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      maxLength={150}
                      placeholder="Brief summary of the issue"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="sup-category" className="mb-1.5 block text-xs font-medium text-navy">
                      Category
                    </label>
                    <select
                      id="sup-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={`${inputClass} appearance-none ${category ? "" : "text-mediumgray"}`}
                    >
                      <option value="" disabled>
                        Select a category
                      </option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="text-navy">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sup-message" className="mb-1.5 block text-xs font-medium text-navy">
                      Message
                    </label>
                    <textarea
                      id="sup-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={4000}
                      placeholder="Describe your issue in detail…"
                      className="min-h-28 w-full resize-y rounded-lg border border-lightgray bg-white px-3 py-2 text-sm leading-6 text-navy outline-none transition-colors placeholder:text-mediumgray focus:border-slate focus:ring-2 focus:ring-slate/15"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting || !subject.trim() || !message.trim()}
                    className="w-full rounded-lg bg-primary-gradient py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
                  >
                    {submitting ? "Submitting…" : "Submit ticket"}
                  </button>
                </form>
              )}
            </div>
          </Card>

          {/* Your tickets */}
          <Card className="lg:col-span-2">
            <div className="border-b border-lightgray px-5 py-3.5">
              <h2 className="text-sm font-semibold text-navy">Your tickets</h2>
            </div>
            <ul className="divide-y divide-lightgray">
              {tickets.length === 0 && <li className="px-5 py-8 text-center text-sm text-mediumgray">No tickets yet.</li>}
              {tickets.map((t) => (
                <li key={t.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-mediumgray">{t.ticketNo}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-navy">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-mediumgray">{t.category} · {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </DashboardContainer>
    </DashboardShell>
  );
}
