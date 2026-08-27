import Image from "next/image";
import { listFeaturedBrands } from "@/lib/api/brands";

export async function LogoMarquee() {
  const featured = await listFeaturedBrands(10);
  const brands = [...featured, ...featured];

  return (
    <section className="border-y border-border/60 py-10">
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Hızla büyüyen markaların tercihi
      </p>
      <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-[marquee_32s_linear_infinite] items-center gap-16 transition-[animation-play-state] duration-300 group-hover:[animation-play-state:paused]">
          {brands.map((brand, i) => (
            <div
              key={`${brand.id}-${i}`}
              className="flex shrink-0 items-center gap-2 opacity-60 grayscale transition-all duration-300 hover:scale-105 hover:opacity-100 hover:grayscale-0"
            >
              {brand.logoUrl && <Image src={brand.logoUrl} alt={brand.name} width={28} height={28} className="h-7 w-7 rounded-md object-cover" />}
              <span className="whitespace-nowrap text-sm font-semibold">{brand.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
