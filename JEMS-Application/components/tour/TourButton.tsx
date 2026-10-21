"use client";

import { PlayCircle } from "lucide-react";
import { useTour } from "./TourProvider";
import type { TourId } from "./tours";

/** "Take the tour" trigger. Renders as a plain button; style it via className. */
export default function TourButton({
  tour,
  className = "",
  children = "Take the tour",
}: {
  tour: TourId;
  className?: string;
  children?: React.ReactNode;
}) {
  const { start } = useTour();
  return (
    <button type="button" onClick={() => start(tour)} className={className}>
      <PlayCircle className="h-4 w-4" />
      {children}
    </button>
  );
}
