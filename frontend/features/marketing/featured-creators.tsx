import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatorCard } from "@/components/Cards/CreatorCard";
import { Reveal } from "@/components/Motion/Reveal";
import { EmptyState } from "@/components/shared/empty-state";
import { LockedCreatorsTeaser } from "@/components/shared/locked-creators-teaser";
import { listFeaturedCreators } from "@/lib/api/creators";
import { ApiError } from "@/lib/api";
import type { Creator } from "@/types";

export async function FeaturedCreators() {
  let creators: Creator[] = [];
  let locked: "login" | "payment" | null = null;

  try {
    creators = await listFeaturedCreators(8);
  } catch (err) {
    if (err instanceof ApiError && err.kind === "unauthorized") locked = "login";
    else if (err instanceof ApiError && err.kind === "forbidden") locked = "payment";
    else throw err;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-violet-600">Öne çıkan creator&apos;lar</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Önde gelen markaların tercihi</h2>
        </div>
        <Button variant="outline" className="rounded-full" asChild>
          <Link href="/creators">
            Tüm creator&apos;ları keşfet <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </Reveal>

      {locked ? (
        <div className="mt-10">
          <LockedCreatorsTeaser reason={locked} />
        </div>
      ) : creators.length === 0 ? (
        <EmptyState icon={Users} title="Henüz creator bulunmuyor" description="Yeni creator'lar katıldıkça burada listelenecek." className="mt-10" />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {creators.map((creator, i) => (
            <Reveal key={creator.id} delay={i * 0.05}>
              <CreatorCard creator={creator} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
