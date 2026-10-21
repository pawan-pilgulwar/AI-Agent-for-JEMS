"use client";

import { Award, BookOpen, Flame, Mic, Trophy } from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, ProgressBar } from "@/components/dashboard/student/ui";
import type { ProgressData } from "@/lib/db/student-data";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function MyProgress({ data }: { data: ProgressData }) {
  const TILES = [
    { label: "Lessons completed", value: String(data.lessonsCompleted), icon: BookOpen },
    { label: "Mock interviews", value: String(data.mockInterviews), icon: Mic },
    { label: "Day streak", value: String(data.streak), icon: Flame },
    { label: "Badges earned", value: String(data.badges), icon: Award },
  ];
  const week =
    data.week.length === 7
      ? data.week
      : DAY_LABELS.map((day) => ({ day, v: 0 }));
  const { skills, achievements } = data;

  const readinessNote =
    data.readiness >= 70
      ? "You're interview-ready — keep the momentum."
      : data.readiness > 0
        ? "Keep going — you're on track."
        : "Complete your resume and skills to start building readiness.";

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Readiness */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-navy">Overall job readiness</h2>
              <p className="mt-1 text-xs text-mediumgray">{readinessNote}</p>
            </div>
            <span className="text-2xl font-bold text-slate">{data.readiness}%</span>
          </div>
          <div className="mt-4">
            <ProgressBar value={data.readiness} />
          </div>
        </Card>

        {/* Tiles */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TILES.map((t) => {
            const Icon = t.icon;
            return (
              <Card key={t.label} className="p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate/10 text-slate">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <p className="mt-3 text-2xl font-bold text-navy">{t.value}</p>
                <p className="text-xs text-mediumgray">{t.label}</p>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Weekly activity */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-navy">This week&apos;s activity</h2>
            <div className="mt-5 flex h-40 items-end justify-between gap-3">
              {week.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-md bg-primary-gradient"
                      style={{ height: `${d.v}%` }}
                    />
                  </div>
                  <span className="text-xs text-mediumgray">{d.day}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Skills */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-navy">Skill proficiency</h2>
            {skills.length === 0 ? (
              <p className="mt-4 text-sm text-mediumgray">
                Add skills to your resume to track how your proficiency grows over time.
              </p>
            ) : (
              <ul className="mt-4 space-y-3.5">
                {skills.map((s) => (
                  <li key={s.name}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-navy">{s.name}</span>
                      <span className="text-mediumgray">{s.level}%</span>
                    </div>
                    <ProgressBar value={s.level} barClass="bg-navy" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Achievements */}
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold text-navy">Achievements</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {achievements.map((a) => (
              <div
                key={a.title}
                className={`flex flex-col items-center rounded-xl border p-4 text-center ${
                  a.earned ? "border-lightgray bg-white" : "border-dashed border-lightgray bg-surface-2 opacity-60"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    a.earned ? "bg-gold/15 text-[#b45309]" : "bg-lightgray text-mediumgray"
                  }`}
                >
                  <Award className="h-5 w-5" />
                </span>
                <p className="mt-2 text-xs font-semibold text-navy">{a.title}</p>
                <p className="text-[11px] text-mediumgray">{a.earned ? "Earned" : "Locked"}</p>
              </div>
            ))}
          </div>
        </Card>
      </DashboardContainer>
    </DashboardShell>
  );
}
