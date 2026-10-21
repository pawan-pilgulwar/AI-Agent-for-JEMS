"use client";

import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  /** Optional side-effect on click (e.g. close the mobile menu). */
  onClick?: () => void;
  /** Height utility class — width follows automatically from the image's aspect ratio. */
  className?: string;
}

/** The Jems logo mark — links to home. */
export default function Logo({ onClick, className = "h-9" }: LogoProps) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Jems home"
      className="inline-flex select-none items-center rounded-lg transition-opacity hover:opacity-80"
    >
      <Image
        src="/logo.png"
        alt="Jems"
        width={782}
        height={697}
        priority
        className={`w-auto ${className}`}
      />
    </Link>
  );
}
