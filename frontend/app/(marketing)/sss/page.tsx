import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/Motion/Reveal";

export const metadata = { title: "Sıkça Sorulan Sorular — TRUGC" };

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const GENEL_FAQS: FaqItem[] = [
  {
    id: "genel-1",
    question: "TRUGC nedir?",
    answer:
      "TRUGC, markaların onaylı creator'larla güvenli ve hızlı bir şekilde bir araya geldiği bir influencer pazarlama platformudur. Kampanya oluşturmadan ödeme sürecine kadar tüm iş birliğini tek bir yerden yönetebilirsiniz.",
  },
  {
    id: "genel-2",
    question: "Hangi platformlar destekleniyor?",
    answer:
      "Instagram, TikTok, YouTube ve Twitch profilleri TRUGC üzerinde desteklenir. Creator'lar bu platformlardaki hesaplarını bağlayarak takipçi ve etkileşim verilerini profillerinde gösterebilir.",
  },
  {
    id: "genel-3",
    question: "Platformu kullanmak için ücret ödemem gerekiyor mu?",
    answer:
      "Creator olarak katılım tamamen ücretsizdir. Markalar için ise ihtiyaca göre değişen ücretsiz ve ücretli planlarımız bulunur; detayları fiyatlandırma sayfamızdan inceleyebilirsiniz.",
  },
  {
    id: "genel-4",
    question: "Onaylı rozeti ne anlama geliyor?",
    answer:
      "Onaylı rozet, ekibimizin kimlik veya işletme belgelerini manuel olarak incelediği ve profili doğruladığı anlamına gelir. Bu rozet, platformdaki güveni artırmak için tasarlanmıştır.",
  },
  {
    id: "genel-5",
    question: "Mobil uygulamanız var mı?",
    answer:
      "Şu an için TRUGC web tarayıcı üzerinden hem masaüstü hem de mobil cihazlarda sorunsuz çalışacak şekilde tasarlanmıştır. Mobil uygulama için çalışmalarımız devam ediyor.",
  },
];

const CREATOR_FAQS: FaqItem[] = [
  {
    id: "creator-1",
    question: "Creator olarak nasıl kayıt olabilirim?",
    answer:
      "Ana sayfadaki \"Creator Ol\" butonuna tıklayarak birkaç dakika içinde profilinizi oluşturabilir, sosyal medya hesaplarınızı bağlayabilir ve paketlerinizi tanımlayabilirsiniz.",
  },
  {
    id: "creator-2",
    question: "Creator olmak ücretli mi?",
    answer:
      "Hayır, creator'lar için TRUGC'ye katılım ve profil oluşturmak tamamen ücretsizdir. Yalnızca tamamlanan bir iş birliğinde küçük bir hizmet bedeli kesintisi uygulanır.",
  },
  {
    id: "creator-3",
    question: "Ödemelerimi nasıl alırım?",
    answer:
      "Marka, kampanya bütçesini iş birliği başlamadan önce emanet hesabına yatırır. Teslim ettiğiniz içerik onaylandıktan sonra ödemeniz doğrudan hesabınıza aktarılır.",
  },
  {
    id: "creator-4",
    question: "Doğrulama süreci nasıl işliyor?",
    answer:
      "Kimliğinizi ve sosyal medya hesap sahipliğinizi doğrulayan belgeleri yükledikten sonra ekibimiz başvurunuzu inceler. Onaylanan profiller \"Onaylı\" rozetiyle işaretlenir ve markalar tarafından daha çok tercih edilir.",
  },
  {
    id: "creator-5",
    question: "Paket fiyatlarımı nasıl belirlemeliyim?",
    answer:
      "Fiyatınızı takipçi sayınız, etkileşim oranınız ve içerik türüne göre siz belirlersiniz. Platformdaki benzer profilleri inceleyerek piyasaya uygun bir fiyatlandırma yapmanızı öneririz.",
  },
];

const MARKA_FAQS: FaqItem[] = [
  {
    id: "marka-1",
    question: "Nasıl kampanya oluşturabilirim?",
    answer:
      "Marka panelinizden \"Yeni Kampanya\" adımını izleyerek hedef kitlenizi, bütçenizi ve beklediğiniz içerik türünü belirtebilir, kampanyanızı dakikalar içinde yayına alabilirsiniz.",
  },
  {
    id: "marka-2",
    question: "Doğru creator'ı nasıl bulurum?",
    answer:
      "Niş, platform, takipçi aralığı ve etkileşim oranı gibi filtrelerle creator'lar arasında arama yapabilir, profillerini ve geçmiş iş birliklerini inceleyerek en uygun ismi seçebilirsiniz.",
  },
  {
    id: "marka-3",
    question: "Fiyatlandırma nasıl işliyor?",
    answer:
      "Starter planıyla ücretsiz başlayabilir, kampanya hacminiz büyüdükçe Growth veya Enterprise planlarına geçebilirsiniz. Tüm planların detayları fiyatlandırma sayfamızda yer alır.",
  },
  {
    id: "marka-4",
    question: "Bir kampanyayı yayınladıktan sonra iptal edebilir miyim?",
    answer:
      "Evet, kampanyanızı marka panelinizden istediğiniz zaman duraklatabilir veya kapatabilirsiniz. Ancak onaylanmış başvurular varsa bu iş birliklerinin sonuçlandırılması gerekir.",
  },
  {
    id: "marka-5",
    question: "Birden fazla ekip üyesi hesaba erişebilir mi?",
    answer:
      "Growth ve Enterprise planlarında birden fazla ekip üyesini davet edip yetkilendirebilir, kampanya yönetimini ekibinizle paylaşabilirsiniz.",
  },
];

const ODEME_FAQS: FaqItem[] = [
  {
    id: "odeme-1",
    question: "Hangi ödeme yöntemlerini kullanabilirim?",
    answer:
      "Kredi kartı, banka kartı ve banka havalesi ile ödeme yapabilirsiniz. Kurumsal müşterilerimiz için fatura karşılığı ödeme seçenekleri de mevcuttur.",
  },
  {
    id: "odeme-2",
    question: "Hizmet bedeli oranı nedir?",
    answer:
      "Tamamlanan iş birliklerinde %8,5 oranında bir hizmet bedeli uygulanır. Bu bedel, platformun güvenli ödeme altyapısını ve destek hizmetlerini sürdürmek için kullanılır.",
  },
  {
    id: "odeme-3",
    question: "Emanet (escrow) güvencesi nasıl çalışır?",
    answer:
      "Marka, kampanya bütçesini iş birliği başlamadan önce emanet hesabına yatırır. Ödeme, yalnızca teslim edilen içerik onaylandıktan sonra creator'a serbest bırakılır, böylece her iki taraf da güvence altındadır.",
  },
  {
    id: "odeme-4",
    question: "Para iadesi alabilir miyim?",
    answer:
      "İçerik teslim edilmeden veya anlaşmaya uygun şekilde tamamlanmadan önce iptal edilen iş birliklerinde, emanet hesabındaki tutar markaya iade edilir. Anlaşmazlık durumlarında destek ekibimiz süreci inceler.",
  },
];

function FaqCategory({ title, items }: { title: string; items: FaqItem[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <Accordion type="single" collapsible className="mt-5 w-full">
        {items.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            className="mb-3 rounded-2xl border border-border/70 bg-card px-5 py-1 shadow-sm"
          >
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export default function SssPage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8">
        <Reveal>
          <p className="text-sm font-medium text-violet-600">SSS</p>
          <h1 className="mx-auto mt-2 max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Sıkça sorulan <span className="text-gradient-brand">sorular</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
            TRUGC hakkında merak ettiğiniz her şeyi kategorilere göre burada bulabilirsiniz.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="space-y-14">
          <Reveal variant="slide-up">
            <FaqCategory title="Genel" items={GENEL_FAQS} />
          </Reveal>
          <Reveal variant="slide-up" delay={0.05}>
            <FaqCategory title="Creator'lar için" items={CREATOR_FAQS} />
          </Reveal>
          <Reveal variant="slide-up" delay={0.1}>
            <FaqCategory title="Markalar için" items={MARKA_FAQS} />
          </Reveal>
          <Reveal variant="slide-up" delay={0.15}>
            <FaqCategory title="Ödemeler" items={ODEME_FAQS} />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
