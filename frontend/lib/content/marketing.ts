// Static marketing-site copy (pricing plans, testimonials, FAQ). This is real
// content the site ships with, not API-fallback/demo data — there's no
// backend concept of "pricing plans" or "testimonials" to fetch, so this
// lives here rather than behind an API call.
import type { FaqItem, PricingPlan, Testimonial } from "@/types";

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    period: "month",
    description: "For brands testing the waters with influencer marketing.",
    features: ["Up to 2 active campaigns", "Basic creator search", "Standard messaging", "Community support"],
    ctaLabel: "Get started",
  },
  {
    id: "growth",
    name: "Growth",
    price: 149,
    period: "month",
    description: "For brands scaling creator partnerships every month.",
    features: [
      "Unlimited active campaigns",
      "Advanced filters & analytics",
      "Priority creator matching",
      "Dedicated account support",
      "Campaign performance reports",
    ],
    highlighted: true,
    ctaLabel: "Start free trial",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 499,
    period: "month",
    description: "For agencies and large teams running high-volume campaigns.",
    features: [
      "Everything in Growth",
      "Multi-seat team access",
      "Custom contracts & invoicing",
      "API access",
      "White-glove onboarding",
    ],
    ctaLabel: "Contact sales",
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Jenna Wu",
    role: "Head of Growth",
    company: "Lumo Skincare",
    avatarUrl: "https://i.pravatar.cc/150?img=32",
    quote: "We 3x'd our creator output in the first month. The matching quality is unreal compared to what we used before.",
    rating: 5,
  },
  {
    id: "t2",
    name: "Marcus Reid",
    role: "Founder",
    company: "Nomad Gear",
    avatarUrl: "https://i.pravatar.cc/150?img=51",
    quote: "Finally a platform that doesn't feel like a spreadsheet. Our team actually enjoys running campaigns now.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Ava Bennett",
    role: "Creator",
    company: "@avabennett",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    quote: "I've booked more brand deals in two months here than in a year of cold outreach. Payments are always on time.",
    rating: 5,
  },
  {
    id: "t4",
    name: "Priya Shah",
    role: "Marketing Director",
    company: "Fresca Foods",
    avatarUrl: "https://i.pravatar.cc/150?img=45",
    quote: "The analytics alone are worth it. We can finally tie creator content to real conversion numbers.",
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
