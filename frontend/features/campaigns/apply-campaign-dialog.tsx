"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { useAuth } from "@/components/Auth/AuthProvider";
import { applyToCampaign } from "@/lib/api/applications";
import { getErrorMessage } from "@/lib/error-message";
import { handleMembershipRequired } from "@/lib/membership-gate";
import { getMyWallet } from "@/lib/api/wallet";
import { PaymentFlowSteps } from "@/components/shared/payment-flow-steps";
import { usePricing } from "@/components/Pricing/PricingProvider";

export function ApplyCampaignDialog({ campaignId, campaignTitle }: { campaignId: string; campaignTitle: string }) {
  const router = useRouter();
  const { session } = useAuth();
  // Hafta sonu iş almak ücretsizdir: ücret teklifi alanı gösterilmez ve
  // gönderilmez (backend de bu dönemde teklif edilen ücreti yok sayar).
  const { showPrices } = usePricing();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [sending, setSending] = useState(false);
  // Paketsiz creator'a ödeme adımının geleceği pencere açılmadan söylenir.
  const [needsPayment, setNeedsPayment] = useState(false);

  useEffect(() => {
    if (!open || session?.user.role !== "creator") return;
    getMyWallet().then((wallet) => setNeedsPayment(Boolean(wallet?.gates.applicationNeedsPayment)));
  }, [open, session?.user.role]);

  async function handleApply() {
    setSending(true);
    try {
      const application = await applyToCampaign({
        campaignId,
        message,
        proposedRate: showPrices && price ? Number(price) : undefined,
      });
      setOpen(false);
      setMessage("");
      setPrice("");
      toast.success(
        application.alreadyExisted ? "Bu kampanyaya zaten başvurmuştunuz" : "Başvurunuz alındı!",
        {
          description: application.awaitingPayment
            ? "Başvurunuzun markaya iletilmesi için ödeme adımına yönlendiriliyorsunuz."
            : "Başvurunuz markaya iletildi.",
        },
      );
      // Başvurudan sonra ödeme ekranı. Ekran, aktif paketi olan kullanıcıya
      // ödeme değil onay gösterir — bu kararı sunucudan okuduğu paket
      // durumuna göre kendisi verir (bkz. features/payments/payment-checkout).
      router.push(
        `/dashboard/creator/odeme?application=${encodeURIComponent(application.id)}` +
          `&campaign=${encodeURIComponent(campaignTitle)}`,
      );
    } catch (err) {
      // 402 = aktif paket yok/hak bitti. Kullanıcıyı kuru bir hata mesajıyla
      // bırakmak yerine doğrudan paketlere götüren bir eylem sunulur.
      if (handleMembershipRequired(err, { role: "creator", title: "Başvuru hakkınız yok", navigate: router.push })) {
        return;
      }
      toast.error("Başvuru gönderilemedi", { description: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  if (session && session.user.role !== "creator") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full gap-2 rounded-full bg-gradient-brand shadow-sm shadow-violet-600/30 hover:opacity-90">
          <Send className="h-4 w-4" /> Kampanyaya başvur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>&quot;{campaignTitle}&quot; kampanyasına başvur</DialogTitle>
          <DialogDescription>
            {showPrices
              ? "Markaya neden uygun olduğunuzu anlatın ve ücretinizi teklif edin."
              : "Hafta sonu başvurular ücretsiz: markaya neden uygun olduğunuzu anlatmanız yeterli."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {needsPayment && (
            <div className="space-y-2 rounded-2xl border border-violet-600/20 bg-violet-50/50 p-3 dark:bg-violet-500/10">
              <PaymentFlowSteps audience="creator" current={0} />
              <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                Başvurunuz kaydedilir, ardından ödeme ekranına geçersiniz. Ödeme onaylanınca başvurunuz markaya
                iletilir ve mesajlaşma açılır.
              </p>
            </div>
          )}
          {showPrices && (
            <div className="space-y-2">
              <Label>Teklif edilen fiyat (TL)</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="örn. 15.000" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Mesaj</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="İlgili deneyiminizi, içerik tarzınızı ve müsaitlik durumunuzu paylaşın..."
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            İptal
          </Button>
          <Button
            onClick={handleApply}
            disabled={!message.trim() || (showPrices && !price) || sending}
            className="gap-2 bg-gradient-brand hover:opacity-90"
          >
            {sending ? "Gönderiliyor..." : "Başvuruyu gönder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
