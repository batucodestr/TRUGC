"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import type { CreatorPackage } from "@/types";
import { createPackage, updatePackage } from "@/lib/api/creators";
import { getErrorMessage } from "@/lib/error-message";

interface PackageEditorDialogProps {
  pkg?: CreatorPackage;
  trigger?: React.ReactNode;
}

export function PackageEditorDialog({ pkg, trigger }: PackageEditorDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(pkg);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = {
      title: String(form.get("title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      price: Number(form.get("price")),
      turnaroundDays: Number(form.get("turnaroundDays")),
      deliverables: String(form.get("deliverables") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };

    setSaving(true);
    try {
      if (isEdit && pkg) {
        await updatePackage(pkg.id, input);
      } else {
        await createPackage(input);
      }
      setOpen(false);
      router.refresh();
      toast.success(isEdit ? "Paket güncellendi" : "Paket oluşturuldu", {
        description: isEdit ? `"${pkg?.title}" üzerindeki değişiklikler kaydedildi.` : "Yeni paketiniz artık profilinizde görünüyor.",
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2 rounded-full bg-gradient-brand hover:opacity-90">
            <Plus className="h-4 w-4" /> Yeni paket
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Paketi düzenle" : "Paket oluştur"}</DialogTitle>
            <DialogDescription>Pakete neyin dahil olduğunu belirtin ve fiyatınızı belirleyin.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Paket başlığı</Label>
              <Input id="title" name="title" defaultValue={pkg?.title} placeholder="örn. Tek Gönderi" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea id="description" name="description" defaultValue={pkg?.description} rows={3} placeholder="Bu pakete neler dahil?" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Fiyat (USD)</Label>
                <Input id="price" name="price" type="number" min={0} step="0.01" defaultValue={pkg?.price} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="turnaroundDays">Teslim süresi (gün)</Label>
                <Input id="turnaroundDays" name="turnaroundDays" type="number" min={1} defaultValue={pkg?.turnaroundDays ?? 5} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliverables">Teslimatlar (satır başına bir tane)</Label>
              <Textarea
                id="deliverables"
                name="deliverables"
                defaultValue={pkg?.deliverables.join("\n")}
                rows={3}
                placeholder={"1 Instagram Reel\nKullanım hakları dahil"}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              İptal
            </Button>
            <Button type="submit" className="bg-gradient-brand hover:opacity-90" disabled={saving}>
              {saving ? "Kaydediliyor..." : isEdit ? "Değişiklikleri kaydet" : "Paket oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
