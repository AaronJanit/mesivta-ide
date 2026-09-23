import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { SignInWithRedirect } from "@/components/auth/SignInWithRedirect";

export const dynamic = "force-dynamic";

/** Legacy alias: keeps /login links and ?redirect= targets working. */
export default async function LoginPage() {
  const sess = await getSession();
  if (sess) {
    redirect("/dashboard");
  }
  return (
    <Suspense>
      <SignInWithRedirect />
    </Suspense>
  );
}