// TRUGC üyelik paketleri — sitenin tek fiyat kaynağı.
//
// Tutarlar **Türk Lirası** cinsindendir ve KDV dahildir; bir dönüşüm (ör.
// convertUsdToTry) uygulanmaz. Backend'de "paket" diye bir kavram henüz
// yoktur (başvuru hakkı sayaçları da yok), bu yüzden içerik bir API çağrısının
// arkasında değil burada yaşar — pazarlama yüzeyleri (ana sayfa bölümü ve
// /fiyatlandirma) aynı diziyi okur, böylece iki yerde farklı fiyat gösterme
// ihtimali kalmaz.
//
// Fiyatların gösterilip gösterilmeyeceği buradan değil, sunucudan gelen
// ücretlendirme durumundan belirlenir (bkz. lib/pricing.ts): ücretsiz dönemde
// (hafta sonu) hiçbir tutar basılmaz.

/** Kampanya bütçesi üzerinden alınan platform komisyonu (%). */
export const CAMPAIGN_COMMISSION_PERCENT = 10;

/** Komisyon örneğinde kullanılan bütçe — "5.000 TL'lik reklam" senaryosu. */
export const COMMISSION_EXAMPLE_BUDGET = 5000;

/** Paket süresi başına fiyat + o sürede kullanılabilen başvuru hakkı. */
export interface PackageTier {
  id: string;
  /** Sunucudaki süre kodu (apps/payments/packages.py: Tier.code). Ödeme
   *  bildirimi bu kodla gönderilir; kimlikten türetmeye çalışmayın. */
  code: "3d" | "weekly" | "monthly";
  /** "3 Günlük" / "Haftalık" / "Aylık" */
  label: string;
  /** TL, KDV dahil. */
  price: number;
  /** Bu sürede kullanılabilecek iş başvurusu sayısı. */
  applications: number;
}

export interface CreatorPackage {
  id: string;
  name: string;
  /** Kart başlığının altındaki tek cümlelik konumlandırma. */
  tagline: string;
  tiers: PackageTier[];
  features: string[];
  highlighted?: boolean;
}

export interface BrandPackage {
  id: string;
  name: string;
  tagline: string;
  /** Sunucudaki süre kodu (apps/payments/packages.py: Tier.code). Marka
   *  paketleri tek süreli olduğu için her zaman "monthly"dir; ödeme bildirimi
   *  bu kodla gönderilir. */
  code: "monthly";
  /** TL / ay, KDV dahil. */
  price: number;
  /** Aylık creator başvuru hakkı; `null` sınırsız demektir. */
  applications: number | null;
  features: string[];
  highlighted?: boolean;
  /** Kartın üstünde çıkan rozet (yalnızca öne çıkan pakette). */
  badge?: string;
}

export const CREATOR_PACKAGES: CreatorPackage[] = [
  {
    id: "classic-creator",
    name: "Classic Creator",
    tagline: "Başlangıç için ideal.",
    tiers: [
      { id: "classic-3d", code: "3d", label: "3 Günlük", price: 149, applications: 3 },
      { id: "classic-weekly", code: "weekly", label: "Haftalık", price: 399, applications: 10 },
      { id: "classic-monthly", code: "monthly", label: "Aylık", price: 699, applications: 22 },
    ],
    features: [
      "Kampanyaları görüntüleme",
      "Kampanyalara başvuru yapma",
      "Creator profili oluşturma",
      "Sosyal medya bilgilerini ekleme",
      "Temel profil görünürlüğü",
    ],
  },
  {
    id: "premium-creator",
    name: "Premium Creator",
    tagline: "Daha fazla görünürlük, daha fazla fırsat.",
    highlighted: true,
    tiers: [
      { id: "premium-3d", code: "3d", label: "3 Günlük", price: 249, applications: 5 },
      { id: "premium-weekly", code: "weekly", label: "Haftalık", price: 699, applications: 20 },
      { id: "premium-monthly", code: "monthly", label: "Aylık", price: 1299, applications: 50 },
    ],
    features: [
      "Classic'teki tüm özellikler",
      "Premium rozet",
      "Öne çıkarılmış profil",
      "Kampanyalarda öncelik",
      "Gelişmiş istatistikler",
      "Premium kampanyalara erişim",
    ],
  },
];

export const BRAND_PACKAGES: BrandPackage[] = [
  {
    id: "baslangic-marka",
    name: "Başlangıç Marka",
    tagline: "Küçük ve orta ölçekli markalar için.",
    code: "monthly",
    price: 499,
    applications: 50,
    features: [
      "5 aktif kampanya",
      "Aylık 50 creator başvuru hakkı",
      "Temel filtreleme",
      "Kampanya yönetimi",
      "Raporlama",
      "E-posta destek",
    ],
  },
  {
    id: "profesyonel-marka",
    name: "Profesyonel Marka",
    tagline: "Büyüme odaklı markalar için.",
    code: "monthly",
    price: 999,
    applications: 150,
    highlighted: true,
    badge: "En popüler",
    features: [
      "15 aktif kampanya",
      "Aylık 150 creator başvuru hakkı",
      "Gelişmiş filtreleme",
      "Öne çıkarılmış kampanyalar",
      "Detaylı raporlama",
      "Özel destek",
    ],
  },
  {
    id: "kurumsal-marka",
    name: "Kurumsal Marka",
    tagline: "Büyük markalar ve ajanslar için.",
    code: "monthly",
    price: 1999,
    applications: null,
    features: [
      "Sınırsız kampanya",
      "Sınırsız creator başvuru hakkı",
      "Gelişmiş filtreleme",
      "Premium görünürlük",
      "Detaylı analiz ve raporlar",
      "Özel hesap yöneticisi",
      "Özel çözümler",
    ],
  },
];

// ---------------------------------------------------------------------------
// Ödeme ekranları için ortak biçim
// ---------------------------------------------------------------------------
// Creator paketleri üç süre taşır, marka paketleri tek (aylık) — ödeme ekranı
// ve "Paketi seç" diyaloğu ikisini de aynı şekilde göstermek zorunda. Bu
// dönüştürücü, iki listeyi tek bir biçime indirir; böylece marka tarafı için
// ikinci bir ödeme ekranı yazılmaz ve iki ekran ayrışamaz.
//
// `packageCode` ve `code`, sunucudaki katalogla birebir aynıdır
// (apps/payments/packages.py) — ödeme bildirimi bu ikisiyle gönderilir.

export type PackageAudience = "creator" | "brand";

export interface CheckoutTier {
  id: string;
  code: PackageTier["code"];
  label: string;
  price: number;
  /** Süreye bağlı tek satırlık bilgi, ör. "10 iş başvuru hakkı". */
  note: string;
}

export interface CheckoutPackage {
  /** Sunucudaki paket kodu (package_code). */
  code: string;
  name: string;
  tagline: string;
  tiers: CheckoutTier[];
  highlighted?: boolean;
}

function applicationsNote(count: number | null, noun: string): string {
  return count === null ? `Sınırsız ${noun}` : `${count} ${noun}`;
}

export function checkoutPackages(audience: PackageAudience): CheckoutPackage[] {
  if (audience === "brand") {
    return BRAND_PACKAGES.map((pkg) => ({
      code: pkg.id,
      name: pkg.name,
      tagline: pkg.tagline,
      highlighted: pkg.highlighted,
      tiers: [
        {
          id: `${pkg.id}-${pkg.code}`,
          code: pkg.code,
          label: "Aylık",
          price: pkg.price,
          note: applicationsNote(pkg.applications, "creator başvuru hakkı"),
        },
      ],
    }));
  }

  return CREATOR_PACKAGES.map((pkg) => ({
    code: pkg.id,
    name: pkg.name,
    tagline: pkg.tagline,
    highlighted: pkg.highlighted,
    tiers: pkg.tiers.map((tier) => ({
      id: tier.id,
      code: tier.code,
      label: tier.label,
      price: tier.price,
      note: applicationsNote(tier.applications, "iş başvuru hakkı"),
    })),
  }));
}
