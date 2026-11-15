import { CollaborationList } from "@/features/collaborations/collaboration-list";
import { listCollaborations } from "@/lib/api/collaborations";

export default async function CreatorCollaborationsPage() {
  const items = await listCollaborations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">İşbirliklerim</h1>
        <p className="mt-1 text-text-soft">Kabul edilen başvurularınızdaki içerik tesliminizi ve ödeme durumunuzu buradan takip edin.</p>
      </div>
      <CollaborationList role="creator" items={items} />
    </div>
  );
}
