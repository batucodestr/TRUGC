"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { UserDetailDialog } from "@/features/admin/user-detail-dialog";
import { listPlatformUsers, bulkUserAction, performUserAction, type UserAdminAction } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/error-message";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlatformUser } from "@/types";

const PAGE_SIZE = 20;

const STATUS_STYLE = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  suspended: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  banned: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

const STATUS_LABEL_TR: Record<PlatformUser["status"], string> = {
  active: "Aktif",
  pending: "Beklemede",
  suspended: "Askıya alındı",
  banned: "Banlandı",
};

const ROLE_LABEL_TR: Record<string, string> = {
  creator: "Creator",
  brand: "Marka",
  moderator: "Moderatör",
  admin: "Admin",
};

export function UserManagementTable() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | "creator" | "brand" | "moderator" | "admin">("all");
  const [status, setStatus] = useState<"all" | "active" | "pending" | "suspended" | "banned">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "single" | "bulk"; action: UserAdminAction; ids: string[] } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 350);

  async function load() {
    setLoading(true);
    try {
      const res = await listPlatformUsers({
        page,
        search: debouncedSearch || undefined,
        role: role === "all" ? undefined : role,
        status: status === "all" ? undefined : status,
      });
      setUsers(res.users);
      setCount(res.count);
    } catch (err) {
      toast.error("Kullanıcılar yüklenemedi", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, role, status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, status]);

  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) return new Set();
      return new Set(users.map((u) => u.id));
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runSingleAction(user: PlatformUser, action: UserAdminAction) {
    setPendingId(user.id);
    try {
      await performUserAction(user.id, action);
      toast.success("İşlem tamamlandı");
      await load();
    } catch (err) {
      toast.error("İşlem başarısız", { description: getErrorMessage(err) });
    } finally {
      setPendingId(null);
    }
  }

  async function runConfirmedAction() {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      if (confirm.kind === "bulk") {
        const { updated } = await bulkUserAction(confirm.ids, confirm.action);
        toast.success(`${updated} kullanıcı güncellendi`);
        setSelected(new Set());
      } else {
        await performUserAction(confirm.ids[0], confirm.action);
        toast.success("İşlem tamamlandı");
      }
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error("İşlem başarısız", { description: getErrorMessage(err) });
    } finally {
      setConfirmLoading(false);
    }
  }

  const confirmCopy = useMemo(() => {
    if (!confirm) return null;
    const n = confirm.ids.length;
    const subject = confirm.kind === "bulk" ? `${n} kullanıcı` : "bu kullanıcı";
    const copy: Record<UserAdminAction, { title: string; description: string; label: string }> = {
      delete: { title: "Kullanıcıyı sil", description: `${subject} kalıcı olarak silinecek. Bu işlem geri alınamaz.`, label: "Sil" },
      ban: { title: "Kullanıcıyı banla", description: `${subject} kalıcı olarak banlanacak.`, label: "Banla" },
      suspend: { title: "Kullanıcıyı askıya al", description: `${subject} askıya alınacak.`, label: "Askıya al" },
      activate: { title: "Kullanıcıyı etkinleştir", description: `${subject} yeniden etkinleştirilecek.`, label: "Etkinleştir" },
      unban: { title: "Ban kaldır", description: `${subject} üzerindeki ban kaldırılacak.`, label: "Ban kaldır" },
      verify: { title: "Doğrula", description: `${subject} doğrulanmış olarak işaretlenecek.`, label: "Doğrula" },
      unverify: { title: "Doğrulamayı kaldır", description: `${subject} için doğrulama kaldırılacak.`, label: "Kaldır" },
      change_role: { title: "Rol değiştir", description: `${subject} için rol değiştirilecek.`, label: "Değiştir" },
    };
    return copy[confirm.action];
  }, [confirm]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İsim veya e-posta ile ara..." className="pl-9" />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm roller</SelectItem>
            <SelectItem value="creator">Creator&apos;lar</SelectItem>
            <SelectItem value="brand">Markalar</SelectItem>
            <SelectItem value="moderator">Moderatörler</SelectItem>
            <SelectItem value="admin">Adminler</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="pending">Beklemede</SelectItem>
            <SelectItem value="suspended">Askıya alındı</SelectItem>
            <SelectItem value="banned">Banlandı</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-600/30 bg-violet-600/5 px-4 py-2.5 text-sm">
          <span className="font-medium">{selected.size} kullanıcı seçildi</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirm({ kind: "bulk", action: "suspend", ids: [...selected] })}>
              Toplu askıya al
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirm({ kind: "bulk", action: "verify", ids: [...selected] })}>
              Toplu doğrula
            </Button>
            <Button size="sm" variant="destructive" className="rounded-full" onClick={() => setConfirm({ kind: "bulk", action: "delete", ids: [...selected] })}>
              Toplu sil
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden rounded-2xl border-border/70 p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Tümünü seç" />
                </TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Kayıt Tarihi</TableHead>
                <TableHead>Son Giriş</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Kullanıcı bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox checked={selected.has(user.id)} onCheckedChange={() => toggleOne(user.id)} aria-label={`${user.name} seç`} />
                    </TableCell>
                    <TableCell>
                      <button className="flex items-center gap-3 text-left" onClick={() => setDetailUserId(user.id)}>
                        {user.avatarUrl ? (
                          <Image src={user.avatarUrl} alt={user.name} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {user.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium hover:text-violet-600">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ROLE_LABEL_TR[user.role] ?? user.role}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-none font-medium", STATUS_STYLE[user.status])}>{STATUS_LABEL_TR[user.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(user.joinedAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : "—"}</TableCell>
                    <TableCell>
                      {pendingId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailUserId(user.id)}>Görüntüle / Düzenle</DropdownMenuItem>
                            {!user.verified && <DropdownMenuItem onClick={() => runSingleAction(user, "verify")}>Doğrula</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            {user.status !== "active" ? (
                              <DropdownMenuItem onClick={() => runSingleAction(user, "activate")}>Etkinleştir</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => runSingleAction(user, "suspend")}>Askıya al</DropdownMenuItem>
                            )}
                            {user.status === "banned" ? (
                              <DropdownMenuItem onClick={() => runSingleAction(user, "unban")}>Ban kaldır</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem variant="destructive" onClick={() => setConfirm({ kind: "single", action: "ban", ids: [user.id] })}>
                                Banla
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setConfirm({ kind: "single", action: "delete", ids: [user.id] })}>
                              Sil
                            </DropdownMenuItem>
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

      {detailUserId && <UserDetailDialog userId={detailUserId} onClose={() => setDetailUserId(null)} onChanged={load} />}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description ?? ""}
        confirmLabel={confirmCopy?.label}
        loading={confirmLoading}
        onConfirm={runConfirmedAction}
      />
    </div>
  );
}
