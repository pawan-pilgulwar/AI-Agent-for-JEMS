import type { Metadata } from "next";
import HelpCenter from "@/components/help/HelpCenter";

export const metadata: Metadata = {
  title: "Help Center — Jems",
};

export default function HelpPage() {
  return <HelpCenter />;
}
