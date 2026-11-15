import Link from "next/link";
import { CreditCard, Percent, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsCard } from "@/components/Cards/StatsCard";
import { BrandAccessPurchase } from "@/features/brands/brand-access-purchase";
import { getMyBrandPayments, BRAND_PAYMENT_STATUS_TR, type BrandPaymentRow } from "@/lib/api/finance";
import { formatCurrency, formatDate } from "@/lib/format";

const VARIANT: Record<BrandPaymentRow["status"], "success" | "info" | "neutral" | "premium"> = {
  paid: "success", pending: "info", refunded: "neutral", failed: "premium",
};

/** Marka "Ödemeler": iş birliği ödemeleri (bütçe + %10 komisyon, KDV dahil). Creator hak edişlerinden ayrı tablodur. */
export default async function BrandPaymentsPage() {
  const data = await getMyBrandPayments();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Ödemeler</h1>
        <p className="mt-1 text-text-soft">İş birliği ödemeleriniz: creator bütçesi + %10 platform komisyonu (tutarlar KDV dahildir).</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard label="Toplam Ödenen" value={formatCurrency(Number(data.totals.total))} icon={Wallet} />
        <StatsCard label="Platform Komisyonu" value={formatCurrency(Number(data.totals.commission))} icon={Percent} />
        <BrandAccessPurchase />
      </div>

      {data.pending_count > 0 && (
        <Card className="border-brand-light/40">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5">
            <p className="flex items-center gap-2 text-white"><CreditCard className="h-5 w-5 text-brand-light" aria-hidden /> Ödeme bekleyen {data.pending_count} iş birliğiniz var.</p>
            <Button asChild><Link href="/dashboard/brand/collaborations">İş Birliklerine Git</Link></Button>
          </div>
        </Card>
      )}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Kampanya</TableHead><TableHead>Creator</TableHead><TableHead>Tarih</TableHead><TableHead>Durum</TableHead><TableHead className="text-right">Bütçe</TableHead><TableHead className="text-right">Komisyon</TableHead><TableHead className="text-right">Toplam</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.results.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-text-soft">Henüz ödeme yok.</TableCell></TableRow>}
              {data.results.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.campaign_title}</TableCell>
                  <TableCell className="text-text-soft">{p.creator_name}</TableCell>
                  <TableCell className="text-text-soft">{formatDate(p.paid_at ?? p.created_at)}</TableCell>
                  <TableCell><Badge variant={VARIANT[p.status]}>{BRAND_PAYMENT_STATUS_TR[p.status]}</Badge></TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(p.budget_amount))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(p.commission_amount))}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(Number(p.total_amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
