"use client";

import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import Pricing from "@/components/sections/Pricing";

const faqs = [
  {
    q: "Can I really start for free?",
    a: "Yes. The Free plan is genuinely free — no card required — and includes everything you need to begin.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Pro is month-to-month with no contracts. Cancel whenever and you keep access until the period ends.",
  },
  {
    q: "Do you offer student discounts?",
    a: "The Free tier is built for students getting started. Reach out and we'll help if you need more.",
  },
];

export default function PricingPage() {
  const router = useRouter();

  return (
    <>
      <Navbar isAuthenticated={false} userRole={null} />
      <main className="pt-16">
        <Pricing
          onStartFree={() => router.push("/signup")}
          onStartPro={() => router.push("/signup")}
        />

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-8 divide-y divide-lightgray overflow-hidden rounded-2xl border border-lightgray bg-white/80 backdrop-blur-sm">
            {faqs.map((f) => (
              <div key={f.q} className="px-6 py-5">
                <h3 className="text-base font-bold text-navy">{f.q}</h3>
                <p className="mt-2 text-sm leading-7 text-mediumgray">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
