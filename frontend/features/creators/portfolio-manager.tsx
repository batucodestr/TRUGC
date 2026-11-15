"use client";

// İçerik portföyü: creator'ın örnek video/görsel çalışmaları (marka profilinde görünür).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/upload/file-upload";
import { apiClient } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { getErrorMessage } from "@/lib/error-message";

export interface PortfolioEntry {
  id: number;
  title: string;
  media: string | null;
  external_url: string;
}

const isVideo = (url: string | null) => !!url && /\.(mp4|mov|webm)(\?|$)/i.test(url);

export function PortfolioManager({ items }: { items: PortfolioEntry[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");

  async function remove(id: number) {
    try {
      await apiClient.delete(`${ENDPOINTS.myPortfolio}${id}/`);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Card id="portfolio">
      <div className="space-y-4 px-5">
        <h2 className="text-xl font-bold text-white">İçerik Portföyüm</h2>
        <p className="text-sm text-text-soft">En az 3 içerik yüklemen profil tamamlama puanını yükseltir. Video (mp4, mov), görsel veya PDF yükleyebilirsin.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border border-border bg-white/[0.03]">
              {isVideo(item.media) ? (
                <video src={item.media!} controls preload="metadata" className="aspect-video w-full bg-black object-cover" />
              ) : item.media ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.media} alt={item.title} className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center text-sm text-text-soft">Bağlantı</div>
              )}
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                <Button variant="ghost" size="icon-sm" aria-label="Sil" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
          <Input placeholder="İçerik başlığı" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="İçerik başlığı" />
          <FileUpload
            endpoint={ENDPOINTS.myPortfolio}
            field="media"
            extraFields={{ title: title || "Portföy içeriği", kind: "portfolio" }}
            accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp,application/pdf"
            label="Portföye içerik yükle"
            onUploaded={() => { setTitle(""); router.refresh(); }}
          />
        </div>
      </div>
    </Card>
  );
}
