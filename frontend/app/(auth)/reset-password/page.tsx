import { Suspense } from "react";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata = { title: "Şifre Sıfırlama — TRUGC" };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
