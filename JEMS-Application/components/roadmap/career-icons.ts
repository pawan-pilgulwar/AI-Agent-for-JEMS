import {
  BadgeCheck,
  Blocks,
  Boxes,
  Brain,
  Cloud,
  Code,
  Compass,
  Database,
  Gamepad2,
  LayoutTemplate,
  type LucideIcon,
  Palette,
  Server,
  Shield,
  Smartphone,
} from "lucide-react";

/** Resolves the icon *name* stored in `CAREER_PATHS` to a lucide component. */
const ICONS: Record<string, LucideIcon> = {
  BadgeCheck, Blocks, Boxes, Brain, Cloud, Code, Compass, Database,
  Gamepad2, LayoutTemplate, Palette, Server, Shield, Smartphone,
};

export const careerIcon = (name: string): LucideIcon => ICONS[name] ?? Code;
