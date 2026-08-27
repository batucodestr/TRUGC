// Statik pazarlama sitesi içeriği (fiyatlandırma planları, referanslar, SSS).
// Bu, sitenin birlikte geldiği gerçek içeriktir; API-fallback/demo verisi
// değildir — backend'de "fiyatlandırma planları" veya "referanslar" diye bir
// kavram olmadığından bu içerik bir API çağrısının arkasında değil burada yaşar.
import type { FaqItem, PricingPlan, Testimonial } from "@/types";

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    period: "ay",
    description: "Influencer pazarlamasına yeni başlayan markalar için.",
    features: ["2 aktif kampanyaya kadar", "Temel creator arama", "Standart mesajlaşma", "Topluluk desteği"],
    ctaLabel: "Ücretsiz başla",
  },
  {
    id: "growth",
    name: "Growth",
    price: 149,
    period: "ay",
    description: "Her ay yeni creator iş birlikleri kuran büyüyen markalar için.",
    features: [
      "Sınırsız aktif kampanya",
      "Gelişmiş filtreler ve analitik",
      "Öncelikli creator eşleştirme",
      "Özel hesap desteği",
      "Kampanya performans raporları",
    ],
    highlighted: true,
    ctaLabel: "Ücretsiz deneyin",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 499,
    period: "ay",
    description: "Yüksek hacimli kampanyalar yürüten ajanslar ve büyük ekipler için.",
    features: [
      "Growth planındaki her şey",
      "Çoklu kullanıcı erişimi",
      "Özel sözleşme ve faturalandırma",
      "API erişimi",
      "Uçtan uca kurulum desteği",
    ],
    ctaLabel: "Satış ekibiyle görüşün",
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Zeynep Aydın",
    role: "Büyüme Direktörü",
    company: "Lumo Cilt Bakımı",
    avatarUrl: "https://i.pravatar.cc/150?img=32",
    quote: "İlk ayda creator içerik üretimimizi 3 katına çıkardık. Eşleştirme kalitesi, daha önce kullandığımız hiçbir şeyle kıyaslanamaz.",
    rating: 5,
  },
  {
    id: "t2",
    name: "Emre Kaya",
    role: "Kurucu",
    company: "Nomad Gear",
    avatarUrl: "https://i.pravatar.cc/150?img=51",
    quote: "Sonunda bir Excel tablosu gibi hissettirmeyen bir platform bulduk. Ekibimiz artık kampanya yürütmekten gerçekten keyif alıyor.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Ayşe Demir",
    role: "Creator",
    company: "@aysedemir",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    quote: "İki ayda burada soğuk iletişimle bir yılda bulduğumdan daha fazla marka iş birliği yakaladım. Ödemeler her zaman zamanında geliyor.",
    rating: 5,
  },
  {
    id: "t4",
    name: "Priya Şah",
    role: "Pazarlama Direktörü",
    company: "Fresca Gıda",
    avatarUrl: "https://i.pravatar.cc/150?img=45",
    quote: "Yalnızca analitik özelliği bile buna değer. Artık creator içeriklerini gerçek dönüşüm rakamlarıyla ilişkilendirebiliyoruz.",
    rating: 4,
  },
];

export const FAQS: FaqItem[] = [
  {
    id: "faq1",
    question: "TRUGC nasıl çalışır?",
    answer:
      "TRUGC, markaları onaylı içerik üreticileriyle tek bir platformda buluşturur. Markalar kampanya oluşturur, creator'lar başvurur; iş birliği onaylandıktan sonra içerik üretimi, teslim ve ödeme süreçlerinin tamamı platform üzerinden yönetilir.",
  },
  {
    id: "faq2",
    question: "Creator olarak nasıl başvururum?",
    answer:
      "Sağ üstteki \"Kayıt Ol\" butonuna tıklayıp Creator'ı seçmeniz yeterli. Ad soyad, kullanıcı adı, sosyal medya hesaplarınız ve niş kategorinizi girerek birkaç dakikada profilinizi oluşturabilir, hemen kampanyalara başvurmaya başlayabilirsiniz.",
  },
  {
    id: "faq3",
    question: "Markalar kampanya nasıl oluşturur?",
    answer:
      "Marka hesabınızla giriş yaptıktan sonra panelinizdeki \"Kampanya Oluştur\" adımını takip ederek bütçe, platform, gereksinim ve teslimatlarınızı belirlersiniz. Kampanyanız yayınlandığı anda uygun creator'lardan başvuru almaya başlarsınız.",
  },
  {
    id: "faq4",
    question: "Ödemeler nasıl yapılır?",
    answer:
      "Markalar kampanya bütçesini baştan yatırır ve tutar emanet (escrow) hesabında güvence altına alınır. İçerik teslim edilip onaylandıktan sonra ödeme otomatik olarak creator'ın hesabına aktarılır.",
  },
  {
    id: "faq5",
    question: "Komisyon oranı nedir?",
    answer:
      "TRUGC'ye creator olarak katılmak tamamen ücretsizdir. Platform, yalnızca tamamlanan kampanyalardan %8,5 oranında hizmet bedeli keser; bu oran güvenli ödeme altyapısını ve platform desteğini kapsar.",
  },
  {
    id: "faq6",
    question: "İş birlikleri nasıl yönetilir?",
    answer:
      "Başvuru kabul edildikten sonra marka ve creator, platform içi mesajlaşma üzerinden brief, teslim tarihi ve revizyonları netleştirir. Tüm süreç -başvurudan ödemeye kadar- panelinizden tek ekranda takip edilebilir.",
  },
  {
    id: "faq7",
    question: "Kampanyayı yayına aldıktan sonra iptal edebilir miyim?",
    answer:
      "Evet, kampanyalar panelinizden istediğiniz zaman duraklatılabilir veya kapatılabilir. Ancak zaten kabul edilmiş başvurular varsa, önce bu iş birliklerinin sonuçlandırılması gerekir.",
  },
  {
    id: "faq8",
    question: "Creator'ları ve markaları doğruluyor musunuz?",
    answer:
      "Evet, ekibimiz kimlik ve ticari belge başvurularını manuel olarak inceler ve onay sürecinden geçen hesaplara \"Onaylı\" rozeti verir. Bu rozet, güven oluşturmak için profil ve kampanya sayfalarında görünür.",
  },
  {
    id: "faq9",
    question: "Hangi platformlar destekleniyor?",
    answer:
      "Creator profilleri, kampanya teslimatları ve analitik için Instagram, TikTok, YouTube ve Twitch platformlarının tümü desteklenmektedir.",
  },
];
