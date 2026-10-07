import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { InstagramIcon, YoutubeIcon, TwitterIcon, LinkedinIcon } from "@/components/shared/brand-icons";
import { PaymentMethods } from "@/components/shared/payment-methods";
import { companyLegalLine } from "@/lib/company";

const FOOTER_LINKS = {
  Şirket: [
    { label: "Hakkımızda", href: "/hakkimizda" },
    { label: "Kariyer", href: "/kariyer" },
    { label: "Basın", href: "/basin" },
  ],
  "Creator'lar için": [
    { label: "Creator Ol", href: "/creator-ol" },
    { label: "Creator Rehberi", href: "/creator-rehberi" },
    { label: "Kazanç Rehberi", href: "/kazanc-rehberi" },
  ],
  "Markalar için": [
    { label: "Marka Çözümleri", href: "/marka-cozumleri" },
    { label: "Kampanya Oluştur", href: "/dashboard/brand/campaigns/new" },
    { label: "Başarı Hikayeleri", href: "/basari-hikayeleri" },
  ],
  Destek: [
    { label: "Yardım Merkezi", href: "/yardim-merkezi" },
    { label: "İletişim", href: "/iletisim" },
    { label: "SSS", href: "/sss" },
    { label: "Teslimat ve İade", href: "/teslimat-ve-iade" },
    { label: "Mesafeli Satış Sözleşmesi", href: "/mesafeli-satis-sozlesmesi" },
    { label: "Gizlilik Politikası", href: "/gizlilik-politikasi" },
    { label: "Kullanım Şartları", href: "/kullanim-sartlari" },
    { label: "KVKK", href: "/kvkk" },
  ],
};

const SOCIAL_LINKS = [
  { Icon: InstagramIcon, href: "https://instagram.com", label: "Instagram" },
  { Icon: TwitterIcon, href: "https://x.com", label: "X (Twitter)" },
  { Icon: YoutubeIcon, href: "https://youtube.com", label: "YouTube" },
  { Icon: LinkedinIcon, href: "https://linkedin.com", label: "LinkedIn" },
];

export function Footer() {
  // Vergi levhasındaki künye bilgileri doldurulmadıysa satır hiç basılmaz
  // (bkz. lib/company.ts) — site boş/örnek künye göstermez.
  const legalLine = companyLegalLine();

  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Markaları, işini gerçekten büyüten içerik üreticileriyle buluşturan premium platform.
            </p>
            <div className="mt-5 flex gap-3">
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-violet-600 hover:text-violet-600"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold">{title}</h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Ödeme yöntemleri bandı — iyzico üye iş yeri şartı: iyzico, Visa ve
            Mastercard logoları sitenin altbilgisinde görünür olmalıdır. */}
        <div className="mt-12 flex flex-col gap-5 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <PaymentMethods showNote={false} />
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground sm:text-right">
            Ödemeleriniz iyzico güvenli ödeme altyapısı üzerinden 3D Secure ile alınır. Kart bilgileriniz TRUGC
            sunucularında saklanmaz.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          {legalLine && <p className="text-center sm:text-left">{legalLine}</p>}
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p>© {new Date().getFullYear()} TRUGC. Tüm hakları saklıdır.</p>
            <p>İşini ciddiye alan markalar ve creator&apos;lar için tasarlandı.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
