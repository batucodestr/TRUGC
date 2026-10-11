"use client";

// Admin: kullanıcı bakiyesi ve üyelik paketi yönetimi.
//
// Otomatik tahsilat (sanal POS) henüz açık olmadığı için paketler havale/EFT
// ile satılıyor. Normal akış: dekont gelir → admin bakiyeyi yükler → paketi
// "bakiyeden tahsil et" işaretli olarak tanımlar. Böylece paranın nereden
// geldiği bakiye defterinde iz bırakır; paket doğrudan "hediye" edilmek
// istenirse kutu işaretlenmez.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Wallet as WalletIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  adjustUserBalance,
  assignUserMembership,
  clearUserMembership,
  getPackageCatalog,
  getUserWallet,
  getUserMembership,
  type Membership,
  type PackageCatalogEntry,
  type Wallet,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/error-message";
import { formatTryPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function UserBillingPanel({ userId }: { userId: string }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [catalog, setCatalog] = useState<PackageCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const [packageCode, setPackageCode] = useState("");
  const [tierCode, setTierCode] = useState("");
  const [chargeWallet, setChargeWallet] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    const [walletData, membershipData, catalogData] = await Promise.all([
      getUserWallet(userId),
      getUserMembership(userId),
      getPackageCatalog(),
    ]);
    setWallet(walletData);
    setMembership(membershipData);
    setCatalog(catalogData);
    // Mevcut paket seçili gelir; yoksa seçim boş bırakılır (yanlışlıkla
    // rastgele bir paket tanımlanmasın).
    if (membershipData.packageCode) {
      setPackageCode(membershipData.packageCode);
      setTierCode(membershipData.tierCode);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((err) => {
        if (!cancelled) toast.error("Bakiye bilgisi yüklenemedi", { description: getErrorMessage(err) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const selectedPackage = catalog.find((p) => p.code === packageCode);
  const selectedTier = selectedPackage?.tiers.find((t) => t.code === tierCode);

  async function adjust(sign: 1 | -1) {
    const parsed = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Geçerli bir tutar girin");
      return;
    }
    setAdjusting(true);
    try {
      const updated = await adjustUserBalance(userId, sign * parsed, note.trim());
      setWallet(updated);
      setAmount("");
      setNote("");
      toast.success(sign > 0 ? "Bakiye yüklendi" : "Bakiyeden düşüldü", {
        description: `Güncel bakiye: ${formatTryPrice(Number(updated.balance))}`,
      });
    } catch (err) {
      toast.error("İşlem yapılamadı", { description: getErrorMessage(err) });
    } finally {
      setAdjusting(false);
    }
  }

  async function assign() {
    if (!packageCode || !tierCode) {
      toast.error("Paket ve süre seçin");
      return;
    }
    setAssigning(true);
    try {
      const result = await assignUserMembership(userId, { packageCode, tierCode, chargeWallet });
      setMembership(result.membership);
      setWallet(result.wallet);
      toast.success("Paket tanımlandı", {
        description: `${result.membership.packageName} · ${result.membership.tierLabel}`,
      });
    } catch (err) {
      toast.error("Paket tanımlanamadı", { description: getErrorMessage(err) });
    } finally {
      setAssigning(false);
    }
  }

  async function clear() {
    setAssigning(true);
    try {
      setMembership(await clearUserMembership(userId));
      setPackageCode("");
      setTierCode("");
      toast.success("Paket kaldırıldı");
    } catch (err) {
      toast.error("Paket kaldırılamadı", { description: getErrorMessage(err) });
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* --- Bakiye --- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <WalletIcon className="size-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Mevcut bakiye</p>
              <p className="text-xl font-semibold tracking-tight">
                {formatTryPrice(Number(wallet?.balance ?? 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wallet-amount" className="text-xs">
              Tutar (TL)
            </Label>
            <Input
              id="wallet-amount"
              inputMode="decimal"
              placeholder="699"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wallet-note" className="text-xs">
              Açıklama (opsiyonel)
            </Label>
            <Input
              id="wallet-note"
              placeholder="Havale · dekont no"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1.5 rounded-full bg-gradient-brand hover:opacity-90"
            onClick={() => adjust(1)}
            disabled={adjusting}
          >
            {adjusting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Bakiye yükle
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-full"
            onClick={() => adjust(-1)}
            disabled={adjusting}
          >
            <Minus className="size-3.5" />
            Bakiyeden düş
          </Button>
        </div>

        {wallet && wallet.entries.length > 0 && (
          <div className="rounded-2xl border border-border/60">
            <p className="border-b border-border/60 px-4 py-2 text-xs font-medium text-muted-foreground">
              Son hareketler
            </p>
            <ul className="max-h-44 divide-y divide-border/60 overflow-y-auto">
              {wallet.entries.slice(0, 10).map((entry) => {
                const value = Number(entry.amount);
                return (
                  <li key={entry.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entry.kindLabel}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatStamp(entry.createdAt)}
                        {entry.note ? ` · ${entry.note}` : ""}
                        {entry.createdByEmail ? ` · ${entry.createdByEmail}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("font-semibold", value > 0 ? "text-emerald-600" : "text-rose-600")}>
                        {value > 0 ? "+" : "−"}
                        {formatTryPrice(Math.abs(value))}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatTryPrice(Number(entry.balanceAfter))}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* --- Üyelik paketi --- */}
      <section className="space-y-3 border-t border-border/60 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Üyelik paketi</p>
          {membership?.isActive ? (
            <Badge className="rounded-full border-none bg-emerald-100 font-normal text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              {membership.packageName} · {membership.tierLabel} · {membership.daysRemaining} gün kaldı
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-full font-normal">
              {membership?.packageCode ? "Süresi doldu" : "Paket yok"}
            </Badge>
          )}
        </div>

        {membership?.isActive && (
          <p className="text-xs text-muted-foreground">
            Başvuru hakkı:{" "}
            {membership.applicationQuota === null
              ? "Sınırsız"
              : `${membership.remainingApplications} / ${membership.applicationQuota} kaldı`}
            {membership.expiresAt ? ` · Bitiş: ${formatStamp(membership.expiresAt)}` : ""}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Paket</Label>
            <Select
              value={packageCode}
              onValueChange={(value) => {
                setPackageCode(value);
                // Süreler pakete göre değişiyor; eski seçim geçersiz kalabilir.
                const next = catalog.find((p) => p.code === value);
                setTierCode(next?.tiers.length === 1 ? next.tiers[0].code : "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Paket seçin" />
              </SelectTrigger>
              <SelectContent>
                {catalog.map((pkg) => (
                  <SelectItem key={pkg.code} value={pkg.code}>
                    {pkg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Süre</Label>
            <Select value={tierCode} onValueChange={setTierCode} disabled={!selectedPackage}>
              <SelectTrigger>
                <SelectValue placeholder="Süre seçin" />
              </SelectTrigger>
              <SelectContent>
                {(selectedPackage?.tiers ?? []).map((tier) => (
                  <SelectItem key={tier.code} value={tier.code}>
                    {tier.label} · {formatTryPrice(Number(tier.price))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
          <Checkbox
            id="charge-wallet"
            checked={chargeWallet}
            onCheckedChange={(value) => setChargeWallet(value === true)}
            className="mt-0.5"
          />
          <Label htmlFor="charge-wallet" className="cursor-pointer text-xs font-normal leading-relaxed">
            Paket ücretini kullanıcının bakiyesinden düş
            {selectedTier ? ` (${formatTryPrice(Number(selectedTier.price))})` : ""}. İşaretlenmezse paket ücretsiz
            tanımlanır.
          </Label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="rounded-full bg-gradient-brand hover:opacity-90"
            onClick={assign}
            disabled={assigning || !packageCode || !tierCode}
          >
            {assigning && <Loader2 className="size-3.5 animate-spin" />}
            {membership?.packageCode ? "Paketi değiştir" : "Paketi tanımla"}
          </Button>
          {membership?.packageCode && (
            <Button size="sm" variant="outline" className="rounded-full" onClick={clear} disabled={assigning}>
              Paketi kaldır
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
