import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { InstagramIcon, YoutubeIcon, TwitterIcon, LinkedinIcon } from "@/components/shared/brand-icons";

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
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} TRUGC. Tüm hakları saklıdır.</p>
          <p>İşini ciddiye alan markalar ve creator&apos;lar için tasarlandı.</p>
        </div>
      </div>
    </footer>
  );
}
