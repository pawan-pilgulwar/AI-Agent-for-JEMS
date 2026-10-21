"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building, CalendarDays, Check, Clock, Handshake, MapPin, Star, Users } from "lucide-react";
import { Card } from "@/components/dashboard/student/ui";
import type { CollaborationView } from "@/lib/db/collaborations";

const TYPES = ["All", "FDP", "Faculty Internship", "Industrial Training", "Guest Lecture", "Research", "Consultancy", "Innovation Challenge", "Live Project"];

const TYPE_STYLE: Record<string, string> = {
  FDP: "bg-violet-50 text-violet-700",
  "Faculty Internship": "bg-sky-50 text-sky-700",
  "Industrial Training": "bg-emerald/10 text-emerald",
  "Guest Lecture": "bg-gold/15 text-amber-700",
  Research: "bg-navy/10 text-navy",
  Consultancy: "bg-slate/10 text-slate",
  "Innovation Challenge": "bg-pink-50 text-pink-700",
  "Live Project": "bg-teal-50 text-teal-700",
};

/**
 * The academician's view of industry collaboration: browse FDPs, faculty
 * internships, industrial training, guest lectures, research and consultancy,
 * and express interest so the company (and institution) can see demand.
 */
export default function CollaborationBoard({
  items,
  who,
  headline,
}: {
  items: CollaborationView[];
  who: string;
  headline: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState<string | null>(null);
  const [local, setLocal] = useState(items);

  const toggle = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch("/api/faculty/interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collaborationId: id }) });
      const data = (await res.json()) as { interested?: boolean };
      if (res.ok) {
        setLocal((rows) => rows.map((r) => (r.id === id ? { ...r, mine: !!data.interested, interested: r.interested + (data.interested ? 1 : -1) } : r)));
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  const visible = local.filter((c) => filter === "All" || c.type === filter);
  const mine = local.filter((c) => c.mine);
  const available = TYPES.filter((t) => t === "All" || local.some((c) => c.type === t));

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-xs font-semibold text-slate"><Handshake className="h-3.5 w-3.5" /> {who}</span>
        <h1 className="mt-3 text-2xl font-bold text-navy">{headline}</h1>
        <p className="mt-1 text-sm text-mediumgray">Faculty development programs, industrial training, guest lectures, research and consultancy published by industry partners.</p>
      </div>

      <div data-tour="collab-stats" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Open opportunities", value: local.length, icon: Handshake },
          { label: "FDPs & training", value: local.filter((c) => /FDP|Training|Internship/.test(c.type)).length, icon: Users },
          { label: "Research & consultancy", value: local.filter((c) => /Research|Consultancy/.test(c.type)).length, icon: Star },
          { label: "My interests", value: mine.length, icon: Check },
        ].map((t) => (
          <Card key={t.label} className="p-4">
            <div className="flex items-center justify-between"><p className="text-xs font-medium text-mediumgray">{t.label}</p><t.icon className="h-4 w-4 text-slate" /></div>
            <p className="mt-2 text-2xl font-bold text-navy">{t.value}</p>
          </Card>
        ))}
      </div>

      <div data-tour="collab-filters" className="flex flex-wrap gap-2">
        {available.map((t) => (
          <button key={t} type="button" onClick={() => setFilter(t)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${filter === t ? "bg-navy text-white" : "border border-lightgray bg-white text-mediumgray hover:text-navy"}`}>{t}</button>
        ))}
      </div>

      <div data-tour="collab-grid" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((c) => (
          <Card key={c.id} className={`flex flex-col p-5 ${c.mine ? "border-emerald/40" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_STYLE[c.type] ?? "bg-surface text-navy"}`}>{c.type}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-mediumgray"><Users className="h-3 w-3" /> {c.interested} interested</span>
            </div>
            <h3 className="mt-3 text-base font-bold text-navy">{c.title}</h3>
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-mediumgray"><Building className="h-3 w-3" /> {c.company}</p>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-mediumgray">{c.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">{c.domain.map((d) => <span key={d} className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-navy">{d}</span>)}</div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-mediumgray">
              <dd className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{c.startsAt ? new Date(c.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "TBA"}</dd>
              <dd className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{c.duration}</dd>
              <dd className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</dd>
              <dd className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{c.seats} seats</dd>
            </dl>
            <button
              type="button"
              onClick={() => toggle(c.id)}
              disabled={busy === c.id}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                c.mine ? "border border-emerald/40 bg-emerald/10 text-emerald" : "bg-primary-gradient text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] hover:-translate-y-0.5"
              }`}
            >
              {c.mine ? <><Check className="h-4 w-4" /> Interested · withdraw</> : <><Star className="h-4 w-4" /> Express interest</>}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
