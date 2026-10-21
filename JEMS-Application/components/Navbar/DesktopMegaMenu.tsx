"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import type { MenuGroup } from "../types";

interface DesktopMegaMenuProps {
  menus: MenuGroup[];
  onNavigate?: (href: string) => void;
}

/**
 * Desktop center menus built on shadcn/ui <NavigationMenu>.
 * Each top-level label reveals a 2x2 grid dropdown. Used by StudentNav and
 * CompanyNav on desktop (>=768px).
 */
export default function DesktopMegaMenu({
  menus,
  onNavigate,
}: DesktopMegaMenuProps) {
  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-1">
        {menus.map((group) => (
          <NavigationMenuItem key={group.label}>
            <NavigationMenuTrigger className="bg-transparent text-navy hover:bg-slate/10 hover:text-slate data-popup-open:bg-slate/10 data-popup-open:text-slate data-open:bg-slate/10 data-open:text-slate">
              {group.label}
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[460px] grid-cols-2 gap-1 p-2">
                {group.items.map((item) => (
                  <li key={item.title}>
                    <NavigationMenuLink
                      render={<button type="button" />}
                      onClick={() => onNavigate?.(item.href)}
                      className="group/item flex w-full flex-col items-start gap-0.5 rounded-lg p-3 text-left hover:bg-surface-2"
                    >
                      <span className="text-sm font-semibold text-navy transition-colors group-hover/item:text-slate">
                        {item.title}
                      </span>
                      <span className="text-xs text-mediumgray">
                        {item.description}
                      </span>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
