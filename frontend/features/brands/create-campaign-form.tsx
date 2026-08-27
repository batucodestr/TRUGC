"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CATEGORIES, CATEGORY_LABEL_TR } from "@/lib/constants";
import { PLATFORM_LABEL } from "@/lib/constants";
import { InstagramIcon, TikTokIcon, YoutubeIcon, TwitchIcon } from "@/components/shared/brand-icons";
import { cn } from "@/lib/utils";
import type { SocialPlatform } from "@/types";
import { apiClient } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { createCampaign } from "@/lib/api/campaigns";
import { getErrorMessage } from "@/lib/error-message";

/** Resolves a display category label (e.g. "Fashion") to the backend Category id. */
async function resolveCategoryId(label: string): Promise<number | undefined> {
  const categories = await apiClient.getPublic<{ id: number; name: string }[]>(ENDPOINTS.creatorCategories);
  return categories.find((c) => c.name.toLowerCase() === label.toLowerCase())?.id;
}

const PLATFORM_OPTIONS: { value: SocialPlatform; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "instagram", icon: InstagramIcon },
  { value: "tiktok", icon: TikTokIcon },
  { value: "youtube", icon: YoutubeIcon },
  { value: "twitch", icon: TwitchIcon },
];

export function CreateCampaignForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [spots, setSpots] = useState("3");
  const [deadline, setDeadline] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const isValid = title && category && description && budgetMin && budgetMax && deadline && platforms.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      const categoryId = await resolveCategoryId(category);
      await createCampaign({
        title,
        description,
        categoryIds: categoryId ? [categoryId] : [],
        platform: platforms[0],
        budgetMin: Number(budgetMin),
        budgetMax: Number(budgetMax),
        requirements,
        deadline: new Date(deadline).toISOString(),
        status: "published",
      });
      toast.success("Kampanya oluşturuldu!", { description: `"${title}" artık yayında ve başvuru kabul ediyor.` });
      router.push("/dashboard/brand/campaigns");
    } catch (err) {
      toast.error("Kampanya oluşturulamadı", { description: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card className="rounded-2xl border-border/70 p-6">
          <h2 className="text-base font-semibold">Kampanya detayları</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Kampanya başlığı</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="örn. Yaz Aydınlatıcı Cilt Bakımı Lansmanı" />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Bir kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABEL_TR[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Kampanyanızı, marka tonunuzu ve aradığınız içerik tarzını anlatın..." />
            </div>
            <div className="space-y-2">
              <Label>Gereksinimler (satır başına bir tane)</Label>
              <Textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
                placeholder={"Minimum 10K takipçi\n%3 üzeri etkileşim oranı\nİş birliğinin belirtilmesi zorunlu"}
              />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/70 p-6">
          <h2 className="text-base font-semibold">Platformlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Creator&apos;lar içeriği nerede yayınlamalı?</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PLATFORM_OPTIONS.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => togglePlatform(value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm transition-colors",
                  platforms.includes(value) ? "border-violet-600 bg-violet-600/10 text-violet-700 dark:text-violet-300" : "border-border hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" /> {PLATFORM_LABEL[value]}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
        <Card className="rounded-2xl border-border/70 p-6">
          <h2 className="text-base font-semibold">Bütçe ve kontenjan</h2>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min. bütçe</Label>
                <Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="500" />
              </div>
              <div className="space-y-2">
                <Label>Maks. bütçe</Label>
                <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="2000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kontenjan sayısı</Label>
              <Input type="number" value={spots} onChange={(e) => setSpots(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Son başvuru tarihi</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <Separator className="my-5" />
          <Button type="submit" size="lg" disabled={!isValid || submitting} className="w-full gap-2 rounded-full bg-gradient-brand hover:opacity-90">
            <Rocket className="h-4 w-4" /> {submitting ? "Yayınlanıyor..." : "Kampanyayı yayınla"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Bu kampanyayı istediğiniz zaman düzenleyebilir veya duraklatabilirsiniz.</p>
        </Card>
      </aside>
    </form>
  );
}
