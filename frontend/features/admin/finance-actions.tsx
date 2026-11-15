"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-message";

/** Hak edişin PayTR pazaryerinden creator'a aktarıldığını işaretler (defterde creator_payout yazılır). */
export function MarkPaidButton({ earningId }: { earningId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    const reference = window.prompt("Transfer referansı (PayTR transfer no / dekont):") ?? "";
    setBusy(true);
    try {
      await apiClient.post(`/payments/admin/earnings/${earningId}/payout/`, { reference });
      toast.success("Hak ediş ödendi olarak işaretlendi.");
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return <Button size="sm" disabled={busy} onClick={run}>Ödendi işaretle</Button>;
}

/** İş birliği ödemesini iade eder: PayTR iadesi + ters kayıt + hak ediş iptali. */
export function RefundForm() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm("Bu işlem PayTR üzerinden iade başlatır ve geri alınamaz. Devam edilsin mi?")) return;
    setBusy(true);
    try {
      await apiClient.post(`/payments/admin/refund/collaboration/${Number(id)}/`, { reason });
      toast.success("İade yapıldı, kayıtlar ters kaydedildi.");
      setId("");
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={run} className="flex flex-wrap items-end gap-3">
      <Input className="w-40" type="number" min={1} required placeholder="İş birliği no" value={id} onChange={(e) => setId(e.target.value)} aria-label="İş birliği no" />
      <Input className="min-w-60 flex-1" required placeholder="İade gerekçesi" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="İade gerekçesi" />
      <Button type="submit" variant="outline" disabled={busy}>İade et</Button>
    </form>
  );
}
