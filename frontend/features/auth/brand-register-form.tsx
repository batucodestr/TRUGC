"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Building2, Globe2, Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/Motion/Reveal";
import { MagneticButton } from "@/components/Motion/MagneticButton";
import { useAuth } from "@/components/Auth/AuthProvider";
import { DASHBOARD_PATH_BY_ROLE } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-message";

export function BrandRegisterForm() {
  const router = useRouter();
  const { registerBrand } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isValid = companyName && contactName && email && password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      await registerBrand({ companyName, contactName, email, password, website: website || undefined });
      toast.success("Hesabın oluşturuldu!", { description: "Marka panelin hazırlanıyor..." });
      router.push(DASHBOARD_PATH_BY_ROLE.brand);
    } catch (err) {
      toast.error("Kayıt oluşturulamadı", { description: getErrorMessage(err) });
      setSubmitting(false);
    }
  }

  return (
    <Reveal variant="scale" className="mx-auto w-full max-w-lg">
      <Card className="glass-panel relative overflow-hidden rounded-3xl border-border/70 p-8 shadow-2xl shadow-violet-600/10">
        <Link href="/register" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Hesap türünü değiştir
        </Link>

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-brand text-xl shadow-lg shadow-violet-600/30">🏢</span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Marka olarak katıl</h1>
            <p className="text-sm text-muted-foreground">Kampanya oluşturmaya birkaç adım uzaktasın.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand-company">Şirket Adı</Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="brand-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Lumo Skincare" className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-contact">Yetkili Adı</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="brand-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Elif Aydan" className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="brand-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@sirket.com" className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-password">Şifre</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="brand-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-website">
              Web Sitesi <span className="text-muted-foreground">(opsiyonel)</span>
            </Label>
            <div className="relative">
              <Globe2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="brand-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://sirketiniz.com" className="pl-10" />
            </div>
          </div>

          <MagneticButton className="block w-full" strength={0.15}>
            <Button type="submit" size="lg" disabled={!isValid || submitting} className="w-full gap-2 rounded-full bg-gradient-brand shadow-lg shadow-violet-600/30 hover:opacity-90">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Hesabı Oluştur
            </Button>
          </MagneticButton>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="font-medium text-violet-600 hover:underline">
            Giriş yap
          </Link>
        </p>
      </Card>
    </Reveal>
  );
}
