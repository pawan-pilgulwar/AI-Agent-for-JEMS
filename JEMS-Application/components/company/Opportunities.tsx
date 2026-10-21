"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Plus, Users, X } from "lucide-react";
import { Card } from "@/components/dashboard/student/ui";
import { OPPORTUNITY_TYPES } from "@/lib/company/constants";
import type { OpeningView } from "@/lib/db/company";
import { Field, PageHead, TYPE_STYLE, fmtDate, inputClass, primaryBtn, secondaryBtn, textareaClass } from "./ui";

const EMPTY = { role: "", type: "Internship", location: "", salary: "", experience: "", requiredSkills: "", niceToHave: "", description: "" };

export default function Opportunities({ company, openings }: { company: string; openings: OpeningView[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [showForm, setShowForm] = useState(params.get("new") === "1");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/company/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not post the opening.");
      setForm(EMPTY);
      setShowForm(false);
      router.replace("/company/opportunities");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post the opening.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHead company={company} title="Jobs / Internships" hint="Every opening carries the skills it requires — that's what the Matching Agent uses to rank students for you." />
        <button type="button" onClick={() => setShowForm((v) => !v)} className={showForm ? secondaryBtn : primaryBtn}>
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Post a job / internship</>}
        </button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-navy">New job / internship</h2>
          <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Role title *"><input required value={form.role} onChange={set("role")} placeholder="e.g. Frontend Developer Intern" className={inputClass} /></Field>
            <Field label="Type *">
              <select value={form.type} onChange={set("type")} className={inputClass}>
                {OPPORTUNITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Location"><input value={form.location} onChange={set("location")} placeholder="Bengaluru / Remote" className={inputClass} /></Field>
            <Field label="Stipend / salary"><input value={form.salary} onChange={set("salary")} placeholder="₹25k/month or ₹6–9 LPA" className={inputClass} /></Field>
            <Field label="Experience"><input value={form.experience} onChange={set("experience")} placeholder="0–1 years / students" className={inputClass} /></Field>
            <Field label="Required skills *" hint="Comma-separated. Use the same names students earn on roadmaps (React, SQL, Docker…)."><input required value={form.requiredSkills} onChange={set("requiredSkills")} placeholder="Java, Spring Boot, SQL" className={inputClass} /></Field>
            <Field label="Nice to have"><input value={form.niceToHave} onChange={set("niceToHave")} placeholder="Docker, Microservices" className={inputClass} /></Field>
            <div className="md:col-span-2"><Field label="Description"><textarea value={form.description} onChange={set("description")} placeholder="What the role does, what the student will learn…" className={textareaClass} /></Field></div>
            {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
            <div className="md:col-span-2"><button type="submit" disabled={saving} className={primaryBtn}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Publish opening</button></div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {openings.length === 0 && <Card className="p-8 text-center text-sm text-mediumgray md:col-span-2 xl:col-span-3">No openings yet — post your first internship or job.</Card>}
        {openings.map((o) => (
          <Card key={o.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_STYLE(o.type)}`}>{o.type}</span>
              <span className="text-[11px] text-mediumgray">{fmtDate(o.postedAt)}</span>
            </div>
            <h3 className="mt-3 text-base font-bold text-navy">{o.role}</h3>
            <p className="text-xs text-mediumgray">{o.location}{o.salary ? ` · ${o.salary}` : ""}{o.experience ? ` · ${o.experience}` : ""}</p>
            {o.description && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-mediumgray">{o.description}</p>}
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-mediumgray">Required skills</p>
            <div className="mt-1 flex flex-wrap gap-1">{o.requiredSkills.map((s) => <span key={s} className="rounded bg-navy px-1.5 py-0.5 text-[10px] font-medium text-white">{s}</span>)}</div>
            {o.niceToHave.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{o.niceToHave.map((s) => <span key={s} className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-navy">{s}</span>)}</div>}
            <div className="mt-4 flex items-center justify-between border-t border-lightgray pt-3">
              <span className="inline-flex items-center gap-1 text-xs text-mediumgray"><Users className="h-3.5 w-3.5" /> {o.applicants} applicants</span>
              <Link href={`/company/candidates?job=${o.id}`} className="text-xs font-semibold text-slate hover:underline">View shortlist →</Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
