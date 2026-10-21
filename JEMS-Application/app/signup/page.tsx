import type { Metadata } from "next";
import SignupFlow from "@/components/signup/SignupFlow";

export const metadata: Metadata = {
  title: "Sign up — Jems",
  description:
    "Create your Jems account. Join as a student to get job-ready, or as a company to hire skill-matched talent.",
};

export default function SignupPage() {
  return <SignupFlow />;
}
