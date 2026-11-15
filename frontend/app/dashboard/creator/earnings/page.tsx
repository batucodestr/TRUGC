import { CheckCircle2, Clock, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsCard } from "@/components/Cards/StatsCard";
import { EarningsBars } from "@/components/shared/earnings-bars";
import { EmptyState } from "@/components/shared/empty-state";
import { PayoutProfileForm } from "@/features/payments/payout-profile-form";
import { getMyEarnings, getMyPayoutProfile, EARNING_STATUS_TR, type EarningRow } from "@/lib/api/finance";
import { formatCurrency, formatDate } from "@/lib/format";

const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const VARIANT: Record<EarningRow["status"], "success" | "info" | "neutral"> = { paid: "success", payable: "info", cancelled: "neutral" };

/** Creator "Kazançlarım": hak edişler marka ödemelerinden ayrı bir tablodan (CreatorEarning) gelir. */
export default async function CreatorEarningsPage() {
  const [earnings, payout] = await Promise.all([getMyEarnings(), getMyPayoutProfile().catch(() => null)]);
  const bars = earnings.monthly.map((m) => ({ label: MONTHS_TR[Number(m.month.slice(5)) - 1], value: Number(m.total) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Kazançlarım</h1>
        <p className="mt-1 text-text-soft">Markaların ödediği tutarın tamamı size aktarılır; %10 platform komisyonu markaya eklenir.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard label="Toplam Kazanç" value={formatCurrency(Number(earnings.totals.total))} icon={Wallet} />
        <StatsCard label="Ödeme Bekleyen" value={formatCurrency(Number(earnings.totals.payable))} icon={Clock} />
        <StatsCard label="Hesaba Aktarılan" value={formatCurrency(Number(earnings.totals.paid))} icon={CheckCircle2} />
      </div>

      <Card>
        <h2 className="px-5 text-xl font-bold text-white">Aylık Kazanç</h2>
        <div className="px-5">{bars.length > 0 ? <EarningsBars data={bars} /> : <EmptyState title="Henüz kazanç yok" description="Marka ödemesi alındığında hak edişleriniz burada görünür." className="h-36" />}</div>
      </Card>

      <PayoutProfileForm initial={payout} />

      <Card className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Kampanya</TableHead><TableHead>Marka</TableHead><TableHead>Tarih</TableHead><TableHead>Durum</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader>
            <TableBody>
              {earnings.results.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-text-soft">Kayıt yok.</TableCell></TableRow>}
              {earnings.results.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.campaign_title}</TableCell>
                  <TableCell className="text-text-soft">{e.brand_name}</TableCell>
                  <TableCell className="text-text-soft">{formatDate(e.created_at)}</TableCell>
                  <TableCell><Badge variant={VARIANT[e.status]}>{EARNING_STATUS_TR[e.status]}</Badge></TableCell>
                  <TableCell className="text-right font-bold text-success">+{formatCurrency(Number(e.amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
