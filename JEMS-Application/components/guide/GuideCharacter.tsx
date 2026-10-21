"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";

type Section = "hero" | "problem" | "how-it-works" | "features" | "innovation" | "impact";

interface SectionMessage {
  title: string;
  message: string;
  action?: {
    text: string;
    url: string;
  };
}

const messages: Record<Section, SectionMessage> = {
  hero: {
    title: "Welcome to JEMS!",
    message: "I'm your guide. Let me show you how to bridge the gap between education and industry with verified skills, AI-powered roadmaps, and easy job matching.",
    action: { text: "See how", url: "#problem" },
  },
  problem: {
    title: "The Problem",
    message: "Student records are scattered. Skills go unverified. Students, faculty, industry and institutions operate in silos. JEMS brings everyone together.",
    action: { text: "The Solution", url: "#how-it-works" },
  },
  "how-it-works": {
    title: "How JEMS Works",
    message: "7 simple steps: Companies post requirements → Students add skills → Gaps identified → AI roadmap created → Skills verified → Matches ranked → Jobs offered!",
    action: { text: "Explore Features", url: "#features" },
  },
  features: {
    title: "Powerful Features",
    message: "Assessment-verified skills, personalised AI roadmaps, easy job matching, activity tracking — all in one unified platform for students, faculty, industry and institutions.",
    action: { text: "Our Innovation", url: "#innovation" },
  },
  innovation: {
    title: "What Makes Us Unique",
    message: "We're not just a platform. We connect verified ability to career growth. Six core innovations make JEMS the bridge education has been missing.",
    action: { text: "Impact", url: "#impact" },
  },
  impact: {
    title: "Built for Everyone",
    message: "Students get verified portfolios. Faculty get approval tools. Companies get verified shortlists. Institutions get audit-ready reports. One platform, endless value.",
    action: { text: "Get Started", url: "#cta" },
  },
};

export default function GuideCharacter() {
  const [section, setSection] = useState<Section>("hero");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect scroll position and update section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;

      // These thresholds should match your section positions
      if (scrollPos < 600) setSection("hero");
      else if (scrollPos < 1400) setSection("problem");
      else if (scrollPos < 2400) setSection("how-it-works");
      else if (scrollPos < 3400) setSection("features");
      else if (scrollPos < 4400) setSection("innovation");
      else setSection("impact");
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Hide on very small screens
  if (!isVisible || isMobile) return null;

  const currentMessage = messages[section];

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96">
      {/* Animated Entry */}
      <div
        className={`transition-all duration-300 transform ${
          isMinimized ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
      >
        {/* Speech Bubble */}
        <div className="mb-3 animate-slide-up">
          <div className="bg-white rounded-3xl p-6 shadow-[0_20px_40px_rgba(0,0,0,0.1)] border border-navy/10 backdrop-blur-sm">
            {/* Header with minimize */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-lg font-bold text-navy">
                {currentMessage.title}
              </h3>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 hover:bg-navy/5 rounded-lg transition-colors text-navy/60 hover:text-navy"
                aria-label="Minimize"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Message */}
            <p className="text-sm text-ink-soft leading-6 mb-4">
              {currentMessage.message}
            </p>

            {/* Action Button */}
            {currentMessage.action && (
              <a
                href={currentMessage.action.url}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-orange to-orange/80 hover:shadow-lg px-4 py-2 rounded-full transition-all duration-200 hover:-translate-y-0.5"
              >
                {currentMessage.action.text}
                <span>→</span>
              </a>
            )}

            {/* Tail */}
            <div className="absolute bottom-0 right-8 w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-t-6 border-t-white transform translate-y-full" />
          </div>
        </div>

        {/* Spline Character Embed */}
        <div className="rounded-3xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-navy/10 bg-white h-80 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <iframe
            title="JEMS Guide Character"
            src="https://my.spline.design/[REPLACE_WITH_YOUR_SPLINE_URL]"
            frameBorder="0"
            width="100%"
            height="100%"
            style={{ borderRadius: "24px" }}
            loading="lazy"
          />
        </div>

        {/* Section Indicators */}
        <div className="mt-3 flex gap-1.5 justify-center">
          {(Object.keys(messages) as Section[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                const element = document.querySelector(`#${s === "how-it-works" ? "how-it-works" : s}`);
                element?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                section === s
                  ? "w-6 bg-orange"
                  : "w-2 bg-navy/20 hover:bg-navy/40"
              }`}
              aria-label={`Go to ${s}`}
            />
          ))}
        </div>
      </div>

      {/* Minimized State */}
      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-orange to-orange/80 shadow-lg hover:shadow-xl text-white font-bold text-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 hover:-translate-y-1 animate-bounce-subtle"
          aria-label="Open guide"
        >
          👋
        </button>
      )}
    </div>
  );
}
