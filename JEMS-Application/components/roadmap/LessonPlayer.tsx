"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Slide } from "@/lib/roadmap/lesson";

/**
 * "Video" lesson player. Fetches the generated slide script for one lesson,
 * renders the slides, and narrates them with the browser Speech API.
 * `onComplete` fires once when the narration reaches the end of the deck.
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
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Refs so the speech `onend` callback always sees the latest values.
  const idxRef = useRef(0);
  const playingRef = useRef(false);
  const mutedRef = useRef(false);
  const slidesRef = useRef<Slide[]>([]);
  const onCompleteRef = useRef(onComplete);
  const firedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

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
        slidesRef.current = d.slides;
        setAiGenerated(!!d.aiGenerated);
        setIdx(0);
        idxRef.current = 0;
      })
      .catch(() => !cancelled && setError("Couldn't load this lesson. Please try again."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
      cancelSpeech();
    };
  }, [careerPath, moduleId, lessonIndex, reloadKey, cancelSpeech]);

  // Stop narration if the component unmounts.
  useEffect(() => () => cancelSpeech(), [cancelSpeech]);

  const finish = () => {
    playingRef.current = false;
    setPlaying(false);
    if (!firedRef.current) {
      firedRef.current = true;
      onCompleteRef.current?.();
    }
  };

  const speak = (i: number) => {
    const s = slidesRef.current[i];
    if (!s) return;
    if (!speechSupported || mutedRef.current) {
      // No narration: auto-advance on a timer so "play" still walks the deck.
      window.setTimeout(() => {
        if (!playingRef.current || idxRef.current !== i) return;
        if (i < slidesRef.current.length - 1) {
          idxRef.current = i + 1;
          setIdx(i + 1);
          speak(i + 1);
        } else {
          finish();
        }
      }, 4000);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`${s.title}. ${s.narration}`);
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => {
      if (!playingRef.current) return;
      if (i < slidesRef.current.length - 1) {
        const next = i + 1;
        idxRef.current = next;
        setIdx(next);
        speak(next);
      } else {
        finish();
      }
    };
    window.speechSynthesis.speak(u);
  };

  const play = () => {
    if (slides.length === 0) return;
    playingRef.current = true;
    setPlaying(true);
    speak(idxRef.current);
  };

  const pause = () => {
    playingRef.current = false;
    setPlaying(false);
    cancelSpeech();
  };

  const restart = () => {
    cancelSpeech();
    idxRef.current = 0;
    setIdx(0);
    playingRef.current = true;
    setPlaying(true);
    speak(0);
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= slides.length) return;
    idxRef.current = i;
    setIdx(i);
    if (playingRef.current) speak(i);
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      if (next) cancelSpeech();
      else if (playingRef.current) speak(idxRef.current);
      return next;
    });
  };

  const screen = "flex aspect-video flex-col bg-gradient-to-br from-navy via-[#1f2937] to-[#3b2a1a] text-white";

  if (loading) {
    return (
      <div className={`${screen} items-center justify-center`}>
        <LoaderCircle className="h-10 w-10 animate-spin text-slate" />
        <p className="mt-3 text-sm font-medium">Generating your lesson…</p>
        <p className="mt-1 text-xs text-white/60">Writing the script for &ldquo;{lessonTitle}&rdquo;</p>
      </div>
    );
  }

  if (error || slides.length === 0) {
    return (
      <div className={`${screen} items-center justify-center px-6 text-center`}>
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

  const slide = slides[idx];

  return (
    <div>
      <div className={`${screen} relative overflow-hidden`}>
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
            <Sparkles className="h-3 w-3" /> {aiGenerated ? "AI generated" : "Auto lesson"}
          </span>
          {playing && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/90 px-2.5 py-1 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Narrating
            </span>
          )}
          {watched && !playing && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald/90 px-2.5 py-1 text-[11px] font-semibold">
              <CircleCheck className="h-3 w-3" /> Watched
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 md:px-14">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate">
            Slide {idx + 1} of {slides.length}
          </p>
          <h3 className="mb-4 text-xl font-bold leading-tight sm:text-2xl md:text-3xl">{slide.title}</h3>
          <ul className="max-w-2xl space-y-2">
            {slide.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-white/85 md:text-base">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-1 px-4 pb-3">
          {slides.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= idx ? "bg-slate" : "bg-white/20"}`} />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-lightgray bg-white px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goTo(idx - 1)}
            disabled={idx === 0}
            aria-label="Previous slide"
            className="flex h-9 w-9 items-center justify-center rounded-full text-navy transition-colors hover:bg-surface disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={playing ? pause : play}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-gradient text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => goTo(idx + 1)}
            disabled={idx === slides.length - 1}
            aria-label="Next slide"
            className="flex h-9 w-9 items-center justify-center rounded-full text-navy transition-colors hover:bg-surface disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={restart}
            aria-label="Restart"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-navy transition-colors hover:bg-surface"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden truncate text-xs text-mediumgray sm:block">{lessonTitle}</span>
          {speechSupported ? (
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute narration" : "Mute narration"}
              className="flex h-9 w-9 items-center justify-center rounded-full text-navy transition-colors hover:bg-surface"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          ) : (
            <span className="text-[11px] text-mediumgray">Narration not supported here</span>
          )}
        </div>
      </div>
    </div>
  );
}
