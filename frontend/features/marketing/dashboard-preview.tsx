"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, MessageSquare, Users, Wallet } from "lucide-react";
import { CountUp } from "@/components/shared/count-up";
import { Reveal } from "@/components/Motion/Reveal";
import { convertUsdToTry } from "@/lib/format";

const BARS = [38, 62, 45, 80, 58, 92, 70];

export function DashboardPreview() {
  return (
    <section className="relative mx-auto max-w-7xl overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-violet-600">Gerçek işler için tasarlandı</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Tüm kampanyalarınızı tek ekrandan yönetin
        </h2>
        <p className="mt-3 text-muted-foreground">
          Gerçek zamanlı analizler, başvuru takibi ve ödemeler — hıza göre tasarlanmış tek bir çalışma alanında.
        </p>
      </Reveal>

      <motion.div
        initial={{ opacity: 0, y: 60, rotateX: 6 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
        style={{ perspective: 1200 }}
        className="relative mx-auto mt-14 max-w-5xl"
      >
        <div className="glass-panel relative overflow-hidden rounded-4xl border-border/60 p-4 shadow-2xl shadow-violet-600/15 sm:p-6">
          <div className="rounded-3xl border border-border/60 bg-card/80 p-5 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Genel bakış</p>
                <p className="text-lg font-semibold">Summer Glow Skincare Launch</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-500">Aktif</span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: Users, label: "Başvuru", value: 284, suffix: "" },
                { icon: MessageSquare, label: "Yeni mesaj", value: 12, suffix: "" },
                { icon: Wallet, label: "Kullanılan bütçe", value: 68, suffix: "%" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <stat.icon className="h-4 w-4" />
                    <span className="text-xs">{stat.label}</span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold">
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-border/60 bg-background/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium">Zaman içinde etkileşim</p>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                  <ArrowUpRight className="h-3.5 w-3.5" /> +24.6%
                </span>
              </div>
              <div className="flex h-32 items-end gap-2 sm:gap-3">
                {BARS.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
                    className="flex-1 rounded-t-lg bg-gradient-to-t from-violet-600 to-fuchsia-400"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="glass-panel absolute -right-4 -top-6 hidden w-52 rounded-2xl p-4 shadow-xl sm:block lg:-right-10"
        >
          <p className="text-xs text-muted-foreground">Toplam ödeme</p>
          <p className="mt-1 text-xl font-semibold">
            <CountUp value={convertUsdToTry(128400)} suffix=" ₺" />
          </p>
          <p className="mt-1 text-[11px] text-emerald-500">Bu ay ödenen</p>
        </motion.div>
      </motion.div>
    </section>
  );
}
