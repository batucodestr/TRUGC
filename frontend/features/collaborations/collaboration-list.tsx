"use client";

// İş birlikleri listesi (marka ve creator). Durum akışı:
// İçerik Bekleniyor → Teslim Edildi → Revizyon → Onaylandı → Ödendi.
// Tüm kritik kontroller (yetki, durum geçişi, tutar) sunucudadır; bu bileşen
// yalnızca sunucunun izin verdiği eylemleri düğme olarak gösterir.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, ExternalLink, Loader2, MessageSquare, RotateCcw, Send, Star, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { PaytrFrame } from "@/components/shared/paytr-frame";
import {
  approveCollaboration,
  requestRevision,
  submitContent,
  COLLABORATION_STATUS_TR,
  type Collaboration,
  type CollaborationStatus,
} from "@/lib/api/collaborations";
import { startCollaborationCheckout } from "@/lib/api/finance";
import { createReview } from "@/lib/api/reviews";
import { getErrorMessage } from "@/lib/error-message";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const BADGE: Record<CollaborationStatus, string> = {
  awaiting_content: "bg-white/10 text-[#d4d2e3]",
  delivered: "bg-info/20 text-[#7db5ff]",
  revision: "bg-crown/15 text-crown",
  approved: "bg-brand/25 text-violet-300",
  paid: "bg-success/15 text-success",
  cancelled: "bg-red-500/15 text-red-400",
};

export function CollaborationList({ role, items }: { role: "brand" | "creator"; items: Collaboration[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [revisionFor, setRevisionFor] = useState<Collaboration | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitFor, setSubmitFor] = useState<Collaboration | null>(null);
  const [form, setForm] = useState<{ url: string; note: string; file: File | null }>({ url: "", note: "", file: null });
  const [payFrame, setPayFrame] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<Collaboration | null>(null);
  const [review, setReview] = useState({ rating: 5, comment: "" });

  async function run(id: number, fn: () => Promise<unknown>, ok: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function pay(c: Collaboration) {
    setBusy(c.id);
    try {
      const checkout = await startCollaborationCheckout(c.id);
      if (checkout.redirect_url) setPayFrame(checkout.redirect_url);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Henüz iş birliği yok"
        description={role === "brand" ? "Bir başvuruyu kabul ettiğinizde iş birliği burada başlar." : "Başvurun kabul edilince iş birliği burada başlar."}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {items.map((c) => {
          const latest = c.submissions[0];
          return (
            <Card key={c.id} className="glow-hover">
              <div className="flex flex-wrap items-start justify-between gap-4 px-5">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white">{c.campaign_title}</h3>
                  <p className="mt-0.5 text-sm text-text-soft">
                    {role === "brand" ? c.creator_name : c.brand_name}
                    {c.due_at && <> · Son teslim {formatDate(c.due_at)}</>}
                  </p>
                </div>
                <div className="text-right">
                  <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", BADGE[c.status])}>{COLLABORATION_STATUS_TR[c.status]}</span>
                  <p className="mt-2 text-xl font-extrabold text-white">{formatCurrency(Number(role === "brand" ? c.charge.total : c.agreed_amount))}</p>
                  {role === "brand" && (
                    <p className="text-xs text-text-soft">
                      Bütçe {formatCurrency(Number(c.charge.budget))} + %10 komisyon {formatCurrency(Number(c.charge.commission))} (KDV dahil)
                    </p>
                  )}
                  {role === "creator" && <p className="text-xs text-text-soft">Komisyon sizden kesilmez</p>}
                </div>
              </div>

              {latest && (
                <div className="mx-5 rounded-xl border border-border bg-white/[0.03] p-3 text-sm">
                  <p className="font-semibold text-white">{latest.revision_number === 0 ? "İlk teslim" : `Revizyon ${latest.revision_number}`}</p>
                  {latest.url && (
                    <a href={latest.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-brand-light hover:underline">
                      İçeriği aç <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                  {latest.file && (
                    <a href={latest.file} target="_blank" rel="noopener noreferrer" className="mt-1 ml-3 inline-flex items-center gap-1 text-brand-light hover:underline">
                      Dosyayı aç <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                  {latest.note && <p className="mt-1 text-text-soft">{latest.note}</p>}
                  {latest.feedback && <p className="mt-2 rounded-lg bg-crown/10 p-2 text-crown">Revizyon notu: {latest.feedback}</p>}
                </div>
              )}

              <div className="flex flex-wrap gap-2 px-5">
                {role === "creator" && (c.status === "awaiting_content" || c.status === "revision") && (
                  <Button onClick={() => setSubmitFor(c)}><Upload className="h-4 w-4" aria-hidden /> İçerik Teslim Et</Button>
                )}
                {role === "brand" && c.status === "delivered" && (
                  <>
                    <Button disabled={busy === c.id} onClick={() => run(c.id, () => approveCollaboration(c.id), "İçerik onaylandı.")}>
                      {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" aria-hidden />} Onayla
                    </Button>
                    <Button variant="outline" onClick={() => setRevisionFor(c)}><RotateCcw className="h-4 w-4" aria-hidden /> Revizyon İste</Button>
                  </>
                )}
                {role === "brand" && c.status === "approved" && c.payment_status !== "paid" && (
                  <Button disabled={busy === c.id} onClick={() => pay(c)}>
                    {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" aria-hidden />} Ödemeyi Yap ({formatCurrency(Number(c.charge.total))})
                  </Button>
                )}
                {role === "brand" && (c.status === "approved" || c.status === "paid") && (
                  <Button variant="outline" onClick={() => setReviewFor(c)}><Star className="h-4 w-4" aria-hidden /> Creator&apos;ı Değerlendir</Button>
                )}
                <Button variant="outline" asChild>
                  <a href="/dashboard/messages"><MessageSquare className="h-4 w-4" aria-hidden /> Mesajlar</a>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Revizyon isteği */}
      <Dialog open={!!revisionFor} onOpenChange={(o) => !o && setRevisionFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Revizyon iste</DialogTitle><DialogDescription>Creator&apos;a neyin değişmesi gerektiğini yazın.</DialogDescription></DialogHeader>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="Ör. Logoyu biraz daha büyük gösterir misiniz?" />
          <DialogFooter>
            <Button disabled={!feedback.trim() || busy !== null} onClick={async () => { const c = revisionFor!; await run(c.id, () => requestRevision(c.id, feedback), "Revizyon istendi."); setRevisionFor(null); setFeedback(""); }}>
              <Send className="h-4 w-4" aria-hidden /> Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* İçerik teslimi */}
      <Dialog open={!!submitFor} onOpenChange={(o) => !o && setSubmitFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>İçerik teslim et</DialogTitle><DialogDescription>Dosya yükleyin (görsel, video, PDF) veya içeriğin bağlantısını yapıştırın.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input type="file" accept="image/*,video/mp4,video/quicktime,application/pdf,.zip" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} aria-label="Dosya" />
            <Input type="url" placeholder="https://… içerik bağlantısı" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Textarea rows={3} placeholder="Marka için not (isteğe bağlı)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <DialogFooter>
            <Button disabled={(!form.file && !form.url) || busy !== null} onClick={async () => { const c = submitFor!; await run(c.id, () => submitContent(c.id, form), "İçerik teslim edildi."); setSubmitFor(null); setForm({ url: "", note: "", file: null }); }}>
              <Upload className="h-4 w-4" aria-hidden /> Teslim Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PayTR iFrame */}
      <Dialog open={!!payFrame} onOpenChange={(o) => !o && setPayFrame(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Güvenli ödeme</DialogTitle><DialogDescription>Kart bilgileri yalnızca PayTR&apos;nin 3D Secure sayfasına girilir.</DialogDescription></DialogHeader>
          {payFrame && <PaytrFrame url={payFrame} />}
        </DialogContent>
      </Dialog>

      {/* Değerlendirme */}
      <Dialog open={!!reviewFor} onOpenChange={(o) => !o && setReviewFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Creator&apos;ı değerlendir</DialogTitle><DialogDescription>{reviewFor?.creator_name} ile iş birliğinizi puanlayın.</DialogDescription></DialogHeader>
          <div className="flex gap-1" role="radiogroup" aria-label="Puan">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={review.rating === n} aria-label={`${n} yıldız`} onClick={() => setReview({ ...review, rating: n })}>
                <Star className={cn("h-8 w-8", n <= review.rating ? "fill-crown text-crown" : "text-white/30")} />
              </button>
            ))}
          </div>
          <Textarea rows={3} placeholder="Yorumunuz (isteğe bağlı)" value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} />
          <DialogFooter>
            <Button disabled={busy !== null} onClick={async () => { const c = reviewFor!; await run(c.id, () => createReview(c.campaign, c.creator_user_id, review.rating, review.comment), "Değerlendirmeniz kaydedildi."); setReviewFor(null); }}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
