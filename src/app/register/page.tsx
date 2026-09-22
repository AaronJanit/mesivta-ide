import { Suspense } from "react";
import LoginPage from "@/app/login/page";

export default function RegisterPage() {
  return (
    <Suspense>
      <LoginPage initialMode="register" />
    </Suspense>
  );
}