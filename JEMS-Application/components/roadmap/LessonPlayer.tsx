"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { Slide } from "@/lib/roadmap/lesson";
import SlidePlayer, { SLIDE_SCREEN } from "./SlidePlayer";

/**
 * "Video" lesson player for the career roadmap. Fetches the generated slide
 * script for one lesson and plays it with SlidePlayer (narrated with the
 * browser Speech API). `onComplete` fires once when the narration reaches the
 * end of the deck.
 */
export default function LessonPlayer({
  careerPath,
  moduleId,
  lessonIndex,
  lessonTitle,
  watched = false,
  onComplete,
}: {
  careerPath: string;
  moduleId: number;
  lessonIndex: number;
  lessonTitle: string;
  watched?: boolean;
  onComplete?: () => void;
}) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // ── Fetch the generated lesson ──
  // The parent keys this component on the lesson, so a lesson change is a
  // fresh mount and all state starts from its initial value.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/student/roadmap/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ careerPath, moduleId, lessonIndex }),
    })
      .then((r) => r.json())
      .then((d: { slides?: Slide[]; aiGenerated?: boolean; error?: string }) => {
        if (cancelled) return;
        if (!d?.slides?.length) throw new Error(d?.error || "No content returned");
        setSlides(d.slides);
        setAiGenerated(!!d.aiGenerated);
      })
      .catch(() => !cancelled && setError("Couldn't load this lesson. Please try again."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [careerPath, moduleId, lessonIndex, reloadKey]);

  if (loading) {
    return (
      <div className={`${SLIDE_SCREEN} items-center justify-center`}>
        <LoaderCircle className="h-10 w-10 animate-spin text-slate" />
        <p className="mt-3 text-sm font-medium">Generating your lesson…</p>
        <p className="mt-1 text-xs text-white/60">Writing the script for &ldquo;{lessonTitle}&rdquo;</p>
      </div>
    );
  }

  if (error || slides.length === 0) {
    return (
      <div className={`${SLIDE_SCREEN} items-center justify-center px-6 text-center`}>
        <p className="text-sm font-medium">{error || "No lesson content available."}</p>
        <button
          type="button"
          onClick={() => {
            setError("");
            setLoading(true);
            setReloadKey((k) => k + 1);
          }}
          className="mt-3 text-xs font-semibold text-slate underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <SlidePlayer
      key={reloadKey}
      slides={slides}
      lessonTitle={lessonTitle}
      badge={aiGenerated ? "AI generated" : "Auto lesson"}
      watched={watched}
      onComplete={onComplete}
    />
  );
}
