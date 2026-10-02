"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api";
import { AUTH_ENDPOINTS } from "@/lib/endpoints";
import { getErrorMessage } from "@/lib/error-message";

/**
 * Şifre sıfırlama e-postasındaki bağlantının açtığı ekran.
 *
 * Sıfırlama e-postası `${FRONTEND_URL}/reset-password?uid=…&token=…` adresine
 * işaret ediyordu ama bu sayfa yoktu — bağlantı 404 veriyordu. Token kontrolü
 * ve şifre politikası tamamen backend'de uygulanır.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const linkIsComplete = Boolean(uid && token);
  const canSubmit = linkIsComplete && password.length > 0 && password === confirm && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await apiClient.post(AUTH_ENDPOINTS.passwordResetConfirm, { uid, token, new_password: password });
      setDone(true);
      toast.success("Şifreniz güncellendi");
    } catch (err) {
      toast.error("Şifre sıfırlanamadı", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="mx-auto w-full max-w-md rounded-3xl border-border/70 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <h1 className="mt-4 text-xl font-semibold">Şifreniz güncellendi</h1>
        <p className="mt-2 text-sm text-muted-foreground">Yeni şifrenizle giriş yapabilirsiniz.</p>
        <Button
          className="mt-6 w-full rounded-full bg-gradient-brand hover:opacity-90"
          onClick={() => router.push("/login")}
        >
          Giriş yap
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md rounded-3xl border-border/70 p-8">
      <h1 className="text-xl font-semibold">Yeni şifre belirle</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {linkIsComplete
          ? "En az 8 karakterli, kolay tahmin edilemeyen bir şifre seçin."
          : "Bağlantı eksik görünüyor. Şifre sıfırlama e-postasındaki bağlantıyı tekrar açın."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">Yeni şifre</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="new-password"
              type="password"
              className="pl-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!linkIsComplete}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Yeni şifre (tekrar)</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={!linkIsComplete}
            required
          />
          {confirm.length > 0 && confirm !== password && (
            <p className="text-xs text-rose-600">Şifreler eşleşmiyor.</p>
          )}
        </div>
        <Button type="submit" disabled={!canSubmit} className="w-full gap-2 rounded-full bg-gradient-brand hover:opacity-90">
          {submitting && <Loader2 className="size-4 animate-spin" />} Şifreyi güncelle
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/login" className="font-medium text-violet-600 hover:underline">
          Giriş ekranına dön
        </Link>
      </p>
    </Card>
  );
}
