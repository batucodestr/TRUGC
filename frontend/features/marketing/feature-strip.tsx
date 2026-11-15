import { Rocket, ShieldCheck, Target, BarChart3 } from "lucide-react";

const FEATURES = [
  { icon: Target, title: "Doğru Eşleşme", text: "Marka ve creator'ları akıllı sistemle buluşturur." },
  { icon: Rocket, title: "Hızlı Kampanya", text: "Dakikalar içinde kampanya oluşturup yayınlayın." },
  { icon: ShieldCheck, title: "Güvenli Ödeme", text: "PayTR altyapısı ve 3D Secure ile güvenli iş birliği." },
  { icon: BarChart3, title: "Ölçülebilir Sonuç", text: "Gerçek zamanlı raporlarla performansı takip edin." },
];

/** Tek geniş kart içinde dikey ayraçlarla 4 kolon. */
export function FeatureStrip() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="glass-panel grid divide-white/10 rounded-3xl p-2 sm:grid-cols-2 sm:divide-x-0 lg:grid-cols-4 lg:divide-x">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-4 p-5">
            <Icon className="mt-0.5 h-10 w-10 shrink-0 text-brand-light" strokeWidth={1.5} aria-hidden />
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-text-soft">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
