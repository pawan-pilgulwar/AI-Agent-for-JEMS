"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Briefcase,
  Camera,
  Check,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import DashboardShell, { DashboardContainer } from "./DashboardShell";
import PortfolioView from "@/components/portfolio/PortfolioView";
import type { Portfolio } from "@/lib/db/portfolio";
import type { StudentProfileView } from "@/lib/db/student-data";

type IconType = React.ComponentType<{ className?: string }>;

/** Brand glyphs (lucide dropped brand icons in this version). */
const LinkedinIcon: IconType = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);
const GithubIcon: IconType = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.38-1.34-1.75-1.34-1.75-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
  </svg>
);

/** A built-in gallery of avatars the user can pick from (DiceBear). */
const AVATAR_SEEDS = [
  "Felix", "Aneka", "Milo", "Zoe", "Kai", "Luna",
  "Rex", "Nova", "Theo", "Ivy", "Atlas", "Mira",
  "Jett", "Sora", "Bo",
];
const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ffd5dc,c0aede,d1d4f9,b6e3f4,ffdfbf`;

const TABS = ["Profile", "Portfolio", "Activity", "Saved Jobs", "Settings"] as const;
/** Tabs rendered on this page; the rest link out to their own routes. */
type LocalTab = "Profile" | "Portfolio";
const TAB_LINKS: Record<string, string> = {
  Activity: "/student/progress",
  "Saved Jobs": "/student/saved",
  Settings: "/student/settings",
};

const SOCIALS = [
  { Icon: Phone, tone: "bg-emerald", label: "Call", href: (_p: StudentProfileView, f: Form) => (f.phone ? `tel:${f.phone.replace(/\s+/g, "")}` : "") },
  { Icon: Mail, tone: "bg-orange", label: "Email", href: (p: StudentProfileView) => (p.email ? `mailto:${p.email}` : "") },
  { Icon: Send, tone: "bg-slate", label: "Telegram", href: (_p: StudentProfileView, f: Form) => (f.telegram ? `https://t.me/${f.telegram.replace(/^@/, "")}` : "") },
];

/** A labelled, controlled text input matching the form style. */
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  disabled,
  Icon,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  Icon?: IconType;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-navy">
        {label}
        {required && <span className="text-orange"> *</span>}
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mediumgray" />
        )}
        <input
          type={type}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border border-lightgray bg-white pr-3.5 text-sm text-navy outline-none transition-colors placeholder:text-mediumgray focus:border-slate focus:ring-2 focus:ring-slate/15 disabled:bg-surface disabled:text-mediumgray ${
            Icon ? "pl-9" : "pl-3.5"
          }`}
        />
      </div>
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-wide text-mediumgray">
      {children}
    </h3>
  );
}

interface ProfileStats {
  applications: number;
  matches: number;
  interviews: number;
  verifiedSkills: number;
}

/** Local, editable copy of the persisted profile. */
type Form = {
  firstName: string;
  lastName: string;
  username: string;
  nickname: string;
  displayName: string;
  displayRole: string;
  bio: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  whatsapp: string;
  telegram: string;
  phone: string;
  targetRole: string;
  avatar: string;
};

function toForm(p: StudentProfileView): Form {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    username: p.username,
    nickname: p.nickname,
    displayName: p.displayName,
    displayRole: p.displayRole,
    bio: p.bio,
    location: p.location,
    website: p.website,
    linkedin: p.linkedin,
    github: p.github,
    whatsapp: p.whatsapp,
    telegram: p.telegram,
    phone: p.phone,
    targetRole: p.targetRole,
    avatar: p.avatar || avatarUrl("Felix"),
  };
}

export default function ProfilePage({
  profile,
  portfolio,
  shareUrl,
  stats,
  initialTab = "Profile",
}: {
  profile: StudentProfileView;
  portfolio: Portfolio;
  shareUrl: string;
  stats: ProfileStats;
  initialTab?: LocalTab;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<LocalTab>(initialTab);

  // Keep the tab in the URL so a refresh (or a shared link) lands on it.
  const switchTab = (tab: LocalTab) => {
    setActiveTab(tab);
    const url = tab === "Portfolio" ? "/student/profile?tab=portfolio" : "/student/profile";
    window.history.replaceState(null, "", url);
  };

  // `saved` is the last persisted snapshot; `form` is the working copy.
  const [saved, setSaved] = useState<Form>(() => toForm(profile));
  const [form, setForm] = useState<Form>(() => toForm(profile));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  };

  const dirty = (Object.keys(form) as (keyof Form)[]).some(
    (k) => form[k] !== saved[k],
  );

  const STAT_TILES = [
    { label: "Applications", value: String(stats.applications), Icon: Briefcase },
    { label: "Job Matches", value: String(stats.matches), Icon: Target },
    { label: "Interviews", value: String(stats.interviews), Icon: Check },
    { label: "Verified skills", value: String(stats.verifiedSkills), Icon: BadgeCheck },
  ];

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("avatar", reader.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("save failed");
      const { profile: updated } = (await res.json()) as {
        profile: StudentProfileView;
      };
      const next = toForm(updated);
      setSaved(next);
      setForm(next);
      setStatus("saved");
      // Refresh the layout so the sidebar / top-bar pick up the new name.
      router.refresh();
    } catch {
      setStatus("error");
    }
  };

  const onCancel = () => {
    setForm(saved);
    setStatus("idle");
  };

  const displayName = form.displayName || `${form.firstName} ${form.lastName}`.trim();
  const displayTitle = form.targetRole ? `Aspiring ${form.targetRole}` : profile.title;

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Cover + identity */}
        <div className="overflow-hidden rounded-2xl border border-lightgray bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="h-40 bg-[linear-gradient(120deg,#c7d2fe_0%,#a5b4fc_45%,#bae6fd_100%)] sm:h-48" />

          <div className="px-5 pb-5 sm:px-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              {/* Stats: four even columns on phones, a loose row from sm up */}
              <div className="order-2 grid grid-cols-4 gap-2 sm:order-1 sm:flex sm:gap-6">
                {STAT_TILES.map((s) => (
                  <div key={s.label} className="min-w-0 text-center">
                    <s.Icon className="mx-auto mb-1 h-5 w-5 text-slate" />
                    <p className="text-xl font-bold text-navy">{s.value}</p>
                    <p className="text-xs leading-tight text-mediumgray">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Avatar */}
              <div className="order-1 -mt-16 flex flex-col items-center sm:order-2 sm:-mt-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.avatar}
                  alt="Profile avatar"
                  className="h-28 w-28 rounded-full border-4 border-white bg-white object-cover shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                />
                <p className="mt-2 text-base font-bold text-navy">
                  {displayName || "Your name"}
                </p>
                <p className="text-xs text-mediumgray">{displayTitle}</p>
              </div>

              {/* Socials */}
              <div className="order-3 flex items-center justify-center gap-2 sm:justify-end">
                {SOCIALS.map(({ Icon, tone, label, href }) => {
                  const url = href(profile, saved);
                  const cls = `flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform ${tone}`;
                  // Only contact details that are actually saved are clickable.
                  return url ? (
                    <a key={label} href={url} target={url.startsWith("https:") ? "_blank" : undefined} rel="noreferrer" aria-label={label} className={`${cls} hover:scale-110`}>
                      <Icon className="h-4 w-4" />
                    </a>
                  ) : (
                    <span key={label} aria-label={`${label} (not added yet)`} title={`Add your ${label === "Call" ? "phone" : label.toLowerCase()} below`} className={`${cls} opacity-40`}>
                      <Icon className="h-4 w-4" />
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-5 flex gap-1 overflow-x-auto border-t border-lightgray pt-3">
              {TABS.map((tab) =>
                tab === "Profile" || tab === "Portfolio" ? (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => switchTab(tab)}
                    className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "bg-slate/10 text-slate"
                        : "text-mediumgray hover:bg-surface hover:text-navy"
                    }`}
                  >
                    {tab}
                  </button>
                ) : (
                  <Link
                    key={tab}
                    href={TAB_LINKS[tab]}
                    className="shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium text-mediumgray transition-colors hover:bg-surface hover:text-navy"
                  >
                    {tab}
                  </Link>
                ),
              )}
            </div>
          </div>
        </div>

        {activeTab === "Portfolio" && <PortfolioView data={portfolio} shareUrl={shareUrl} />}

        {/* Account management + profile information */}
        {activeTab === "Profile" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: account management */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-lightgray bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <SectionTitle>Account Management</SectionTitle>

              {/* Current photo */}
              <div className="relative mx-auto mt-4 aspect-square w-full max-w-[260px] overflow-hidden rounded-2xl bg-surface lg:max-w-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.avatar}
                  alt="Selected avatar"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => set("avatar", avatarUrl("Felix"))}
                  aria-label="Reset photo"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-navy/60 text-white backdrop-blur transition-colors hover:bg-navy/80"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Upload */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-lightgray py-3 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate"
              >
                <Upload className="h-4 w-4" />
                Upload Photo
              </button>

              {/* Avatar gallery */}
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-navy">
                  <Camera className="h-4 w-4 text-mediumgray" />
                  Or pick an avatar
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {AVATAR_SEEDS.map((seed) => {
                    const url = avatarUrl(seed);
                    const selected = form.avatar === url;
                    return (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => set("avatar", url)}
                        aria-label={`Avatar ${seed}`}
                        className={`relative aspect-square overflow-hidden rounded-full bg-surface transition-transform hover:scale-110 ${
                          selected
                            ? "ring-2 ring-slate ring-offset-2"
                            : "ring-1 ring-lightgray"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={seed} className="h-full w-full object-cover" />
                        {selected && (
                          <span className="absolute inset-0 flex items-center justify-center bg-slate/30">
                            <Check className="h-4 w-4 text-white" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right: profile information */}
          <div className="lg:col-span-2">
            <form
              onSubmit={onSubmit}
              className="space-y-8 rounded-2xl border border-lightgray bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              {/* Profile information */}
              <div>
                <SectionTitle>Profile Information</SectionTitle>
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Username" value={form.username} onChange={(v) => set("username", v)} />
                  <Field label="First Name" value={form.firstName} onChange={(v) => set("firstName", v)} />
                  <Field label="Nickname" value={form.nickname} onChange={(v) => set("nickname", v)} placeholder="What should we call you?" />
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-navy">Role</span>
                    <select
                      value={form.displayRole}
                      onChange={(e) => set("displayRole", e.target.value)}
                      className="h-11 w-full rounded-xl border border-lightgray bg-white px-3 text-sm text-navy outline-none transition-colors focus:border-slate focus:ring-2 focus:ring-slate/15"
                    >
                      <option>Student</option>
                      <option>Job Seeker</option>
                      <option>Mentor</option>
                    </select>
                  </label>
                  <Field label="Last Name" value={form.lastName} onChange={(v) => set("lastName", v)} />
                  <Field label="Display Name Publicly as" value={form.displayName} onChange={(v) => set("displayName", v)} />
                  <Field label="Target Role" value={form.targetRole} onChange={(v) => set("targetRole", v)} placeholder="Frontend Developer" />
                </div>
              </div>

              {/* Contact info */}
              <div>
                <SectionTitle>Contact Info</SectionTitle>
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Email" type="email" value={profile.email} disabled required />
                  <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+91 98765 43210" />
                  <Field label="Website" value={form.website} onChange={(v) => set("website", v)} placeholder="your-site.dev" />
                  <Field label="Location" value={form.location} onChange={(v) => set("location", v)} placeholder="City, Country" />
                  <Field
                    label="LinkedIn"
                    type="url"
                    Icon={LinkedinIcon}
                    value={form.linkedin}
                    onChange={(v) => set("linkedin", v)}
                    placeholder="https://linkedin.com/in/your-profile"
                  />
                  <Field
                    label="GitHub"
                    type="url"
                    Icon={GithubIcon}
                    value={form.github}
                    onChange={(v) => set("github", v)}
                    placeholder="https://github.com/your-username"
                  />
                  <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} placeholder="@your-handle" />
                  <Field label="Telegram" value={form.telegram} onChange={(v) => set("telegram", v)} placeholder="@your-handle" />
                </div>
              </div>

              {/* About */}
              <div>
                <SectionTitle>About the User</SectionTitle>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-sm font-medium text-navy">
                    Biographical Info
                  </span>
                  <textarea
                    rows={5}
                    value={form.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    placeholder="Tell employers a little about yourself — your focus, strengths and what you're looking for."
                    className="w-full resize-y rounded-xl border border-lightgray bg-white p-3.5 text-sm text-navy outline-none transition-colors placeholder:text-mediumgray focus:border-slate focus:ring-2 focus:ring-slate/15"
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-mediumgray">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {form.location || "Add location"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="h-4 w-4" /> {form.website || "Add website"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-lightgray pt-5">
                {status === "saved" && (
                  <span className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-emerald">
                    <Check className="h-4 w-4" /> Saved
                  </span>
                )}
                {status === "error" && (
                  <span className="mr-auto text-sm font-medium text-orange">
                    Couldn&apos;t save — try again.
                  </span>
                )}
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={!dirty || status === "saving"}
                  className="rounded-xl border border-lightgray px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-surface disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!dirty || status === "saving"}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
                >
                  {status === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {status === "saving" ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
        )}
      </DashboardContainer>
    </DashboardShell>
  );
}
