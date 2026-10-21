"use client";

import { ArrowRight } from "lucide-react";
import { SectionHeading, revealClass, useReveal } from "./_shared";

const row1 = ["Google", "Amazon", "Microsoft", "Apple", "Meta", "Stripe", "Airbnb", "Uber", "Netflix", "Spotify"];
const row2 = ["Adobe", "Salesforce", "Shopify", "Slack", "Notion", "Figma", "Dropbox", "Atlassian", "Twilio", "Pinterest"];

const edgeFade = {
  WebkitMaskImage: "linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)",
  maskImage: "linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)",
};

function MarqueeRow({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  return (
    <div className="relative overflow-hidden" style={edgeFade}>
      <div
        className="flex w-max animate-marquee items-center hover:[animation-play-state:paused]"
        style={reverse ? { animationDirection: "reverse" } : undefined}
      >
        {[...items, ...items].map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="font-display whitespace-nowrap px-10 text-2xl font-bold tracking-tight text-navy/30 transition-colors duration-300 hover:text-navy"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Companies — hiring-partner marquee, unauthenticated visitors only. */
export default function Companies() {
  const { ref, visible } = useReveal<HTMLElement>();
  const r = revealClass(visible);

  return (
    <section id="companies" ref={ref} className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className={`flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between ${r}`}>
          <SectionHeading
            title="50+ companies hire from Jems"
            lede="They post the skills a role needs; we send candidates who've verified them."
          />
          <dl className="flex items-center gap-8 lg:gap-12">
            <div>
              <dt className="text-sm text-mediumgray">Open roles</dt>
              <dd className="font-display mt-1 text-3xl font-bold tracking-tight text-navy tabular">500+</dd>
            </div>
            <div className="h-10 w-px bg-navy/10" />
            <div>
              <dt className="text-sm text-mediumgray">Salary range</dt>
              <dd className="font-display mt-1 text-3xl font-bold tracking-tight text-navy tabular">$120–180K</dd>
            </div>
          </dl>
        </div>

        <div
          aria-hidden="true"
          className={`mt-14 flex flex-col gap-5 ${r}`}
          style={{ transitionDelay: visible ? "120ms" : "0ms" }}
        >
          <MarqueeRow items={row1} />
          <MarqueeRow items={row2} reverse />
        </div>

        <a
          href="#get-started"
          style={{ transitionDelay: visible ? "240ms" : "0ms" }}
          className={`group mt-12 inline-flex items-center gap-1.5 text-sm font-semibold text-navy ${r}`}
        >
          Browse open positions
          <ArrowRight className="h-4 w-4 text-orange transition-transform duration-200 group-hover:translate-x-0.5" />
        </a>
      </div>
    </section>
  );
}
