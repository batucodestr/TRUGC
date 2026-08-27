"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/Auth/AuthProvider";
import { apiClient } from "@/lib/api";
import { AUTH_ENDPOINTS } from "@/lib/endpoints";
import { getErrorMessage } from "@/lib/error-message";

export default function CreatorSettingsPage() {
  const { session } = useAuth();
  const [fullName, setFullName] = useState(session?.user.name ?? "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveAccount() {
    setSavingAccount(true);
    try {
      const [firstName, ...rest] = fullName.trim().split(" ");
      await apiClient.patch(AUTH_ENDPOINTS.myProfile, { first_name: firstName, last_name: rest.join(" ") });
      toast.success("Ayarlar kaydedildi");
    } catch (err) {
      toast.error("Kaydedilemedi", { description: getErrorMessage(err) });
    } finally {
      setSavingAccount(false);
    }
  }

  async function changePassword() {
    if (!oldPassword || !newPassword) return;
    setSavingPassword(true);
    try {
      await apiClient.post(AUTH_ENDPOINTS.changePassword, { old_password: oldPassword, new_password: newPassword });
      setOldPassword("");
      setNewPassword("");
      toast.success("Şifre güncellendi");
    } catch (err) {
      toast.error("Şifre güncellenemedi", { description: getErrorMessage(err) });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
        <p className="text-muted-foreground">Hesabınızı, ödemelerinizi ve bildirim tercihlerinizi yönetin.</p>
      </div>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Hesap</TabsTrigger>
          <TabsTrigger value="payouts">Ödemeler</TabsTrigger>
          <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <Card className="max-w-2xl rounded-2xl border-border/70 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" value={session?.user.email ?? ""} disabled />
              </div>
            </div>
            <Button className="mt-6 rounded-full bg-gradient-brand hover:opacity-90" onClick={saveAccount} disabled={savingAccount}>
              {savingAccount ? <Loader2 className="size-4 animate-spin" /> : "Değişiklikleri kaydet"}
            </Button>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mevcut şifre</Label>
                <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Yeni şifre</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>
            <Button variant="outline" className="mt-4 rounded-full" onClick={changePassword} disabled={savingPassword}>
              {savingPassword ? <Loader2 className="size-4 animate-spin" /> : "Şifreyi değiştir"}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-6">
          <Card className="max-w-2xl rounded-2xl border-border/70 p-6">
            <p className="text-sm font-medium">Ödeme yöntemi</p>
            <p className="mt-2 text-sm text-muted-foreground">Henüz bağlı bir ödeme yöntemi yok.</p>
            <Separator className="my-6" />
            <div className="space-y-2">
              <Label>Minimum ödeme tutarı</Label>
              <Input type="number" defaultValue={100} className="max-w-[200px]" />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="max-w-2xl divide-y divide-border/60 rounded-2xl border-border/70 p-6">
            {[
              { label: "Yeni kampanya davetleri", description: "Bir marka sizi kampanyaya davet ettiğinde bildirim alın" },
              { label: "Yeni mesajlar", description: "Yeni bir mesaj aldığınızda bildirim alın" },
              { label: "Ödeme onayları", description: "Bir ödeme gerçekleştiğinde bildirim alın" },
              { label: "Ürün güncellemeleri", description: "Yeni TRUGC özellikleri hakkında haberler" },
            ].map((item, i) => (
              <div key={item.label} className={`flex items-center justify-between ${i === 0 ? "pb-4" : "py-4"}`}>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch defaultChecked={i < 3} />
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
