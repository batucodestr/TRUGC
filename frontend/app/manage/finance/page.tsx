import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MarkPaidButton, RefundForm } from "@/features/admin/finance-actions";
import { apiClient } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { EARNING_STATUS_TR, type EarningRow } from "@/lib/api/finance";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata = { title: "Finans — TRUGC Yönetim" };

type AdminEarning = EarningRow;
interface LedgerRow {
  id: number; type_label: string; party_role: string; party_email: string | null; amount: string;
  commission_amount: string; vat_amount: string; order_no: string; reverses: number | null; note: string; created_at: string;
}
interface Page<T> { results: T[] }

export default async function AdminFinancePage() {
  const [earnings, ledger] = await Promise.all([
    apiClient.get<Page<AdminEarning>>(ENDPOINTS.adminEarnings),
    apiClient.get<Page<LedgerRow>>(ENDPOINTS.adminLedger),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Finans</h1>
        <p className="mt-1 text-text-soft">Creator hak edişleri, muhasebe defteri ve iadeler. Defter kayıtları silinmez; düzeltmeler ters kayıtla yapılır.</p>
      </div>

      <Card>
        <h2 className="px-5 text-xl font-bold text-white">Hak edişler</h2>
        <div className="overflow-x-auto px-2">
          <Table>
            <TableHeader><TableRow><TableHead>Kampanya</TableHead><TableHead>Marka</TableHead><TableHead>Tarih</TableHead><TableHead>Durum</TableHead><TableHead className="text-right">Tutar</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {earnings.results.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-text-soft">Hak ediş yok.</TableCell></TableRow>}
              {earnings.results.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.campaign_title}</TableCell>
                  <TableCell className="text-text-soft">{e.brand_name}</TableCell>
                  <TableCell className="text-text-soft">{formatDate(e.created_at)}</TableCell>
                  <TableCell><Badge variant={e.status === "paid" ? "success" : e.status === "payable" ? "info" : "neutral"}>{EARNING_STATUS_TR[e.status]}</Badge></TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(Number(e.amount))}</TableCell>
                  <TableCell className="text-right">{e.status === "payable" && <MarkPaidButton earningId={e.id} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card>
        <div className="space-y-3 px-5">
          <h2 className="text-xl font-bold text-white">İade</h2>
          <RefundForm />
        </div>
      </Card>

      <Card>
        <h2 className="px-5 text-xl font-bold text-white">Muhasebe defteri</h2>
        <div className="overflow-x-auto px-2">
          <Table>
            <TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>İşlem</TableHead><TableHead>Taraf</TableHead><TableHead>Sipariş no</TableHead><TableHead className="text-right">Tutar</TableHead><TableHead className="text-right">Komisyon</TableHead><TableHead className="text-right">KDV</TableHead></TableRow></TableHeader>
            <TableBody>
              {ledger.results.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-text-soft">{formatDate(l.created_at)}</TableCell>
                  <TableCell>{l.type_label}{l.reverses && <Badge variant="neutral" className="ml-2">ters kayıt</Badge>}</TableCell>
                  <TableCell className="text-text-soft">{l.party_email ?? "Platform"} <span className="text-xs">({l.party_role})</span></TableCell>
                  <TableCell className="font-mono text-xs">{l.order_no}</TableCell>
                  <TableCell className={`text-right font-bold ${Number(l.amount) < 0 ? "text-red-400" : ""}`}>{formatCurrency(Number(l.amount))}</TableCell>
                  <TableCell className="text-right text-text-soft">{formatCurrency(Number(l.commission_amount))}</TableCell>
                  <TableCell className="text-right text-text-soft">{formatCurrency(Number(l.vat_amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
