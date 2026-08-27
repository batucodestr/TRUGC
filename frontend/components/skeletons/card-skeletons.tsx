import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function CreatorCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-3xl border-border/70 p-0 shadow-sm">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center justify-between border-t border-border/70 pt-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </Card>
  );
}

export function CampaignCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-3xl border-border/70 p-0 shadow-sm">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center justify-between border-t border-border/70 pt-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </Card>
  );
}

export function StatsCardSkeleton() {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>
    </Card>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-border/60 px-4 py-4 last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}
