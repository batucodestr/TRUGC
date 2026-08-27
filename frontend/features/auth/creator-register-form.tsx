"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Reveal } from "@/components/Motion/Reveal";
import { MagneticButton } from "@/components/Motion/MagneticButton";
import { useAuth } from "@/components/Auth/AuthProvider";
import { InstagramIcon, TikTokIcon, YoutubeIcon } from "@/components/shared/brand-icons";
import { CATEGORIES, CATEGORY_LABEL_TR } from "@/lib/constants";
import { DASHBOARD_PATH_BY_ROLE } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-message";
import { cn } from "@/lib/utils";
import type { CreatorCategory, SocialPlatform } from "@/types";

const PLATFORM_OPTIONS: { value: SocialPlatform; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "instagram", label: "Instagram", icon: InstagramIcon },
  { value: "tiktok", label: "TikTok", icon: TikTokIcon },
  { value: "youtube", label: "YouTube", icon: YoutubeIcon },
];

export function CreatorRegisterForm() {
  const router = useRouter();
  const { registerCreator } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [category, setCategory] = useState<CreatorCategory | "">("");
  const [submitting, setSubmitting] = useState(false);

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const isValid = fullName && username && email && password && platforms.length > 0 && category;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !category) return;
    setSubmitting(true);
    try {
      await registerCreator({ fullName, username, email, password, platforms, category });
      toast.success("Hesabın oluşturuldu!", { description: "Creator panelin hazırlanıyor..." });
      router.push(DASHBOARD_PATH_BY_ROLE.creator);
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
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-brand text-xl shadow-lg shadow-violet-600/30">🎥</span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Creator olarak katıl</h1>
            <p className="text-sm text-muted-foreground">Birkaç dakikada profilini oluştur.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="creator-name">Ad Soyad</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="creator-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ayşe Yılmaz" className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creator-username">Kullanıcı Adı</Label>
              <Input id="creator-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ayseyilmaz" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="creator-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="creator-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="creator-password">Şifre</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="creator-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Platformlar</Label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORM_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => togglePlatform(value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors",
                    platforms.includes(value) ? "border-violet-600 bg-violet-600/10 text-violet-700 dark:text-violet-300" : "border-border hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as CreatorCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Bir kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABEL_TR[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
