import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-aurora absolute -top-56 left-1/2 h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/25 via-fuchsia-400/15 to-transparent blur-3xl" />
        <div className="bg-noise absolute inset-0 opacity-[0.03] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,theme(colors.border)_1px,transparent_0)] bg-[size:36px_36px] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      </div>

      <Logo className="mb-8" />

      <div className="w-full">{children}</div>
    </div>
  );
}
