import { Activity, CheckCircle2, Clock, Cpu, Database, HardDrive, Server, ShieldCheck, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatsCard } from "@/components/Cards/StatsCard";
import { getSystemStatus } from "@/lib/api/admin";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHECK_LABEL_TR: Record<string, string> = { database: "PostgreSQL", redis: "Redis", celery: "Celery Worker", caddy: "Caddy" };
const CHECK_ICON: Record<string, typeof Database> = { database: Database, redis: Server, celery: Activity, caddy: ShieldCheck };

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}g ${hours}s`;
  if (hours > 0) return `${hours}s ${minutes}dk`;
  return `${minutes}dk`;
}

export default async function AdminSystemStatusPage() {
  const status = await getSystemStatus();
  const isHealthy = status.status === "ok";

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sistem durumu</h1>
          <p className="text-muted-foreground">Son kontrol: {formatRelativeTime(status.checkedAt)}</p>
        </div>
        <Badge
          className={cn(
            "gap-1.5 rounded-full border-none px-3 py-1.5 font-medium",
            isHealthy ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
          )}
        >
          {isHealthy ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {isHealthy ? "Tüm sistemler çalışıyor" : "Bazı servisler etkilenmiş"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["database", "redis", "celery", "caddy"] as const).map((key) => {
          const value = status.checks[key];
          const ok = value === "ok";
          const Icon = CHECK_ICON[key];
          return (
            <Card key={key} className="rounded-2xl border-border/70">
              <CardContent className="flex items-center gap-4 px-5 py-5">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    ok ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">{CHECK_LABEL_TR[key]}</p>
                  <p className="truncate text-sm font-semibold">{ok ? "Çalışıyor" : value}</p>
                  {key === "celery" && <p className="text-xs text-muted-foreground">{status.workerCount} aktif worker</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="space-y-2 px-5 py-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HardDrive className="h-4 w-4" /> Disk kullanımı
            </div>
            <Progress value={status.disk.percent} />
            <p className="text-xs text-muted-foreground">{status.disk.usedGb} GB / {status.disk.totalGb} GB (%{status.disk.percent})</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70">
          <CardContent className="space-y-2 px-5 py-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Cpu className="h-4 w-4" /> Bellek kullanımı
            </div>
            {status.memory ? (
              <>
                <Progress value={status.memory.percent} />
                <p className="text-xs text-muted-foreground">{status.memory.usedGb} GB / {status.memory.totalGb} GB (%{status.memory.percent})</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Ölçülemedi</p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex items-center gap-4 px-5 py-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Çalışma süresi (uptime)</p>
              <p className="text-lg font-semibold">{formatUptime(status.uptimeSeconds)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Platform sayıları</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <StatsCard label="Kullanıcı" value={String(status.counts.users)} icon={Database} />
          <StatsCard label="Creator" value={String(status.counts.creators)} icon={Database} />
          <StatsCard label="Marka" value={String(status.counts.brands)} icon={Database} />
          <StatsCard label="Kampanya" value={String(status.counts.campaigns)} icon={Database} />
          <StatsCard label="Konuşma" value={String(status.counts.conversations)} icon={Database} />
        </div>
      </div>
    </div>
  );
}
