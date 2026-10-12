import { PaymentDeclarationsTable } from "@/features/admin/payment-declarations-table";

export const metadata = { title: "Ödemeler — TRUGC Yönetim" };

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ödeme bildirimleri</h1>
        <p className="text-muted-foreground">
          Havale/EFT ile ödeme yaptığını bildiren kullanıcılar. Dekontu bankada gördüğünüzde onaylayın — onay
          anında tutar kullanıcının bakiyesine yüklenir ve paketi tanımlanır.
        </p>
      </div>
      <PaymentDeclarationsTable />
    </div>
  );
}
