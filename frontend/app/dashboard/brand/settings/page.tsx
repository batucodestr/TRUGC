"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/upload/image-upload";
import { apiClient } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { getErrorMessage } from "@/lib/error-message";

interface MyBrand {
  company_name: string;
  website: string;
  industry: string;
  description: string;
  logo: string | null;
}

export default function BrandSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<MyBrand>(ENDPOINTS.myBrand)
      .then((data) => {
        if (cancelled) return;
        setCompanyName(data.company_name);
        setWebsite(data.website);
        setIndustry(data.industry);
        setDescription(data.description);
        setLogoUrl(data.logo);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      await apiClient.patch(ENDPOINTS.myBrand, { company_name: companyName, website, industry, description });
      toast.success("Ayarlar kaydedildi");
    } catch (err) {
      toast.error("Kaydedilemedi", { description: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <AlertTriangle className="size-8" />
        <p>Şirket profili yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
        <p className="text-muted-foreground">Şirket profilinizi ve tercihlerinizi yönetin.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Şirket profili</TabsTrigger>
          <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
          <TabsTrigger value="billing">Faturalandırma</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="max-w-2xl rounded-2xl border-border/70 p-6">
            <div className="flex items-center gap-4">
              <ImageUpload
                endpoint={ENDPOINTS.myBrand}
                field="logo"
                shape="circle"
                value={logoUrl}
                onUploaded={setLogoUrl}
                label={companyName}
                className="h-16 w-16 [&>button]:h-16 [&>button]:w-16"
              />
            </div>
            <Separator className="my-6" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Şirket adı</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Web sitesi</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Sektör</Label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Biyografi</Label>
                <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <Button className="mt-6 rounded-full bg-gradient-brand hover:opacity-90" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Değişiklikleri kaydet"}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="max-w-2xl divide-y divide-border/60 rounded-2xl border-border/70 p-6">
            {[
              { label: "Yeni başvurular", description: "Bir creator kampanyanıza başvurduğunda bildirim alın" },
              { label: "Yeni mesajlar", description: "Yeni bir mesaj aldığınızda bildirim alın" },
              { label: "Kampanya güncellemeleri", description: "Durum değişiklikleri ve son tarih hatırlatmaları" },
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

        <TabsContent value="billing" className="mt-6">
          <Card className="max-w-2xl rounded-2xl border-border/70 p-6">
            <p className="text-sm font-medium">Faturalandırma</p>
            <p className="mt-2 text-sm text-muted-foreground">Faturalandırma entegrasyonu henüz bağlı değil.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
