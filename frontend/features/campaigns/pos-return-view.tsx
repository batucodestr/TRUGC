"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPosPayment, POS_STATUS_LABEL_TR, type PosPaymentRecord } from "@/lib/api/finance";
import { getErrorMessage } from "@/lib/error-message";
import { formatCurrency } from "@/lib/format";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

/**
 * Sanal POS ödemesinden dönüş ekranı.
 *
 * Ödemenin başarılı olup olmadığına **sunucudaki kayıt** karar verir: banka
 * kullanıcıyı buraya yönlendirirken URL'ye ne yazarsa yazsın, durum
 * `/payments/pos/<oid>/` ucundan okunur. Sağlayıcının sunucudan sunucuya
 * bildirimi bu yönlendirmeden biraz sonra gelebileceği için durum kısa süre
 * boyunca yoklanır.
 */
export function PosReturnView() {
  const searchParams = useSearchParams();
  const merchantOid = searchParams.get("oid");

  const [payment, setPayment] = useState<PosPaymentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);
  const settled = useRef(false);

  const load = useCallback(async () => {
    if (!merchantOid) return;
    try {
      const result = await getPosPayment(merchantOid);
      setPayment(result);
      if (result.status === "paid" || result.status === "failed" || result.status === "cancelled") {
        settled.current = true;
      }
    } catch (err) {
      setError(getErrorMessage(err));
      settled.current = true;
    }
  }, [merchantOid]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!merchantOid || settled.current || polls >= MAX_POLLS) return;
    const timer = setTimeout(() => {
      setPolls((n) => n + 1);
      void load();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [merchantOid, polls, load]);

  if (!merchantOid) {
    return (
      <Card className="mx-auto w-full max-w-md rounded-3xl border-border/70 p-8 text-center">
        <XCircle className="mx-auto size-12 text-rose-600" />
        <h1 className="mt-4 text-xl font-semibold">Ödeme referansı bulunamadı</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bu sayfaya ödeme sonrası yönlendirilmeniz gerekir. Ödemenizi panelinizden tekrar başlatabilirsiniz.
        </p>
        <Button asChild className="mt-6 w-full rounded-full bg-gradient-brand hover:opacity-90">
          <Link href="/dashboard/brand/payments">Ödemelere dön</Link>
        </Button>
      </Card>
    );
  }

  const status = payment?.status;
  const waiting = !payment || status === "created" || status === "pending";

  return (
    <Card className="mx-auto w-full max-w-md rounded-3xl border-border/70 p-8 text-center">
      {error ? (
        <>
          <XCircle className="mx-auto size-12 text-rose-600" />
          <h1 className="mt-4 text-xl font-semibold">Ödeme durumu okunamadı</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </>
      ) : status === "paid" ? (
        <>
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
          <h1 className="mt-4 text-xl font-semibold">Ödemeniz alındı</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {payment?.amount ? `${formatCurrency(Number(payment.amount))} tutarındaki ödeme onaylandı.` : "Ödeme onaylandı."}
            {payment?.purpose === "brand_access" && payment.access_days > 0
              ? ` Creator erişiminiz ${payment.access_days} gün boyunca açık.`
              : ""}
          </p>
        </>
      ) : status === "failed" || status === "cancelled" ? (
        <>
          <XCircle className="mx-auto size-12 text-rose-600" />
          <h1 className="mt-4 text-xl font-semibold">Ödeme tamamlanamadı</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {payment?.failure_reason || "Ödeme sağlayıcısı işlemi onaylamadı. Kartınızdan tutar çekilmediyse tekrar deneyebilirsiniz."}
          </p>
        </>
      ) : (
        <>
          {polls >= MAX_POLLS ? <Clock className="mx-auto size-12 text-amber-600" /> : <Loader2 className="mx-auto size-12 animate-spin text-violet-600" />}
          <h1 className="mt-4 text-xl font-semibold">
            {polls >= MAX_POLLS ? "Ödeme hâlâ doğrulanıyor" : "Ödemeniz doğrulanıyor"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {polls >= MAX_POLLS
              ? "Banka bildirimi biraz gecikebilir. Bu sayfayı kapatabilirsiniz; ödeme onaylandığında erişiminiz otomatik açılır."
              : "Banka bildirimi bekleniyor, bu birkaç saniye sürebilir."}
          </p>
        </>
      )}

      {payment && (
        <p className="mt-4 text-xs text-muted-foreground">
          Sipariş no: {payment.merchant_oid} · Durum: {POS_STATUS_LABEL_TR[payment.status]}
        </p>
      )}

      <Button
        asChild
        variant={waiting ? "outline" : "default"}
        className={waiting ? "mt-6 w-full rounded-full" : "mt-6 w-full rounded-full bg-gradient-brand hover:opacity-90"}
      >
        <Link href="/dashboard/brand/payments">Ödemelere dön</Link>
      </Button>
    </Card>
  );
}
