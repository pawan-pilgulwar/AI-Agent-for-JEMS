"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, GraduationCap, Handshake, LoaderCircle, Plus, Users, X } from "lucide-react";
import { Card } from "@/components/dashboard/student/ui";
import type { CollaborationView } from "@/lib/db/collaborations";
import type { ProgramView } from "@/lib/db/company";
import { COLLABORATION_TYPES, PROGRAM_TYPES } from "@/lib/company/constants";
import { Field, PageHead, fmtDate, inputClass, primaryBtn, secondaryBtn, textareaClass } from "./ui";

type Kind = "program" | "collaboration";
const EMPTY = { title: "", type: "", skills: "", domain: "", duration: "", mode: "Online", location: "", seats: "50", startsAt: "", description: "" };

/**
 * What the company publishes beyond openings: learning programs for students
 * (training, certifications, workshops, mentorship) and collaboration formats
 * for academicians (FDPs, faculty internships, guest lectures, research…).
 */
export default function Programs({ company, programs, collaborations }: { company: string; programs: ProgramView[]; collaborations: CollaborationView[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("program");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, type: PROGRAM_TYPES[0] as string });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const switchKind = (k: Kind) => { setKind(k); setForm((f) => ({ ...f, type: k === "program" ? PROGRAM_TYPES[0] : COLLABORATION_TYPES[0] })); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/company/programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ...form, seats: Number(form.seats) }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not publish.");
      setForm({ ...EMPTY, type: kind === "program" ? PROGRAM_TYPES[0] : COLLABORATION_TYPES[0] });
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHead company={company} title="Programs & collaborations" hint="Help students acquire in-demand skills before they apply, and bring academicians closer to industry practice." />
        <button type="button" onClick={() => setShowForm((v) => !v)} className={showForm ? secondaryBtn : primaryBtn}>
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Publish</>}
        </button>
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="flex gap-2">
            {([["program", "Student learning program", GraduationCap], ["collaboration", "Academia collaboration", Handshake]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" onClick={() => switchKind(k)} className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${kind === k ? "bg-navy text-white" : "border border-lightgray text-mediumgray hover:text-navy"}`}><Icon className="h-4 w-4" /> {label}</button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Title *"><input required value={form.title} onChange={set("title")} placeholder={kind === "program" ? "Java & Spring Boot Bootcamp" : "FDP: Cloud-Native Architecture"} className={inputClass} /></Field>
            <Field label="Type *">
              <select value={form.type} onChange={set("type")} className={inputClass}>
                {(kind === "program" ? PROGRAM_TYPES : COLLABORATION_TYPES).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            {kind === "program" ? (
              <>
                <Field label="Skills taught *" hint="Comma-separated; these feed the Learning Agent's recommendations."><input required value={form.skills} onChange={set("skills")} placeholder="Java, Spring Boot, REST APIs" className={inputClass} /></Field>
                <Field label="Mode"><input value={form.mode} onChange={set("mode")} placeholder="Online · live / Self-paced / On campus" className={inputClass} /></Field>
              </>
            ) : (
              <>
                <Field label="Domain" hint="Comma-separated"><input value={form.domain} onChange={set("domain")} placeholder="Cloud Computing, Microservices" className={inputClass} /></Field>
                <Field label="Location"><input value={form.location} onChange={set("location")} placeholder="Bengaluru campus / Remote" className={inputClass} /></Field>
              </>
            )}
            <Field label="Duration"><input value={form.duration} onChange={set("duration")} placeholder="6 weeks / 2 days" className={inputClass} /></Field>
            <Field label="Start date *"><input required type="date" value={form.startsAt} onChange={set("startsAt")} className={inputClass} /></Field>
            <Field label="Seats"><input type="number" min={0} value={form.seats} onChange={set("seats")} className={inputClass} /></Field>
            {kind === "collaboration" && <div className="md:col-span-2"><Field label="Description"><textarea value={form.description} onChange={set("description")} className={textareaClass} /></Field></div>}
            {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
            <div className="md:col-span-2"><button type="submit" disabled={saving} className={primaryBtn}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Publish</button></div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 border-b border-lightgray px-5 py-3.5"><GraduationCap className="h-4 w-4 text-slate" /><h2 className="text-sm font-semibold text-navy">Learning programs for students</h2><span className="ml-auto text-xs text-mediumgray">{programs.length}</span></div>
          <ul className="divide-y divide-lightgray">
            {programs.length === 0 && <li className="px-5 py-6 text-sm text-mediumgray">Nothing published yet.</li>}
            {programs.map((p) => (
              <li key={p.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-navy">{p.title}</span>
                  <span className="shrink-0 rounded-full bg-slate/10 px-2 py-0.5 text-[10px] font-semibold text-slate">{p.type}</span>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-mediumgray">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(p.startsAt)}</span><span>{p.duration}</span><span>{p.mode}</span><span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{p.seats} seats</span>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">{p.skills.map((s) => <span key={s} className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-navy">{s}</span>)}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="flex items-center gap-2 border-b border-lightgray px-5 py-3.5"><Handshake className="h-4 w-4 text-slate" /><h2 className="text-sm font-semibold text-navy">Collaborations for academicians</h2><span className="ml-auto text-xs text-mediumgray">{collaborations.length}</span></div>
          <ul className="divide-y divide-lightgray">
            {collaborations.length === 0 && <li className="px-5 py-6 text-sm text-mediumgray">Nothing published yet.</li>}
            {collaborations.map((c) => (
              <li key={c.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-navy">{c.title}</span>
                  <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{c.type}</span>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-mediumgray">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(c.startsAt)}</span><span>{c.duration}</span><span>{c.location}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald"><Users className="h-3 w-3" />{c.interested} faculty interested</span>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
