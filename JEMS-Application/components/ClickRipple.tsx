"use client";

import { useEffect } from "react";

/**
 * Global macOS-style click feedback: spawns a short orange ripple at the
 * pointer position on every primary-button press. Renders nothing itself.
 */
export default function ClickRipple() {
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      // Only the primary (left) button — ignore right/middle clicks.
      if (e.button !== 0) return;

      const ripple = document.createElement("span");
      ripple.className = "click-ripple";
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      document.body.appendChild(ripple);

      const remove = () => ripple.remove();
      // The ripple normally removes itself when the CSS animation ends.
      ripple.addEventListener("animationend", remove);
      // Safety fallback only — MUST stay above the CSS animation duration,
      // otherwise the ripple is deleted before it can expand. Not a speed knob.
      window.setTimeout(remove, 1500);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return null;
}
