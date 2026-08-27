"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, MoreHorizontal, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { PackageEditorDialog } from "@/features/creators/package-editor-dialog";
import { deletePackage } from "@/lib/api/creators";
import { getErrorMessage } from "@/lib/error-message";
import { formatCurrency } from "@/lib/format";
import type { CreatorPackage } from "@/types";

export function PackagesGrid({ packages }: { packages: CreatorPackage[] }) {
  const router = useRouter();

  async function handleDelete(pkg: CreatorPackage) {
    try {
      await deletePackage(pkg.id);
      router.refresh();
      toast.success("Paket silindi", { description: `"${pkg.title}" artık profilinizde görünmüyor.` });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (packages.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Henüz paket oluşturmadınız"
        description="Markaların herkese açık profilinizde göreceği teklifleri oluşturmak için “Yeni paket” butonunu kullanın."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {packages.map((pkg) => (
        <Card
          key={pkg.id}
          className={`relative flex flex-col rounded-2xl p-5 ${pkg.popular ? "border-violet-600 shadow-lg shadow-violet-600/10" : "border-border/70"}`}
        >
          <div className="flex items-start justify-between">
            <div>
              {pkg.popular && <Badge className="mb-2 border-none bg-gradient-brand text-white">En popüler</Badge>}
              <p className="font-semibold">{pkg.title}</p>
            </div>
            <div className="-mt-1 -mr-1 flex items-center gap-0.5">
              <PackageEditorDialog
                pkg={pkg}
                trigger={
                  <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs">
                    Düzenle
                  </Button>
                }
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onClick={() => handleDelete(pkg)}>
                    Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{pkg.description}</p>
          <p className="mt-4 text-2xl font-semibold">{formatCurrency(pkg.price)}</p>
          <ul className="mt-4 flex-1 space-y-2">
            {pkg.deliverables.map((d) => (
              <li key={d} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> {d}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{pkg.turnaroundDays} günde teslim</p>
        </Card>
      ))}
    </div>
  );
}
