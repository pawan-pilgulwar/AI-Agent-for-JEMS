"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { EventHandler, Step } from "react-joyride";
import { TourTooltip } from "./TourTooltip";
import { TOURS, type TourId } from "./tours";

// Joyride measures the DOM, so it's client-only.
const Joyride = dynamic(
  () => import("react-joyride").then((m) => ({ default: m.Joyride })),
  { ssr: false },
);

interface TourContextValue {
  active: TourId | null;
  start: (id: TourId) => void;
  stop: () => void;
  /** True once the tour has been finished or skipped on this browser. */
  hasSeen: (id: TourId) => boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

// Bump the version when a tour is rewritten so it autostarts once more.
const seenKey = (id: TourId) => `jems.tour.${id}.v2.seen`;

/** Polls until `selector` exists in the DOM (and we're on `route`, if given). */
function waitForTarget(selector: string, route?: string, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      // A route may redirect to a sub-route (e.g. /student/roadmap → …/goals
      // before goals are set), so accept the route itself or anything under it.
      const path = window.location.pathname;
      const onRoute = !route || path === route || path.startsWith(route + "/");
      if ((onRoute && document.querySelector(selector)) || Date.now() - started > timeoutMs) {
        resolve();
        return;
      }
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

/**
 * Drives the guided tours defined in `tours.ts`. Lives at the root so a tour
 * can carry on across client-side navigations: a step with a `route` pushes
 * that route in its `before` hook and resolves once the target has mounted.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState<TourId | null>(null);
  // Bumped on every start so a re-run of the same tour remounts Joyride.
  const [runId, setRunId] = useState(0);

  const start = useCallback((id: TourId) => {
    setActive(id);
    setRunId((n) => n + 1);
  }, []);

  const stop = useCallback(() => setActive(null), []);

  const hasSeen = useCallback((id: TourId) => {
    try {
      return window.localStorage.getItem(seenKey(id)) === "1";
    } catch {
      return false;
    }
  }, []);

  const steps = useMemo<Step[]>(() => {
    if (!active) return [];
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    return TOURS[active].steps.filter((s) => desktop || !s.desktopOnly).map((s) => ({
      target: s.target,
      title: s.title,
      content: s.content,
      placement: s.placement ?? "bottom",
      spotlightTarget: s.spotlight,
      data: { pillar: s.pillar },
      before: async () => {
        if (s.route && window.location.pathname !== s.route) router.push(s.route);
        await waitForTarget(s.target, s.route);
      },
    }));
  }, [active, router]);

  const onEvent: EventHandler = useCallback(
    (data, controls) => {
      if (data.type === "error:target_not_found" || data.type === "error") {
        // e.g. the sidebar on a phone, or a page that took too long — skip
        // the step rather than stall the whole tour.
        controls.next();
        return;
      }
      if (data.type === "tour:end") {
        if (active) {
          try {
            window.localStorage.setItem(seenKey(active), "1");
          } catch {}
        }
        setActive(null);
      }
    },
    [active],
  );

  const value = useMemo(() => ({ active, start, stop, hasSeen }), [active, start, stop, hasSeen]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && (
        <Joyride
          key={runId}
          run
          continuous
          scrollToFirstStep
          steps={steps}
          onEvent={onEvent}
          tooltipComponent={TourTooltip}
          options={{
            zIndex: 10000,
            skipBeacon: true,
            overlayColor: "rgba(17, 24, 39, 0.55)",
            spotlightRadius: 16,
            spotlightPadding: 8,
            scrollOffset: 96,
            overlayClickAction: false,
            beforeTimeout: 9000,
            targetWaitTimeout: 3000,
            arrowColor: "#ffffff",
          }}
        />
      )}
    </TourContext.Provider>
  );
}

/** Start/stop tours from anywhere under the provider. */
export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}
