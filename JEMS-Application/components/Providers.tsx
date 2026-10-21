"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { TourProvider } from "@/components/tour/TourProvider";
import { markEntered } from "@/components/welcome/entered";

/** Every module lives under one of these, and each one requires a sign-in. */
const MODULE_ROOTS = ["/student", "/company", "/faculty", "/institution"];

/**
 * Notes that someone has been inside a module so the landing page won't replay
 * its welcome after logout. Keyed off the route rather than `useSession`: the
 * demo sign-in lands via a client navigation, which the session hook misses.
 */
function RememberSignIn() {
  const pathname = usePathname();
  useEffect(() => {
    if (MODULE_ROOTS.some((root) => pathname === root || pathname.startsWith(root + "/"))) markEntered();
  }, [pathname]);
  return null;
}

/** Wraps the app so client components can read the Auth.js session. */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RememberSignIn />
      <TourProvider>{children}</TourProvider>
    </SessionProvider>
  );
}
