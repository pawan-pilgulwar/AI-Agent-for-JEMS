import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import "./globals.css";
import ClickRipple from "@/components/ClickRipple";
import Providers from "@/components/Providers";

/* Body face — quiet, even color, good at small sizes and in tables. */
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

/* Display face — warm grotesque with real character for headlines only. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "wdth"],
});

export const metadata: Metadata = {
  title: "Jems — Bridge the Gap Between Learning & Hiring",
  description:
    "AI-powered education-to-employment platform. Get job-ready with personalized AI learning, ace interviews with mock practice, and land offers from companies seeking your skills.",
  openGraph: {
    title: "Jems — Bridge the Gap Between Learning & Hiring",
    description:
      "Verified skills, personalised roadmaps and skill-ranked matching for students, companies and institutions.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="relative min-h-full bg-white font-sans text-navy">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {/* One fixed background canvas behind every section — the whole page
            shares this exact background, eliminating per-section seams. */}
        <div
          aria-hidden="true"
          className="bg-page-canvas pointer-events-none fixed inset-0 -z-10"
        />
        <Providers>{children}</Providers>
        <ClickRipple />
      </body>
    </html>
  );
}
