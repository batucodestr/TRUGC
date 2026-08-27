"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InstagramIcon, TikTokIcon, YoutubeIcon, TwitchIcon } from "@/components/shared/brand-icons";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, COUNTRIES, CATEGORY_LABEL_TR } from "@/lib/constants";
import { formatCompactNumber, formatCurrency } from "@/lib/format";
import type { CreatorCategory, SocialPlatform } from "@/types";
import { cn } from "@/lib/utils";

export interface CreatorFilterState {
  platforms: SocialPlatform[];
  categories: CreatorCategory[];
  country: string | null;
  followersRange: [number, number];
  engagementMin: number;
  priceRange: [number, number];
}

export const DEFAULT_CREATOR_FILTERS: CreatorFilterState = {
  platforms: [],
  categories: [],
  country: null,
  followersRange: [0, 2_000_000],
  engagementMin: 0,
  priceRange: [0, 2000],
};

const PLATFORM_OPTIONS: { value: SocialPlatform; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "instagram", label: "Instagram", icon: InstagramIcon },
  { value: "tiktok", label: "TikTok", icon: TikTokIcon },
  { value: "youtube", label: "YouTube", icon: YoutubeIcon },
  { value: "twitch", label: "Twitch", icon: TwitchIcon },
];

interface FilterSidebarProps {
  value: CreatorFilterState;
  onChange: (value: CreatorFilterState) => void;
  className?: string;
}

export function FilterSidebar({ value, onChange, className }: FilterSidebarProps) {
  const togglePlatform = (platform: SocialPlatform) => {
    const has = value.platforms.includes(platform);
    onChange({ ...value, platforms: has ? value.platforms.filter((p) => p !== platform) : [...value.platforms, platform] });
  };
  const toggleCategory = (category: CreatorCategory) => {
    const has = value.categories.includes(category);
    onChange({ ...value, categories: has ? value.categories.filter((c) => c !== category) : [...value.categories, category] });
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filtreler</h3>
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={() => onChange(DEFAULT_CREATOR_FILTERS)}>
          <RotateCcw className="h-3 w-3" /> Sıfırla
        </Button>
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Platform</Label>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORM_OPTIONS.map(({ value: platform, label, icon: Icon }) => {
            const active = value.platforms.includes(platform);
            return (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                  active ? "border-violet-600 bg-violet-600/10 text-violet-700 dark:text-violet-300" : "border-border hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kategori</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const active = value.categories.includes(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  active ? "border-violet-600 bg-violet-600/10 text-violet-700 dark:text-violet-300" : "border-border hover:bg-muted",
                )}
              >
                {CATEGORY_LABEL_TR[category]}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ülke</Label>
        <Select value={value.country ?? "all"} onValueChange={(v) => onChange({ ...value, country: v === "all" ? null : v })}>
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder="Tüm ülkeler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm ülkeler</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Takipçi</Label>
          <span className="text-xs text-muted-foreground">
            {formatCompactNumber(value.followersRange[0])} – {formatCompactNumber(value.followersRange[1])}
          </span>
        </div>
        <Slider
          min={0}
          max={2_000_000}
          step={10000}
          value={value.followersRange}
          onValueChange={(v) => onChange({ ...value, followersRange: v as [number, number] })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Min. etkileşim</Label>
          <span className="text-xs text-muted-foreground">{value.engagementMin}%+</span>
        </div>
        <Slider
          min={0}
          max={12}
          step={0.5}
          value={[value.engagementMin]}
          onValueChange={(v) => onChange({ ...value, engagementMin: v[0] })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fiyat aralığı</Label>
          <span className="text-xs text-muted-foreground">
            {formatCurrency(value.priceRange[0])} – {formatCurrency(value.priceRange[1])}
          </span>
        </div>
        <Slider
          min={0}
          max={2000}
          step={25}
          value={value.priceRange}
          onValueChange={(v) => onChange({ ...value, priceRange: v as [number, number] })}
        />
      </div>
    </div>
  );
}
