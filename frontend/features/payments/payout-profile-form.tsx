"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveMyPayoutProfile, type PayoutProfile } from "@/lib/api/finance";
import { getErrorMessage } from "@/lib/error-message";

/** Hak edişin gönderileceği IBAN. Banka şifresi/kart bilgisi istenmez. */
export function PayoutProfileForm({ initial }: { initial: PayoutProfile | null }) {
  const [form, setForm] = useState<PayoutProfile>(initial ?? { account_holder: "", iban: "" });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveMyPayoutProfile(form);
      setForm(saved);
      toast.success("Ödeme bilgileriniz kaydedildi.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-4 px-5">
        <h2 className="flex items-center gap-2.5 text-xl font-bold text-white"><Landmark className="h-6 w-6 text-brand-light" aria-hidden /> Ödeme Bilgileri</h2>
        <p className="text-sm text-text-soft">Kazançlarınız bu IBAN&apos;a aktarılır. IBAN hesap sahibinin adına olmalıdır.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="holder">Hesap sahibi</Label><Input id="holder" required value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="iban">IBAN</Label><Input id="iban" required placeholder="TR00 0000 0000 0000 0000 0000 00" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></div>
        </div>
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet</Button>
      </form>
    </Card>
  );
}
