import { Search, MessagesSquare, Rocket, Wallet } from "lucide-react";
import { Reveal } from "@/components/Motion/Reveal";

const STEPS = [
  {
    icon: Search,
    title: "Keşfet",
    description: "Binlerce onaylı creator'ı platform, niş, fiyat ve etkileşime göre arayın ve filtreleyin.",
  },
  {
    icon: MessagesSquare,
    title: "Bağlantı kur",
    description: "Creator'lara doğrudan mesaj atın, briefinizi paylaşın ve paket detaylarını anlık olarak görüşün.",
  },
  {
    icon: Rocket,
    title: "Kampanyayı başlat",
    description: "Teslimatları onaylayın, kampanya takviminizi takip edin ve içeriklerin yayına girişini izleyin.",
  },
  {
    icon: Wallet,
    title: "Güvenle ödeyin",
    description: "Ödemeler güvenli bir emanet hesabında tutulur ve iş onaylandığında otomatik olarak serbest bırakılır.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border/60 bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-violet-600">Nasıl Çalışır</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Briefinizden yayına dört adımda</h2>
        </Reveal>

        <div className="relative mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div aria-hidden className="absolute left-0 right-0 top-8 hidden h-px bg-border lg:block" />
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08} className="relative flex flex-col items-center text-center">
              <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-lg shadow-violet-600/30">
                <step.icon className="h-6 w-6" />
              </span>
              <span className="mt-4 text-xs font-semibold text-violet-600">ADIM {i + 1}</span>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">{step.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
