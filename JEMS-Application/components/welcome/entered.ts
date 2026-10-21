"use client";

import { useSyncExternalStore } from "react";

/**
 * Remembers, for this browser tab, that someone has signed in to a module.
 * The landing page skips its welcome banner (and the tour it launches) once
 * this is set, so logging out doesn't greet them again. Tab-scoped on purpose:
 * a fresh tab or window still gets the welcome.
 */
const KEY = "jems.entered";

export function markEntered() {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {}
}

function hasEntered() {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

const subscribe = () => () => {};

/** False on a visitor's first landing; true once they've been inside a module. */
export function useHasEntered(): boolean {
  // Server snapshot hides the banner so returning visitors never see it flash.
  return useSyncExternalStore(subscribe, hasEntered, () => true);
}
