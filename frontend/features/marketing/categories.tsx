import Link from "next/link";
import { CATEGORIES, CATEGORY_ICON_LABEL, CATEGORY_LABEL_TR } from "@/lib/constants";
import { Reveal } from "@/components/Motion/Reveal";
import { Parallax } from "@/components/Motion/Parallax";

export function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="text-center">
        <p className="text-sm font-medium text-violet-600">Kategoriler</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Niş alana göre keşfet</h2>
      </Reveal>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((cat, i) => (
          <Reveal key={cat} variant="scale" delay={i * 0.04} className="h-full">
            <Link
              href={`/creators?category=${cat}`}
              className="group flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-violet-600/40 hover:shadow-lg hover:shadow-violet-600/10"
            >
              <Parallax speed={(i % 3) * -14 - 6}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600/10 text-2xl transition-transform group-hover:scale-110">
                  {CATEGORY_ICON_LABEL[cat]}
                </span>
              </Parallax>
              <span className="text-sm font-medium">{CATEGORY_LABEL_TR[cat]}</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
