"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Reveal } from "@/components/Motion/Reveal";
import { MagneticButton } from "@/components/Motion/MagneticButton";
import { useAuth } from "@/components/Auth/AuthProvider";
import { DASHBOARD_PATH_BY_ROLE } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { AUTH_ENDPOINTS } from "@/lib/endpoints";
import { getErrorMessage } from "@/lib/error-message";

function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await apiClient.post(AUTH_ENDPOINTS.passwordResetRequest, { email });
      setSent(true);
    } catch (err) {
      toast.error("Bir sorun oluştu", { description: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSent(false);
          setEmail("");
        }
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className="text-xs font-medium text-violet-600 hover:underline">
          Şifremi Unuttum
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Şifreni sıfırla</DialogTitle>
          <DialogDescription>
            {sent
              ? "Bu e-posta adresine ait bir hesap varsa, şifre sıfırlama bağlantısı gönderildi."
              : "E-posta adresinizi girin, şifre sıfırlama bağlantısını gönderelim."}
          </DialogDescription>
        </DialogHeader>
        {!sent && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@sirket.com" required />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={sending} className="rounded-full bg-gradient-brand hover:opacity-90">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bağlantı gönder"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      const session = await login({ email, password });
      toast.success("Giriş başarılı", { description: "Panelinize yönlendiriliyorsunuz..." });
      const redirect = searchParams.get("redirect");
      router.push(redirect && redirect.startsWith("/dashboard") ? redirect : DASHBOARD_PATH_BY_ROLE[session.user.role]);
    } catch (err) {
      toast.error("Giriş yapılamadı", { description: getErrorMessage(err) });
      setSubmitting(false);
    }
  }

  return (
    <Reveal variant="scale" className="mx-auto w-full max-w-md">
      <Card className="glass-panel relative overflow-hidden rounded-3xl border-border/70 p-8 shadow-2xl shadow-violet-600/10">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Tekrar hoş geldiniz</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Devam etmek için hesabınıza giriş yapın.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Şifre</Label>
              <ForgotPasswordDialog />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                required
              />
            </div>
          </div>

          <MagneticButton className="block w-full" strength={0.15}>
            <Button type="submit" size="lg" disabled={submitting} className="w-full gap-2 rounded-full bg-gradient-brand shadow-lg shadow-violet-600/30 hover:opacity-90">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Giriş Yap
            </Button>
          </MagneticButton>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Henüz hesabınız yok mu?{" "}
          <Link href="/register" className="font-medium text-violet-600 hover:underline">
            Kayıt olun
          </Link>
        </p>
      </Card>
    </Reveal>
  );
}
