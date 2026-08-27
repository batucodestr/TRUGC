"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { ImageUpload } from "@/components/upload/image-upload";
import { CATEGORIES, CATEGORY_LABEL_TR, PLATFORM_LABEL } from "@/lib/constants";
import { AUTH_ENDPOINTS, ENDPOINTS } from "@/lib/endpoints";
import { apiClient } from "@/lib/api";
import { formatCompactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CreatorCategory, SocialPlatform } from "@/types";
import { getErrorMessage } from "@/lib/error-message";

interface MyCreator {
  display_name: string;
  bio: string;
  cover: string | null;
  avatar: string | null;
  categories: { id: number; name: string }[];
  social_accounts: { platform: SocialPlatform; handle: string; followers_count: number }[];
}

export default function CreatorProfileSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creator, setCreator] = useState<MyCreator | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selected, setSelected] = useState<CreatorCategory[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<MyCreator>(ENDPOINTS.myCreator)
      .then((data) => {
        if (cancelled) return;
        setCreator(data);
        setDisplayName(data.display_name);
        setBio(data.bio);
        setCoverUrl(data.cover);
        setAvatarUrl(data.avatar);
        setSelected(data.categories.map((c) => c.name) as CreatorCategory[]);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      const categories = await apiClient.getPublic<{ id: number; name: string }[]>(ENDPOINTS.creatorCategories);
      const categoryIds = categories.filter((c) => selected.includes(c.name as CreatorCategory)).map((c) => c.id);
      await apiClient.patch(ENDPOINTS.myCreator, { display_name: displayName, bio, category_ids: categoryIds });
      toast.success("Profil güncellendi", { description: "Herkese açık profiliniz kaydedildi." });
    } catch (err) {
      toast.error("Profil kaydedilemedi", { description: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <AlertTriangle className="size-8" />
        <p>Profil yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profilim</h1>
        <p className="text-muted-foreground">Markalar herkese açık profilinizi görüntülediğinde bunu görür.</p>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/70 p-0">
        <div className="relative h-36 w-full bg-muted">
          <ImageUpload
            endpoint={ENDPOINTS.myCreator}
            field="cover"
            shape="rect"
            value={coverUrl}
            onUploaded={setCoverUrl}
            label="Kapak fotoğrafını değiştir"
            className="h-36 w-full [&>button]:h-36 [&>button]:w-full [&>button]:rounded-none"
          />
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            {/* Avatar is sourced from the account Profile (user.profile.avatar), read-only on
                the Creator serializer — it's updated via AUTH_ENDPOINTS.myProfile, not myCreator. */}
            <ImageUpload
              endpoint={AUTH_ENDPOINTS.myProfile}
              field="avatar"
              shape="circle"
              value={avatarUrl}
              onUploaded={setAvatarUrl}
              label={displayName}
              className="h-20 w-20 border-4 border-background [&>button]:h-20 [&>button]:w-20"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Görünen ad</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Biyografi</Label>
              <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Label>Kategoriler</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelected((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    selected.includes(cat) ? "border-violet-600 bg-violet-600/10 text-violet-700 dark:text-violet-300" : "border-border hover:bg-muted",
                  )}
                >
                  {CATEGORY_LABEL_TR[cat]}
                </button>
              ))}
            </div>
          </div>

          <Button className="mt-6 rounded-full bg-gradient-brand hover:opacity-90" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Profili kaydet"}
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl border-border/70 p-6">
        <h2 className="text-base font-semibold">Bağlı hesaplar</h2>
        <div className="mt-4 space-y-3">
          {(creator?.social_accounts ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Henüz bağlı bir sosyal medya hesabınız yok.</p>
          )}
          {(creator?.social_accounts ?? []).map((s) => (
            <div key={s.platform} className="flex items-center justify-between rounded-xl border border-border/70 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <PlatformIcon platform={s.platform} className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-medium">{PLATFORM_LABEL[s.platform]}</p>
                  <p className="text-xs text-muted-foreground">{s.handle}</p>
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full font-normal">
                {formatCompactNumber(s.followers_count)} takipçi
              </Badge>
            </div>
          ))}
        </div>
        <Separator className="my-5" />
        <Button variant="outline" className="rounded-full">
          + Başka bir hesap bağla
        </Button>
      </Card>
    </div>
  );
}
