import type { CreatorCategory, SocialPlatform } from "@/types";

export const CATEGORIES: CreatorCategory[] = [
  "Fashion",
  "Beauty",
  "Fitness",
  "Food",
  "Travel",
  "Gaming",
  "Tech",
  "Lifestyle",
  "Music",
  "Comedy",
  "Business",
  "Parenting",
];

export const CATEGORY_ICON_LABEL: Record<CreatorCategory, string> = {
  Fashion: "👗",
  Beauty: "💄",
  Fitness: "💪",
  Food: "🍜",
  Travel: "✈️",
  Gaming: "🎮",
  Tech: "💻",
  Lifestyle: "🌿",
  Music: "🎵",
  Comedy: "😂",
  Business: "📈",
  Parenting: "🍼",
};

// Dahili veri anahtarları İngilizce kalır (mock veri, filtreleme, URL
// parametreleri); bu yalnızca kullanıcılara gösterilen Türkçe etikettir.
export const CATEGORY_LABEL_TR: Record<CreatorCategory, string> = {
  Fashion: "Moda",
  Beauty: "Güzellik",
  Fitness: "Fitness",
  Food: "Yemek",
  Travel: "Seyahat",
  Gaming: "Oyun",
  Tech: "Teknoloji",
  Lifestyle: "Yaşam Tarzı",
  Music: "Müzik",
  Comedy: "Komedi",
  Business: "İş Dünyası",
  Parenting: "Ebeveynlik",
};

export const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "youtube", "twitch"];

export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitch: "Twitch",
};

export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Netherlands",
  "Brazil",
  "Mexico",
  "Turkey",
  "United Arab Emirates",
  "Japan",
  "South Korea",
  "Sweden",
] as const;

// Dahili filtre değerleri İngilizce kalır (API sorgu parametreleri); bu
// yalnızca kullanıcılara gösterilen Türkçe etikettir, CATEGORY_LABEL_TR ile aynı desen.
export const COUNTRY_LABEL_TR: Record<(typeof COUNTRIES)[number], string> = {
  "United States": "Amerika Birleşik Devletleri",
  "United Kingdom": "Birleşik Krallık",
  Canada: "Kanada",
  Australia: "Avustralya",
  Germany: "Almanya",
  France: "Fransa",
  Spain: "İspanya",
  Netherlands: "Hollanda",
  Brazil: "Brezilya",
  Mexico: "Meksika",
  Turkey: "Türkiye",
  "United Arab Emirates": "Birleşik Arap Emirlikleri",
  Japan: "Japonya",
  "South Korea": "Güney Kore",
  Sweden: "İsveç",
};

export const NAV_LINKS = [
  { label: "İçerik Üreticileri Keşfet", href: "/creators" },
  { label: "Kampanyalar", href: "/campaigns" },
  { label: "Nasıl Çalışır", href: "/nasil-calisir" },
  { label: "Fiyatlandırma", href: "/fiyatlandirma" },
];
