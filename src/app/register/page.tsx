"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginPage from "@/app/login/page";

export default function RegisterPage() {
  const router = useRouter();
  // Reuse the login page (which supports both modes). We redirect to /login
  // so the URL stays clean; the login page defaults to "login" mode but the
  // user can switch to register in one click. For a direct register link,
  // we render the login page client-side as a fallback.
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return <LoginPage />;
}