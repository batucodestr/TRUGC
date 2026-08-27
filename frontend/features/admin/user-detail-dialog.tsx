"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUser, performUserAction, type PlatformUserDetail } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/error-message";
import { formatDate } from "@/lib/format";

const ROLE_OPTIONS = [
  { value: "creator", label: "Creator" },
  { value: "brand", label: "Marka" },
  { value: "moderator", label: "Moderatör" },
  { value: "admin", label: "Admin" },
];

interface UserDetailDialogProps {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}

export function UserDetailDialog({ userId, onClose, onChanged }: UserDetailDialogProps) {
  const [user, setUser] = useState<PlatformUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUser(userId)
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setRole(u.role);
      })
      .catch((err) => toast.error("Kullanıcı yüklenemedi", { description: getErrorMessage(err) }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function saveRole() {
    if (!user || role === user.role) return;
    setSaving(true);
    try {
      await performUserAction(user.id, "change_role", { role });
      toast.success("Rol güncellendi");
      onChanged();
      onClose();
    } catch (err) {
      toast.error("Rol güncellenemedi", { description: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kullanıcı detayı</DialogTitle>
          <DialogDescription>Profil bilgileri ve rol yönetimi.</DialogDescription>
        </DialogHeader>

        {loading || !user ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="rounded-full font-normal">{user.status}</Badge>
                {user.verified && <Badge className="rounded-full border-none bg-emerald-100 font-normal text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Doğrulanmış</Badge>}
                {user.emailVerified && <Badge variant="outline" className="rounded-full font-normal">E-posta doğrulandı</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Telefon</p>
                <p>{user.phoneNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Konum</p>
                <p>{[user.city, user.country].filter(Boolean).join(", ") || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kayıt tarihi</p>
                <p>{formatDate(user.joinedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Doğrulama durumu</p>
                <p>{user.verificationStatus}</p>
              </div>
            </div>

            {user.banReason && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
                Ban sebebi: {user.banReason}
              </div>
            )}

            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="text-xs font-medium text-muted-foreground">Rol değiştir</p>
              <div className="flex gap-2">
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={saveRole} disabled={saving || role === user.role} className="bg-gradient-brand hover:opacity-90">
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
