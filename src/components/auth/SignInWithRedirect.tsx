"use client";

import { useSearchParams } from "next/navigation";
import { SignInForm } from "./SignInForm";

/** Reads ?redirect= from the URL and feeds it to the sign-in form. */
export function SignInWithRedirect() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("redirect") ?? "";
  const redirectTo =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
  return <SignInForm redirectTo={redirectTo} />;
}