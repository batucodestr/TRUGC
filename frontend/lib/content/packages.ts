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
  /** TL / ay, KDV dahil. */
  price: number;
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
      { id: "classic-3d", label: "3 Günlük", price: 149, applications: 3 },
      { id: "classic-weekly", label: "Haftalık", price: 399, applications: 10 },
      { id: "classic-monthly", label: "Aylık", price: 699, applications: 22 },
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
      { id: "premium-3d", label: "3 Günlük", price: 249, applications: 5 },
      { id: "premium-weekly", label: "Haftalık", price: 699, applications: 20 },
      { id: "premium-monthly", label: "Aylık", price: 1299, applications: 50 },
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
    price: 499,
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
    price: 999,
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
    price: 1999,
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
