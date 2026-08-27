import { CreateCampaignForm } from "@/features/brands/create-campaign-form";

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kampanya oluştur</h1>
        <p className="text-muted-foreground">Creator&apos;lara yeni bir kampanya yayınlamak için aşağıdaki bilgileri doldurun.</p>
      </div>
      <CreateCampaignForm />
    </div>
  );
}
