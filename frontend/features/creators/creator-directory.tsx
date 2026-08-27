"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchBar } from "@/components/Search/SearchBar";
import { EmptyState } from "@/components/shared/empty-state";
import { CreatorCardSkeleton } from "@/components/skeletons/card-skeletons";
import { CreatorCard } from "@/components/Cards/CreatorCard";
import { DEFAULT_CREATOR_FILTERS, FilterSidebar, type CreatorFilterState } from "@/features/creators/filter-sidebar";
import type { Creator, CreatorCategory } from "@/types";
import { PLATFORM_LABEL, CATEGORY_LABEL_TR } from "@/lib/constants";

const PAGE_SIZE = 12;

function filterCreators(creators: Creator[], filters: CreatorFilterState, search: string): Creator[] {
  let results = creators;

  if (filters.platforms.length) {
    results = results.filter((c) => c.socials.some((s) => filters.platforms.includes(s.platform)));
  }
  if (filters.categories.length) {
    results = results.filter((c) => c.categories.some((cat) => filters.categories.includes(cat)));
  }
  if (filters.country) {
    results = results.filter((c) => c.country === filters.country);
  }
  results = results.filter((c) => {
    const followers = Math.max(0, ...c.socials.map((s) => s.followers));
    return followers >= filters.followersRange[0] && followers <= filters.followersRange[1];
  });
  if (filters.engagementMin > 0) {
    results = results.filter((c) => Math.max(0, ...c.socials.map((s) => s.engagementRate)) >= filters.engagementMin);
  }
  results = results.filter((c) => (c.startingPrice ?? 0) >= filters.priceRange[0] && (c.startingPrice ?? 0) <= filters.priceRange[1]);

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.username ?? "").toLowerCase().includes(q) ||
        c.categories.some((cat) => cat.toLowerCase().includes(q)) ||
        c.socials.some((s) => s.platform.toLowerCase().includes(q) || s.handle.toLowerCase().includes(q)),
    );
  }

  return results;
}

type SortOption = "recommended" | "followers_desc" | "price_asc" | "price_desc" | "rating_desc";

function sortCreators(creators: Creator[], sort: SortOption): Creator[] {
  const list = [...creators];
  switch (sort) {
    case "followers_desc":
      return list.sort((a, b) => Math.max(0, ...b.socials.map((s) => s.followers)) - Math.max(0, ...a.socials.map((s) => s.followers)));
    case "price_asc":
      return list.sort((a, b) => (a.startingPrice ?? 0) - (b.startingPrice ?? 0));
    case "price_desc":
      return list.sort((a, b) => (b.startingPrice ?? 0) - (a.startingPrice ?? 0));
    case "rating_desc":
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    default:
      return list.sort((a, b) => Number(b.featured) - Number(a.featured) || (b.rating ?? 0) - (a.rating ?? 0));
  }
}

export function CreatorDirectory({ allCreators }: { allCreators: Creator[] }) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") as CreatorCategory | null;
  const initialSearch = searchParams.get("search") ?? "";

  const [filters, setFilters] = useState<CreatorFilterState>(() =>
    initialCategory ? { ...DEFAULT_CREATOR_FILTERS, categories: [initialCategory] } : DEFAULT_CREATOR_FILTERS,
  );
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState<SortOption>("recommended");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, []);

  function flashLoading() {
    setLoading(true);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => setLoading(false), 380);
  }

  const filtered = useMemo(() => sortCreators(filterCreators(allCreators, filters, search), sort), [allCreators, filters, search, sort]);
  const visible = filtered.slice(0, visibleCount);

  const activeFilterCount =
    filters.platforms.length +
    filters.categories.length +
    (filters.country ? 1 : 0) +
    (filters.engagementMin > 0 ? 1 : 0);

  function resetAndFilter(next: CreatorFilterState) {
    setFilters(next);
    setVisibleCount(PAGE_SIZE);
    flashLoading();
  }

  function handleSearchChange(v: string) {
    setSearch(v);
    setVisibleCount(PAGE_SIZE);
    flashLoading();
  }

  function handleSortChange(v: SortOption) {
    setSort(v);
    flashLoading();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">İçerik Üreticileri Keşfet</h1>
        <p className="mt-2 text-muted-foreground">
          Instagram, TikTok, YouTube ve Twitch genelinde aramanızla eşleşen {filtered.length.toLocaleString()} creator bulundu.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={handleSearchChange} className="flex-1" />
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-12 gap-2 rounded-full px-5 lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                Filtreler
                {activeFilterCount > 0 && <Badge className="h-5 min-w-5 rounded-full px-1">{activeFilterCount}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[340px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtreler</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-8">
                <FilterSidebar value={filters} onChange={resetAndFilter} />
              </div>
            </SheetContent>
          </Sheet>

          <Select value={sort} onValueChange={(v) => handleSortChange(v as SortOption)}>
            <SelectTrigger className="h-12 w-[180px] rounded-full">
              <SelectValue placeholder="Sırala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Önerilen</SelectItem>
              <SelectItem value="followers_desc">En çok takipçi</SelectItem>
              <SelectItem value="rating_desc">En yüksek puan</SelectItem>
              <SelectItem value="price_asc">Fiyat: Düşükten yükseğe</SelectItem>
              <SelectItem value="price_desc">Fiyat: Yüksekten düşüğe</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {filters.categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="gap-1 rounded-full pr-1.5 font-normal">
              {CATEGORY_LABEL_TR[cat]}
              <button onClick={() => resetAndFilter({ ...filters, categories: filters.categories.filter((c) => c !== cat) })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.platforms.map((p) => (
            <Badge key={p} variant="secondary" className="gap-1 rounded-full pr-1.5 font-normal">
              {PLATFORM_LABEL[p]}
              <button onClick={() => resetAndFilter({ ...filters, platforms: filters.platforms.filter((pl) => pl !== p) })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.country && (
            <Badge variant="secondary" className="gap-1 rounded-full pr-1.5 font-normal">
              {filters.country}
              <button onClick={() => resetAndFilter({ ...filters, country: null })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => resetAndFilter(DEFAULT_CREATOR_FILTERS)}>
            Tümünü temizle
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-border/70 bg-card p-5">
            <FilterSidebar value={filters} onChange={resetAndFilter} />
          </div>
        </aside>

        <div>
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CreatorCardSkeleton key={i} />
              ))}
            </div>
          ) : visible.length === 0 && allCreators.length === 0 ? (
            <EmptyState icon={Users} title="Henüz creator bulunmuyor" description="Yeni creator'lar katıldıkça burada listelenecek." />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Filtrelerinize uyan creator bulunamadı"
              description="Daha fazla sonuç görmek için filtrelerinizi veya arama teriminizi değiştirmeyi deneyin."
              action={
                <Button variant="outline" className="rounded-full" onClick={() => resetAndFilter(DEFAULT_CREATOR_FILTERS)}>
                  Filtreleri sıfırla
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((creator) => (
                  <CreatorCard key={creator.id} creator={creator} />
                ))}
              </div>
              {visibleCount < filtered.length && (
                <div className="mt-10 flex justify-center">
                  <Button variant="outline" className="rounded-full px-8" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                    Daha fazla creator yükle
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
