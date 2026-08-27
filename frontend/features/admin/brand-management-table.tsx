"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { listBrandsPaginated } from "@/lib/api/brands";
import { performUserAction } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/error-message";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Brand } from "@/types";

const PAGE_SIZE = 20;

export function BrandManagementTable() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Brand | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 350);

  async function load() {
    setLoading(true);
    try {
      const res = await listBrandsPaginated({ page, search: debouncedSearch || undefined });
      setBrands(res.brands);
      setCount(res.count);
    } catch (err) {
      toast.error("Markalar yüklenemedi", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  useEffect(() => setPage(1), [debouncedSearch]);

  async function runAction(brand: Brand, action: "verify" | "unverify" | "suspend") {
    if (!brand.userId) return;
    setPendingId(brand.id);
    try {
      await performUserAction(brand.userId, action);
      toast.success("İşlem tamamlandı");
      await load();
    } catch (err) {
      toast.error("İşlem başarısız", { description: getErrorMessage(err) });
    } finally {
      setPendingId(null);
    }
  }

  async function confirmDeleteAction() {
    if (!confirmDelete?.userId) return;
    setConfirmLoading(true);
    try {
      await performUserAction(confirmDelete.userId, "delete");
      toast.success("Marka silindi");
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error("Silinemedi", { description: getErrorMessage(err) });
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Marka adı ile ara..." className="pl-9 sm:max-w-sm" />
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/70 p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marka</TableHead>
                <TableHead>Sektör</TableHead>
                <TableHead>Web sitesi</TableHead>
                <TableHead>Doğrulama</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell>
                </TableRow>
              ) : brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Marka bulunamadı</TableCell>
                </TableRow>
              ) : (
                brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>
                      <Link href={`/brands/${brand.slug}`} target="_blank" className="flex items-center gap-3">
                        {brand.logoUrl ? (
                          <Image src={brand.logoUrl} alt={brand.name} width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-medium">{brand.name.slice(0, 2).toUpperCase()}</span>
                        )}
                        <span className="max-w-[180px] truncate font-medium hover:text-violet-600">{brand.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{brand.industry || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{brand.website || "—"}</TableCell>
                    <TableCell>
                      {brand.verified ? (
                        <Badge className="rounded-full border-none bg-emerald-100 font-normal text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Doğrulandı</Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full font-normal">Beklemede</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {pendingId === brand.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/brands/${brand.slug}`} target="_blank">Profili görüntüle</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {brand.verified ? (
                              <DropdownMenuItem onClick={() => runAction(brand, "unverify")}>Doğrulamayı kaldır</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => runAction(brand, "verify")}>Onayla</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => runAction(brand, "suspend")}>Askıya al</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(brand)}>Sil</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationControls page={page} pageSize={PAGE_SIZE} totalCount={count} onPageChange={setPage} />
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Markayı sil"
        description={`${confirmDelete?.name ?? ""} hesabı kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        confirmLabel="Sil"
        loading={confirmLoading}
        onConfirm={confirmDeleteAction}
      />
    </div>
  );
}
