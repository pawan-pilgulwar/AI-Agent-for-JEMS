"use client";

import { useRouter } from "next/navigation";
import { ForgotPasswordFlow } from "@/components/auth/ForgotPasswordFlow";
import Logo from "@/components/Navbar/Logo";

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Logo className="h-8" />
        </div>
        <ForgotPasswordFlow onBackToLogin={() => router.push("/login")} />
      </div>
    </div>
  );
}
