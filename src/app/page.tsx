import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SignInForm } from "@/components/auth/SignInForm";

export const dynamic = "force-dynamic";

/**
 * Landing page = the sign-in form. The whole site requires a session;
 * signed-in users skip straight to their workspace.
 */
export default async function HomePage() {
  const sess = await getSession();
  if (sess) {
    redirect("/dashboard");
  }
  return <SignInForm redirectTo="/dashboard" />;
}