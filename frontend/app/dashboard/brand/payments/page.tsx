import { CreditCard, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsCard } from "@/components/Cards/StatsCard";
import { AnalyticsChart } from "@/components/shared/analytics-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { listTransactions, bucketTransactionsByMonth, TRANSACTION_STATUS_LABEL_TR, TRANSACTION_STATUS_STYLE } from "@/lib/api/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function BrandPaymentsPage() {
  const transactions = await listTransactions();
  const totalSpent = transactions.reduce((s, t) => s + parseFloat(t.amount), 0);
  const pending = transactions
    .filter((t) => t.status === "pending" || t.status === "held_in_escrow")
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const monthlySpend = bucketTransactionsByMonth(transactions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ödemeler</h1>
        <p className="text-muted-foreground">Kampanya bütçelerinizi ve ödeme geçmişinizi yönetin.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard label="Toplam harcama" value={formatCurrency(totalSpent, { compact: true })} icon={Wallet} />
        <StatsCard label="Bekleyen ödemeler" value={formatCurrency(pending, { compact: true })} icon={CreditCard} />
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardContent className="flex items-center justify-between px-5 py-5">
            <div>
              <p className="text-sm text-muted-foreground">Ödeme yöntemi</p>
              <p className="mt-1 text-sm font-medium">Visa •••• 4242</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full">
              Güncelle
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Zaman içinde harcama</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlySpend.length > 0 ? (
            <AnalyticsChart data={monthlySpend} className="h-56 w-full" />
          ) : (
            <EmptyState title="Yeterli veri yok" description="Harcama grafiği için henüz yeterli işlem geçmişi bulunmuyor." className="h-56" />
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/70 p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alıcı</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 14).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.payee_email}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                  <TableCell>
                    <Badge className={cn("border-none font-medium", TRANSACTION_STATUS_STYLE[t.status])}>
                      {TRANSACTION_STATUS_LABEL_TR[t.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {formatCurrency(parseFloat(t.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
