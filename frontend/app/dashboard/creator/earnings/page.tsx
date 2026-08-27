import { ArrowDownToLine, CheckCircle2, Clock, Wallet } from "lucide-react";
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

export default async function CreatorEarningsPage() {
  const transactions = await listTransactions();
  const totalEarned = transactions.filter((t) => t.status === "released").reduce((s, t) => s + parseFloat(t.amount), 0);
  const pending = transactions
    .filter((t) => t.status === "pending" || t.status === "held_in_escrow")
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const monthlyEarnings = bucketTransactionsByMonth(transactions, ["released"]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kazançlar</h1>
          <p className="text-muted-foreground">Gelirinizi ve kullanılabilir ödemelerinizi takip edin.</p>
        </div>
        <Button className="gap-2 rounded-full bg-gradient-brand hover:opacity-90">
          <ArrowDownToLine className="h-4 w-4" /> Para çek
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard label="Toplam kazanç" value={formatCurrency(totalEarned, { compact: true })} icon={Wallet} />
        <StatsCard label="Bekleyen ödemeler" value={formatCurrency(pending, { compact: true })} icon={Clock} />
        <StatsCard label="Toplam işlem" value={String(transactions.length)} icon={CheckCircle2} />
      </div>

      <Card className="rounded-2xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Zaman içinde kazanç</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyEarnings.length > 0 ? (
            <AnalyticsChart data={monthlyEarnings} className="h-56 w-full" />
          ) : (
            <EmptyState title="Yeterli veri yok" description="Kazanç grafiği için henüz yeterli işlem geçmişi bulunmuyor." className="h-56" />
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/70 p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Başvuru</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">Başvuru #{t.application_id}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                  <TableCell>
                    <Badge className={cn("border-none font-medium", TRANSACTION_STATUS_STYLE[t.status])}>
                      {TRANSACTION_STATUS_LABEL_TR[t.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    +{formatCurrency(parseFloat(t.amount))}
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
