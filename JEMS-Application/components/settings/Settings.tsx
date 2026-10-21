"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Check, LoaderCircle } from "lucide-react";
import DashboardShell from "@/components/dashboard/student/DashboardShell";
import { Card, Toggle } from "@/components/dashboard/student/ui";
import { useStudent } from "@/components/dashboard/student/StudentContext";
import type { StudentSettings } from "@/lib/db/student-actions";

const inputClass =
  "h-11 w-full rounded-lg border border-lightgray bg-white px-3 text-sm text-navy outline-none transition-colors placeholder:text-mediumgray focus:border-slate focus:ring-2 focus:ring-slate/15 disabled:bg-surface-2 disabled:text-mediumgray";

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  hint,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  hint?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-navy">{label}</span>
      <input type={type} value={value} disabled={disabled} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      {hint && <span className="mt-1 block text-[11px] text-mediumgray">{hint}</span>}
    </label>
  );
}

function SettingsCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      {desc && <p className="mt-0.5 text-xs text-mediumgray">{desc}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

const NOTIFS = [
  { key: "matches", label: "New job matches", desc: "When roles match your profile" },
  { key: "interviews", label: "Interview reminders", desc: "Upcoming mock interviews" },
  { key: "summary", label: "Weekly summary", desc: "Your progress digest every Monday" },
  { key: "product", label: "Product news", desc: "Features and announcements" },
] as const;

export default function Settings({ initial }: { initial: StudentSettings }) {
  const student = useStudent();
  const router = useRouter();
  const [fullName, setFullName] = useState(student.name);
  const [targetRole, setTargetRole] = useState(student.targetRole ?? "");
  const [location, setLocation] = useState(student.location);
  const [notifs, setNotifs] = useState(initial.notifications);
  const [desiredRole, setDesiredRole] = useState(initial.jobPrefs.desiredRole);
  const [expectedSalary, setExpectedSalary] = useState(initial.jobPrefs.expectedSalary);
  const [remoteOnly, setRemoteOnly] = useState(initial.jobPrefs.remoteOnly);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch("/api/student/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          targetRole,
          location,
          notifications: notifs,
          jobPrefs: { desiredRole, expectedSalary, remoteOnly },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save your settings.");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      // Name / role show in the sidebar and top bar — refresh the server data.
      router.refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save your settings.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwBusy(true);
    setPwMsg(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pw),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not change your password.");
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ ok: true, text: "Password updated." });
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : "Could not change your password." });
    } finally {
      setPwBusy(false);
    }
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm(
      "Permanently delete your account and all of your data? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setDeleteError(data.error ?? "Could not delete your account.");
        setDeleting(false);
        return;
      }
      // Account gone — drop the session and return to the landing page.
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleteError("Network error. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Account */}
        <SettingsCard title="Account" desc="Update your personal details.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
            <Field label="Email" type="email" value={student.email} onChange={() => {}} disabled hint="Your email is your login and can't be changed here." />
            <Field label="Target role" value={targetRole} onChange={setTargetRole} hint="Shown as “Aspiring …” on your profile." />
            <Field label="Location" value={location} onChange={setLocation} autoComplete="address-level2" />
          </div>
        </SettingsCard>

        {/* Notifications */}
        <SettingsCard title="Notifications" desc="Choose what we email you about. AI task results always appear under the bell.">
          <ul className="divide-y divide-lightgray">
            {NOTIFS.map((n) => (
              <li key={n.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-navy">{n.label}</p>
                  <p className="text-xs text-mediumgray">{n.desc}</p>
                </div>
                <Toggle
                  checked={notifs[n.key]}
                  onChange={(v) => setNotifs((prev) => ({ ...prev, [n.key]: v }))}
                />
              </li>
            ))}
          </ul>
        </SettingsCard>

        {/* Job preferences */}
        <SettingsCard title="Job preferences" desc="Tune how we match you with roles.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Desired role" value={desiredRole} onChange={setDesiredRole} />
            <Field label="Expected salary" value={expectedSalary} onChange={setExpectedSalary} hint="e.g. ₹6–8 LPA" />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-navy">Remote roles only</p>
              <p className="text-xs text-mediumgray">Job Matches opens on remote-friendly jobs</p>
            </div>
            <Toggle checked={remoteOnly} onChange={setRemoteOnly} />
          </div>
        </SettingsCard>

        {/* Save bar */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald">
              <Check className="h-4 w-4" />
              Changes saved
            </span>
          )}
          {saveError && <span className="text-sm font-medium text-red-600">{saveError}</span>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>

        {/* Password */}
        <SettingsCard title="Password" desc="Use 8+ characters with upper and lowercase letters, a number and a symbol.">
          <form onSubmit={changePassword}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Current" type="password" value={pw.current} onChange={(v) => setPw((p) => ({ ...p, current: v }))} autoComplete="current-password" hint="Leave empty if you signed up with GitHub." />
              <Field label="New" type="password" value={pw.next} onChange={(v) => setPw((p) => ({ ...p, next: v }))} autoComplete="new-password" />
              <Field label="Confirm" type="password" value={pw.confirm} onChange={(v) => setPw((p) => ({ ...p, confirm: v }))} autoComplete="new-password" />
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              {pwMsg && <span className={`text-sm font-medium ${pwMsg.ok ? "text-emerald" : "text-red-600"}`}>{pwMsg.text}</span>}
              <button
                type="submit"
                disabled={pwBusy || !pw.next || !pw.confirm}
                className="inline-flex items-center gap-2 rounded-lg border border-lightgray bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate disabled:opacity-60"
              >
                {pwBusy && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Update password
              </button>
            </div>
          </form>
        </SettingsCard>

        {/* Danger zone */}
        <Card className="border-[#fecaca] p-6">
          <h2 className="text-sm font-semibold text-[#EF4444]">Danger zone</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-mediumgray">
              Permanently delete your account and all of your data.
            </p>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting}
              className="shrink-0 self-start rounded-lg border border-[#EF4444] px-4 py-2 text-sm font-semibold text-[#EF4444] transition-colors hover:bg-[#fee2e2] disabled:opacity-60 sm:self-auto"
            >
              {deleting ? "Deleting…" : "Delete account"}
            </button>
          </div>
          {deleteError && (
            <p className="mt-3 text-xs font-medium text-[#EF4444]">{deleteError}</p>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
