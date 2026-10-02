import { Suspense } from "react";
import { VerifyEmailView } from "@/features/auth/verify-email-view";

export const metadata = { title: "E-posta Doğrulama — TRUGC" };

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailView />
    </Suspense>
  );
}
