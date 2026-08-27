"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateCampaign, deleteCampaign } from "@/lib/api/campaigns";
import { getErrorMessage } from "@/lib/error-message";

export function CampaignRowActions({ campaignId, slug, status }: { campaignId: string; slug: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleClose() {
    startTransition(async () => {
      try {
        await updateCampaign(campaignId, { status: "cancelled" });
        toast.success("Kampanya kapatıldı");
        router.refresh();
      } catch (err) {
        toast.error("Kampanya kapatılamadı", { description: getErrorMessage(err) });
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteCampaign(campaignId);
        toast.success("Kampanya silindi");
        setConfirmDelete(false);
        router.refresh();
      } catch (err) {
        toast.error("Kampanya silinemedi", { description: getErrorMessage(err) });
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pending}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/brand/campaigns/${slug}`}>Detayları görüntüle</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/campaigns/${slug}`}>Genel sayfayı önizle</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/brand/campaigns/${slug}/edit`}>Düzenle</Link>
          </DropdownMenuItem>
          {status !== "cancelled" && (
            <DropdownMenuItem onSelect={handleClose}>Kampanyayı kapat</DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            Kampanyayı sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Kampanyayı sil</DialogTitle>
            <DialogDescription>Bu işlem geri alınamaz. Kampanya kalıcı olarak silinecek.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setConfirmDelete(false)}>
              İptal
            </Button>
            <Button disabled={pending} onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
