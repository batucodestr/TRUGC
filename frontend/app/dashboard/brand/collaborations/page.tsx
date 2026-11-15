import { CollaborationList } from "@/features/collaborations/collaboration-list";
import { listCollaborations } from "@/lib/api/collaborations";

export default async function BrandCollaborationsPage() {
  const items = await listCollaborations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">İş Birlikleri</h1>
        <p className="mt-1 text-text-soft">Kabul ettiğiniz creator&apos;ların içerik tesliminden ödemeye kadar tüm süreci buradan yönetin.</p>
      </div>
      <CollaborationList role="brand" items={items} />
    </div>
  );
}
