"use client";

import { useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchBar } from "@/components/Search/SearchBar";
import { EmptyState } from "@/components/shared/empty-state";
import { CampaignCard } from "@/features/campaigns/campaign-card";
import { CATEGORIES, CATEGORY_LABEL_TR } from "@/lib/constants";
import type { Campaign, CreatorCategory } from "@/types";

export function CampaignBrowser({ campaigns }: { campaigns: Campaign[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CreatorCategory | "all">("all");

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (category !== "all" && !c.categories.includes(category)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !c.brandName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [campaigns, search, category]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Kampanyaları Keşfet</h1>
        <p className="mt-2 text-muted-foreground">İş birliğine hazır markalardan {filtered.length.toLocaleString()} açık fırsat.</p>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} placeholder="Kampanya veya marka ara..." className="flex-1" />
        <Select value={category} onValueChange={(v) => setCategory(v as CreatorCategory | "all")}>
          <SelectTrigger className="h-12 w-full rounded-full sm:w-[200px]">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm kategoriler</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABEL_TR[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="Henüz kampanya bulunmuyor" description="Markalar kampanya oluşturdukça burada listelenecek." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Kampanya bulunamadı"
          description="Farklı bir arama terimi veya kategori deneyin."
          action={
            <Button variant="outline" className="rounded-full" onClick={() => { setSearch(""); setCategory("all"); }}>
              Filtreleri sıfırla
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
