"use client";

import { useEffect } from "react";
import { useTour } from "./TourProvider";
import type { TourId } from "./tours";

/**
 * Starts `tour` once per browser, the first time this component mounts
 * (e.g. a student's first visit to the dashboard). Replays are always
 * available from the help button.
 */
export default function TourAutostart({ tour, delayMs = 900 }: { tour: TourId; delayMs?: number }) {
  const { start, hasSeen, active } = useTour();
  useEffect(() => {
    if (active || hasSeen(tour)) return;
    const t = window.setTimeout(() => start(tour), delayMs);
    return () => window.clearTimeout(t);
    // Only on mount — re-running on `active` changes would re-arm the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
