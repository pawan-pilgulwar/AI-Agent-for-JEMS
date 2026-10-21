"use client";

import type { ResumeData } from "./types";

function fmtMonth(value: string): string {
  if (!value) return "";
  const [y, m] = value.split("-");
  if (!y || !m) return value;
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function dateRange(start: string, end: string, current: boolean): string {
  const s = fmtMonth(start);
  const e = current ? "Present" : fmtMonth(end);
  if (!s && !e) return "";
  return [s, e].filter(Boolean).join(" – ");
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-2 border-b border-gray-300 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-700">
      {children}
    </h2>
  );
}

/** Real-time A4 preview of the resume. The sheet carries `resume-print` so the
 * "Download as PDF" action can print just this element. */
export default function ResumePreview({ data }: { data: ResumeData }) {
  const h = data.header;
  const contact = [h.email, h.phone, h.location, h.portfolio, h.linkedin].filter(Boolean);

  const skills = data.skills.filter((s) => s.name.trim());
  const experience = data.experience.filter((e) => e.company.trim() || e.jobTitle.trim());
  const education = data.education.filter((e) => e.school.trim() || e.degree.trim());
  const certs = data.certifications.filter((c) => c.name.trim());
  const projects = data.projects.filter((p) => p.name.trim());

  return (
    <div className="resume-print mx-auto w-full max-w-[680px] bg-white p-10 text-gray-800 shadow-[0_4px_24px_rgba(0,0,0,0.12)] [aspect-ratio:1/1.414]">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {h.fullName || "Your Name"}
        </h1>
        {h.title && <p className="mt-0.5 text-sm font-medium text-slate">{h.title}</p>}
        {contact.length > 0 && (
          <p className="mt-2 text-[11px] leading-5 text-gray-600">
            {contact.join("  •  ")}
          </p>
        )}
      </header>

      {data.summary.trim() && (
        <section className="mt-5">
          <SectionTitle>Summary</SectionTitle>
          <p className="text-[12px] leading-5 text-gray-700">{data.summary}</p>
        </section>
      )}

      {experience.length > 0 && (
        <section className="mt-5">
          <SectionTitle>Experience</SectionTitle>
          <div className="space-y-3">
            {experience.map((e) => (
              <div key={e.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-gray-900">
                    {e.jobTitle || "Role"}
                    {e.company && <span className="font-normal text-gray-600"> · {e.company}</span>}
                  </p>
                  <p className="shrink-0 text-[10.5px] text-gray-500">
                    {dateRange(e.start, e.end, e.current)}
                  </p>
                </div>
                {e.description && (
                  <p className="mt-0.5 text-[11.5px] leading-5 text-gray-700">{e.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {education.length > 0 && (
        <section className="mt-5">
          <SectionTitle>Education</SectionTitle>
          <div className="space-y-2">
            {education.map((e) => (
              <div key={e.id} className="flex items-baseline justify-between gap-2">
                <p className="text-[12px] text-gray-800">
                  <span className="font-semibold text-gray-900">{e.school || "School"}</span>
                  {(e.degree || e.field) && (
                    <span className="text-gray-600">
                      {" "}
                      — {[e.degree, e.field].filter(Boolean).join(", ")}
                    </span>
                  )}
                </p>
                <p className="shrink-0 text-[10.5px] text-gray-500">{fmtMonth(e.gradDate)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="mt-5">
          <SectionTitle>Skills</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span
                key={s.id}
                title={s.verified ? "Verified by JEMS" : undefined}
                className={`rounded px-2 py-0.5 text-[11px] ${s.verified ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-gray-100 text-gray-700"}`}
              >
                {s.verified ? "✓ " : ""}{s.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mt-5">
          <SectionTitle>Projects</SectionTitle>
          <div className="space-y-2">
            {projects.map((p) => (
              <div key={p.id}>
                <p className="text-[12px] font-semibold text-gray-900">
                  {p.name}
                  {p.link && <span className="font-normal text-gray-500"> · {p.link}</span>}
                </p>
                {p.description && <p className="text-[11.5px] leading-5 text-gray-700">{p.description}</p>}
                {p.tech && <p className="text-[10.5px] italic text-gray-500">{p.tech}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {certs.length > 0 && (
        <section className="mt-5">
          <SectionTitle>Certifications</SectionTitle>
          <div className="space-y-1">
            {certs.map((c) => (
              <div key={c.id} className="flex items-baseline justify-between gap-2">
                <p className="text-[12px] text-gray-800">
                  <span className="font-medium text-gray-900">{c.name}</span>
                  {c.org && <span className="text-gray-600"> · {c.org}</span>}
                </p>
                <p className="shrink-0 text-[10.5px] text-gray-500">{fmtMonth(c.issueDate)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
