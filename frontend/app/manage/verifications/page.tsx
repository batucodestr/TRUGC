import { VerificationList } from "@/features/admin/verification-list";
import { listPendingVerifications } from "@/lib/api/admin";

export default async function AdminVerificationsPage() {
  const requests = await listPendingVerifications();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Doğrulama talepleri</h1>
        <p className="text-muted-foreground">Kullanıcılar tarafından gönderilen kimlik ve işletme belgelerini inceleyin.</p>
      </div>
      <VerificationList requests={requests} />
    </div>
  );
}
