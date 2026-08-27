"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, Video } from "lucide-react";
import { Reveal, RevealItem } from "@/components/Motion/Reveal";
import { TiltCard } from "@/components/Motion/TiltCard";

const ROLES = [
  {
    href: "/register/creator",
    emoji: "🎥",
    icon: Video,
    title: "Creator",
    description: "İçerik üreticisi olarak markalarla iş birliği yap.",
    glow: "124,58,237",
  },
  {
    href: "/register/brand",
    emoji: "🏢",
    icon: Megaphone,
    title: "Marka",
    description: "Kampanya oluştur ve influencer'larla çalış.",
    glow: "217,70,239",
  },
];

export function RoleSelectCards() {
  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <Reveal variant="slide-up">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Platforma nasıl katılmak istiyorsun?</h1>
        <p className="mt-3 text-muted-foreground">Devam etmek için sana uygun hesap türünü seç.</p>
      </Reveal>

      <Reveal variant="stagger" staggerChildren={0.1} className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {ROLES.map((role) => (
          <RevealItem key={role.href}>
            <Link href={role.href} className="group block h-full">
              <TiltCard glowColor={role.glow} className="h-full rounded-3xl">
                <div className="flex h-full flex-col items-center rounded-3xl border border-border/70 bg-card p-8 text-center shadow-sm transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-violet-600/15">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand text-3xl shadow-lg shadow-violet-600/30 transition-transform duration-300 group-hover:scale-110">
                    {role.emoji}
                  </span>
                  <h2 className="mt-5 text-xl font-semibold">{role.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{role.description}</p>
                  <span className="mt-6 flex items-center gap-1.5 text-sm font-medium text-violet-600">
                    Devam et <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </TiltCard>
            </Link>
          </RevealItem>
        ))}
      </Reveal>

      <p className="mt-8 text-sm text-muted-foreground">
        Zaten hesabın var mı?{" "}
        <Link href="/login" className="font-medium text-violet-600 hover:underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
