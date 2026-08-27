import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorShellProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  actions: React.ReactNode;
  className?: string;
}

/**
 * Shared visual chrome for the app's error/not-found screens — same aurora
 * background + glass-panel card language as app/(auth)/layout.tsx, kept as
 * plain CSS animations (no framer-motion) so it's safe to use from
 * app/global-error.tsx too, which renders outside the root layout/providers
 * and must not depend on anything that could itself be the reason we're
 * showing an error screen.
 */
export function ErrorShell({ icon: Icon, eyebrow, title, description, actions, className }: ErrorShellProps) {
  return (
    <div className={cn("relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-aurora absolute -top-56 left-1/2 h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/25 via-fuchsia-400/15 to-transparent blur-3xl" />
        <div className="bg-noise absolute inset-0 opacity-[0.03] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,theme(colors.border)_1px,transparent_0)] bg-[size:36px_36px] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="glass-panel w-full max-w-md rounded-3xl border-border/70 p-8 text-center shadow-2xl shadow-violet-600/10 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-sm shadow-violet-600/30">
          <Icon className="h-7 w-7" />
        </div>
        <p className="mt-6 text-sm font-medium text-violet-600">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">{actions}</div>
      </div>
    </div>
  );
}
