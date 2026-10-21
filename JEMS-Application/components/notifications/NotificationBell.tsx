"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BriefcaseBusiness, CircleAlert, CircleCheck, Info, LoaderCircle, X } from "lucide-react";
import type { AiTaskView } from "@/lib/ai-tasks/types";
import type { NotificationKind, NotificationView } from "@/lib/db/notifications";

const FAST_MS = 5_000;
const SLOW_MS = 30_000;

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

const KIND_ICON: Record<NotificationKind, { icon: typeof Bell; tone: string }> = {
  "ai-success": { icon: CircleCheck, tone: "bg-emerald/10 text-emerald" },
  "ai-failure": { icon: CircleAlert, tone: "bg-red-50 text-red-600" },
  application: { icon: BriefcaseBusiness, tone: "bg-slate/10 text-slate" },
  info: { icon: Info, tone: "bg-surface text-mediumgray" },
};

/**
 * Top-bar bell: in-progress AI tasks (with live progress) and notifications.
 * Polls fast while something is running, slowly otherwise. When a new
 * notification arrives after the first load, a toast surfaces it wherever
 * the user is in the app — that's how background AI results "report back".
 */
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationView[]>([]);
  const [unread, setUnread] = useState(0);
  const [active, setActive] = useState<AiTaskView[]>([]);
  const [toast, setToast] = useState<NotificationView | null>(null);
  const known = useRef<Set<string> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The poll re-schedules itself through this ref (a callback can't name itself).
  const pollRef = useRef<() => void>(() => {});
  const ref = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    let busy = false;
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { notifications: NotificationView[]; unread: number; activeTasks: AiTaskView[] };
        // First load only records what exists; later polls toast what's new.
        if (known.current) {
          const fresh = data.notifications.find((n) => !n.read && !known.current!.has(n.id));
          if (fresh) setToast(fresh);
        }
        known.current = new Set(data.notifications.map((n) => n.id));
        setItems(data.notifications);
        setUnread(data.unread);
        setActive(data.activeTasks);
        busy = data.activeTasks.length > 0;
      }
    } catch {
      // Network blip — keep the last state and retry.
    }
    timer.current = setTimeout(() => pollRef.current(), busy ? FAST_MS : SLOW_MS);
  }, []);

  useEffect(() => {
    pollRef.current = poll;
    poll();
    // startAiTask() fires this so the bell switches to fast polling at once.
    const kick = () => poll();
    window.addEventListener("jems:ai-task-started", kick);
    return () => {
      window.removeEventListener("jems:ai-task-started", kick);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8_000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const markRead = async (ids: string[]) => {
    setItems((prev) => prev.map((n) => (ids.length === 0 || ids.includes(n.id) ? { ...n, read: true } : n)));
    setUnread((u) => (ids.length === 0 ? 0 : Math.max(0, u - ids.length)));
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => {});
  };

  const openItem = (n: NotificationView) => {
    if (!n.read) markRead([n.id]);
    setOpen(false);
    setToast(null);
    if (n.link) {
      router.push(n.link);
      router.refresh();
    }
  };

  const badge = unread + active.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={badge ? `Notifications (${badge} new or in progress)` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-mediumgray transition-colors hover:bg-surface hover:text-navy"
      >
        {active.length > 0 ? <LoaderCircle className="h-5 w-5 animate-spin text-slate" /> : <Bell className="h-5 w-5" />}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-navy/[0.08] bg-white shadow-[var(--shadow-card)]"
          style={{ animation: "fade-in 0.18s ease-out" }}
        >
          <div className="flex items-center justify-between border-b border-lightgray px-4 py-2.5">
            <p className="text-sm font-semibold text-navy">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => markRead([])} className="text-xs font-semibold text-slate hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {active.length > 0 && (
              <div className="border-b border-lightgray bg-surface-2/60 px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-mediumgray">In progress</p>
                <ul className="mt-1.5 space-y-2">
                  {active.map((t) => (
                    <li key={t.id} className="flex items-start gap-2.5">
                      <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-slate" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-navy">{t.label}</span>
                        <span className="block text-xs text-mediumgray">{t.progress || (t.status === "queued" ? "Queued" : "Working…")}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {items.length === 0 && active.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-mediumgray">You&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y divide-lightgray">
                {items.map((n) => {
                  const { icon: Icon, tone } = KIND_ICON[n.kind];
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openItem(n)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 ${n.read ? "" : "bg-orange/[0.03]"}`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className={`text-sm text-navy ${n.read ? "font-medium" : "font-semibold"}`}>{n.title}</span>
                            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange" aria-label="Unread" />}
                          </span>
                          {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-mediumgray">{n.body}</span>}
                          <span className="mt-1 block text-[11px] text-mediumgray">{timeAgo(n.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-navy/[0.08] bg-white p-4 shadow-[var(--shadow-card)]"
          style={{ animation: "fade-in 0.2s ease-out" }}
        >
          {(() => {
            const { icon: Icon, tone } = KIND_ICON[toast.kind];
            return (
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
            );
          })()}
          <button type="button" onClick={() => openItem(toast)} className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-semibold text-navy">{toast.title}</span>
            {toast.body && <span className="mt-0.5 line-clamp-2 block text-xs text-mediumgray">{toast.body}</span>}
            {toast.link && <span className="mt-1 block text-xs font-semibold text-slate">View</span>}
          </button>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="rounded-md p-1 text-mediumgray hover:bg-surface hover:text-navy">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
