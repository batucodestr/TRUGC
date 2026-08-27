import { AdminSettingsForm } from "@/features/admin/admin-settings-form";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
        <p className="text-muted-foreground">Hesap bilgilerinizi ve şifrenizi yönetin.</p>
      </div>
      <AdminSettingsForm />
    </div>
  );
}
