"use client";

import { createContext, useContext } from "react";

const SidebarPinnedContext = createContext(false);
export const SidebarPinnedProvider = SidebarPinnedContext.Provider;

/** Whether the sidebar is pinned open. Used to give page content more room when it isn't. */
export function useSidebarPinned(): boolean {
  return useContext(SidebarPinnedContext);
}

const OpenMobileSidebarContext = createContext<() => void>(() => {});
export const OpenMobileSidebarProvider = OpenMobileSidebarContext.Provider;

/** Opens the mobile sidebar drawer — wired up by whichever page renders the hamburger button. */
export function useOpenMobileSidebar(): () => void {
  return useContext(OpenMobileSidebarContext);
}
