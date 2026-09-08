"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginPage from "@/app/login/page";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/ide";
  // Reuse the login page (which supports both modes). We redirect to /login
  // so the URL stays clean; the login page defaults to "login" mode but the
  // user can switch to register in one click. For a direct register link,
  // we render the login page client-side as a fallback.
  useEffect(() => {
    router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }, [router, redirectTo]);
  return <LoginPage />;
}