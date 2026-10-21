"use client";

import { useState } from "react";
import {
  type LucideIcon,
  ChevronDown,
  CreditCard,
  FileText,
  LifeBuoy,
  Mic,
  Rocket,
  Search,
  Target,
  User,
} from "lucide-react";
import Link from "next/link";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card } from "@/components/dashboard/student/ui";

interface Category {
  title: string;
  desc: string;
  count: number;
  icon: LucideIcon;
}

const CATEGORIES: Category[] = [
  { title: "Getting Started", desc: "Set up your account", count: 8, icon: Rocket },
  { title: "Resume Builder", desc: "Build & optimize resumes", count: 12, icon: FileText },
  { title: "Mock Interviews", desc: "Practice & AI feedback", count: 9, icon: Mic },
  { title: "Job Matching", desc: "Find & apply to roles", count: 7, icon: Target },
  { title: "Account & Profile", desc: "Manage your profile", count: 6, icon: User },
  { title: "Billing & Plans", desc: "Payments & Pro", count: 5, icon: CreditCard },
];

const POPULAR = [
  "How is my ATS resume score calculated?",
  "How do mock interview scores work?",
  "How do I improve my job match percentage?",
  "Can I create multiple resume versions?",
  "How do I connect my LinkedIn profile?",
];

const FAQS = [
  {
    q: "How does Jems match me with jobs?",
    a: "We compare your skills, experience and target role against open roles to produce a match score, and highlight the exact skills to add to improve it.",
  },
  {
    q: "Is the resume builder really ATS-friendly?",
    a: "Yes. The builder uses a clean, single-column structure and gives you a live ATS score with concrete suggestions as you edit.",
  },
  {
    q: "How many mock interviews can I take?",
    a: "Free accounts include 10 mock interviews per month. Pro accounts get unlimited interviews with detailed AI feedback.",
  },
  {
    q: "How do I upgrade or cancel my plan?",
    a: "Go to Settings → Billing. You can upgrade, downgrade or cancel anytime — changes take effect at the end of the billing cycle.",
  },
];

export default function HelpCenter() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Search hero */}
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold text-navy">How can we help?</h2>
          <p className="mt-1 text-sm text-mediumgray">
            Search our guides or browse the categories below.
          </p>
          <div className="relative mx-auto mt-5 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mediumgray" />
            <input
              type="search"
              placeholder="Search for articles…"
              className="h-12 w-full rounded-xl border border-lightgray bg-white pl-11 pr-4 text-sm text-navy outline-none transition-colors placeholder:text-mediumgray focus:border-slate focus:ring-2 focus:ring-slate/15"
            />
          </div>
        </Card>

        {/* Categories */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.title} className="flex items-start gap-4 p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate/10 text-slate">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-navy">{c.title}</h3>
                  <p className="text-xs text-mediumgray">{c.desc}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate">{c.count} articles</p>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Popular */}
          <Card>
            <div className="border-b border-lightgray px-5 py-3.5">
              <h2 className="text-sm font-semibold text-navy">Popular articles</h2>
            </div>
            <ul className="divide-y divide-lightgray">
              {POPULAR.map((a) => (
                <li key={a}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm text-navy transition-colors hover:bg-surface-2"
                  >
                    {a}
                    <ChevronDown className="h-4 w-4 -rotate-90 text-mediumgray" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* FAQ accordion */}
          <Card>
            <div className="border-b border-lightgray px-5 py-3.5">
              <h2 className="text-sm font-semibold text-navy">Frequently asked</h2>
            </div>
            <ul className="divide-y divide-lightgray">
              {FAQS.map((f, i) => {
                const isOpen = open === i;
                return (
                  <li key={f.q}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-medium text-navy"
                    >
                      {f.q}
                      <ChevronDown className={`h-4 w-4 shrink-0 text-mediumgray transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <p className="px-5 pb-4 text-sm leading-6 text-mediumgray">{f.a}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        {/* Still need help */}
        <Card className="flex flex-col items-center justify-between gap-4 p-6 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/10 text-orange">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-navy">Still need help?</p>
              <p className="text-xs text-mediumgray">Our support team replies within a few hours.</p>
            </div>
          </div>
          <Link
            href="/student/support"
            className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f2937]"
          >
            Contact Support
          </Link>
        </Card>
      </DashboardContainer>
    </DashboardShell>
  );
}
