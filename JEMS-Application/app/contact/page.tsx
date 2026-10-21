"use client";

import { useState } from "react";
import Footer from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <Navbar isAuthenticated={false} userRole={null} />
      <main className="pt-16">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Left — info */}
            <div>
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-px w-8 bg-orange" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
                  Contact
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-navy sm:text-5xl">
                Let&apos;s talk
              </h1>
              <p className="mt-6 max-w-md text-lg leading-8 text-mediumgray">
                Questions about Jems, partnerships, or press? Send a note and
                we&apos;ll get back within one business day.
              </p>

              <dl className="mt-10 space-y-5">
                <div>
                  <dt className="text-sm font-semibold text-navy">Email</dt>
                  <dd className="text-sm text-mediumgray">hello@jems.com</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-navy">
                    For companies
                  </dt>
                  <dd className="text-sm text-mediumgray">partners@jems.com</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-navy">Press</dt>
                  <dd className="text-sm text-mediumgray">press@jems.com</dd>
                </div>
              </dl>
            </div>

            {/* Right — form */}
            <div className="rounded-3xl border border-lightgray bg-white/90 p-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
              {sent ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald/15 text-2xl text-emerald">
                    ✓
                  </span>
                  <h2 className="mt-5 text-xl font-bold text-navy">
                    Message sent
                  </h2>
                  <p className="mt-2 max-w-xs text-sm text-mediumgray">
                    Thanks for reaching out — we&apos;ll be in touch shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="mt-6 text-sm font-semibold text-orange hover:underline"
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSent(true);
                  }}
                  className="flex flex-col gap-5"
                >
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1 block text-sm font-medium text-navy"
                    >
                      Name
                    </label>
                    <input
                      id="name"
                      required
                      className="w-full rounded-lg border border-lightgray px-3.5 py-2.5 text-sm text-navy outline-none transition-colors focus:border-slate focus:ring-2 focus:ring-slate/20"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1 block text-sm font-medium text-navy"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      className="w-full rounded-lg border border-lightgray px-3.5 py-2.5 text-sm text-navy outline-none transition-colors focus:border-slate focus:ring-2 focus:ring-slate/20"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="mb-1 block text-sm font-medium text-navy"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      className="w-full resize-none rounded-lg border border-lightgray px-3.5 py-2.5 text-sm text-navy outline-none transition-colors focus:border-slate focus:ring-2 focus:ring-slate/20"
                      placeholder="How can we help?"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-cta-gradient px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-transform hover:scale-[1.02]"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
