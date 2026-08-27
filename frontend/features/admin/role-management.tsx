"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { listRoleGroups, createRoleGroup, updateRoleGroupPermissions, deleteRoleGroup, type RoleGroup, type RolePermission } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/error-message";

export function RoleManagement() {
  const [groups, setGroups] = useState<RoleGroup[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RoleGroup | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await listRoleGroups();
      setGroups(res.groups);
      setPermissions(res.permissions);
    } catch (err) {
      toast.error("Roller yüklenemedi", { description: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setCreating(true);
    try {
      const group = await createRoleGroup(newRoleName.trim());
      setGroups((prev) => [...prev, group]);
      setNewRoleName("");
      toast.success("Rol oluşturuldu");
    } catch (err) {
      toast.error("Oluşturulamadı", { description: getErrorMessage(err) });
    } finally {
      setCreating(false);
    }
  }

  async function togglePermission(group: RoleGroup, permission: RolePermission) {
    const has = group.permissions.some((p) => p.id === permission.id);
    const nextIds = has ? group.permissions.filter((p) => p.id !== permission.id).map((p) => p.id) : [...group.permissions.map((p) => p.id), permission.id];
    setSavingId(group.id);
    try {
      const updated = await updateRoleGroupPermissions(group.id, nextIds);
      setGroups((prev) => prev.map((g) => (g.id === group.id ? updated : g)));
    } catch (err) {
      toast.error("Güncellenemedi", { description: getErrorMessage(err) });
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setConfirmLoading(true);
    try {
      await deleteRoleGroup(confirmDelete.id);
      setGroups((prev) => prev.filter((g) => g.id !== confirmDelete.id));
      toast.success("Rol silindi");
      setConfirmDelete(null);
    } catch (err) {
      toast.error("Silinemedi", { description: getErrorMessage(err) });
    } finally {
      setConfirmLoading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Yeni rol adı (örn. Support)" className="max-w-xs" />
        <Button type="submit" className="gap-1.5 rounded-full bg-gradient-brand hover:opacity-90" disabled={creating || !newRoleName.trim()}>
          <Plus className="h-4 w-4" /> Rol ekle
        </Button>
      </form>

      {groups.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Rol bulunamadı" description="manage.py seed_groups komutu çalıştırıldığında roller burada görünür." />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const expanded = expandedId === group.id;
            return (
              <Card key={group.id} className="rounded-2xl border-border/70 p-4">
                <div className="flex items-center justify-between">
                  <button className="flex items-center gap-3 text-left" onClick={() => setExpandedId(expanded ? null : group.id)}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="font-semibold">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.userCount} kullanıcı · {group.permissions.length} yetki</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {savingId === group.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700" onClick={() => setConfirmDelete(group)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setExpandedId(expanded ? null : group.id)}>
                      {expanded ? "Kapat" : "Yetkileri yönet"}
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border/60 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                    {permissions.map((perm) => {
                      const checked = group.permissions.some((p) => p.id === perm.id);
                      return (
                        <label key={perm.id} className="flex items-center gap-2 text-xs">
                          <Checkbox checked={checked} onCheckedChange={() => togglePermission(group, perm)} />
                          <span className="truncate" title={perm.name}>
                            {perm.appLabel ? `${perm.appLabel}.` : ""}
                            {perm.codename}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Rolü sil"
        description={`"${confirmDelete?.name ?? ""}" rolü kalıcı olarak silinecek.`}
        confirmLabel="Sil"
        loading={confirmLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
