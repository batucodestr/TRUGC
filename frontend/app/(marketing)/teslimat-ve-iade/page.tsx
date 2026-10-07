import Link from "next/link";
import { Reveal } from "@/components/Motion/Reveal";
import { Separator } from "@/components/ui/separator";
import { PaymentMethods } from "@/components/shared/payment-methods";
import { COMPANY, companyLegalRows } from "@/lib/company";

export const metadata = {
  title: "Teslimat ve İade Koşulları — TRUGC",
  description:
    "TRUGC'de hizmetin nasıl teslim edildiği, cayma hakkı, iptal ve iade koşulları ile iade sürelerine ilişkin bilgiler.",
};

export default function TeslimatVeIadePage() {
  const legalRows = companyLegalRows();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal>
        <p className="text-sm font-medium text-violet-600">Yasal</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Teslimat ve İade Koşulları</h1>
        <p className="mt-4 text-sm text-muted-foreground">Son güncelleme: 7 Ekim 2026</p>
        <p className="mt-6 text-muted-foreground leading-relaxed">
          Bu metin, TRUGC üzerinden satın alınan hizmetlerin nasıl teslim edildiğini, cayma hakkınızı, iptal ve iade
          koşullarını ve iade sürelerini açıklar. 6502 sayılı Tüketicinin Korunması Hakkında Kanun ile Mesafeli
          Sözleşmeler Yönetmeliği kapsamında hazırlanmıştır ve{" "}
          <Link href="/kullanim-sartlari" className="font-medium text-foreground underline underline-offset-4">
            Kullanım Şartları
          </Link>{" "}
          ile birlikte uygulanır.
        </p>
      </Reveal>

      <Separator className="mt-10" />

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">1. Hizmetin Niteliği</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            TRUGC, markaları içerik üreticileriyle buluşturan bir dijital platformdur. Platform üzerinden satın
            alınan her şey —&nbsp;creator erişim paketleri, üyelik planları ve kampanya bütçeleri—{" "}
            <span className="font-medium text-foreground">elektronik ortamda sunulan dijital hizmetlerdir</span>.
            Fiziksel bir ürün gönderimi yapılmaz; bu nedenle kargo, teslimat ücreti veya teslimat süresi söz konusu
            değildir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">2. Teslimat</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Ödemeniz 3D Secure doğrulamasıyla onaylandığı anda, satın aldığınız hizmet hesabınıza otomatik olarak
            tanımlanır ve kullanıma açılır. Teslimat, hesabınızın bulunduğu panel üzerinden elektronik olarak
            gerçekleşir.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Teslimat yeri:</span> Üyeliğinize tanımlı TRUGC hesabı ve
              kayıtlı e-posta adresiniz.
            </li>
            <li>
              <span className="font-medium text-foreground">Teslimat süresi:</span> Ödeme onayının ardından anında;
              teknik bir aksaklık halinde en geç 24 saat içinde.
            </li>
            <li>
              <span className="font-medium text-foreground">Teslimat ücreti:</span> Yoktur. Dijital hizmetlerde
              gönderim bedeli alınmaz.
            </li>
            <li>
              <span className="font-medium text-foreground">Bildirim:</span> Satın alma tamamlandığında kayıtlı
              e-posta adresinize bilgilendirme ve fatura iletilir.
            </li>
          </ul>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Ödemeniz başarılı göründüğü halde hizmet 24 saat içinde hesabınıza tanımlanmadıysa, aşağıdaki iletişim
            kanallarından bize ulaşın; sorun giderilemezse ödemeniz iade edilir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">3. Kampanya Bütçeleri ve Emanet (Escrow)</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Marka tarafından bir kampanya için yatırılan bütçe doğrudan creator&apos;a aktarılmaz; TRUGC emanet
            hesabında bloke edilir. Bu tutar, yalnızca marka teslimatı onayladığında creator&apos;a serbest bırakılır.
            İçerik teslim edilmeden iptal edilen iş birliklerinde, emanetteki tutar markaya iade edilir. Taraflar
            arasında anlaşmazlık çıkması halinde tutar, destek ekibinin incelemesi sonuçlanana kadar bloke kalır.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">4. Cayma Hakkı</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Mesafeli sözleşmelerde tüketicinin, sözleşmenin kurulduğu tarihten itibaren{" "}
            <span className="font-medium text-foreground">14 gün</span> içinde gerekçe göstermeksizin ve cezai şart
            ödemeksizin cayma hakkı bulunur.
          </p>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Bununla birlikte Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15. maddesi uyarınca,{" "}
            <span className="font-medium text-foreground">
              elektronik ortamda anında ifa edilen hizmetlerde cayma hakkı kullanılamaz
            </span>
            . Satın alma sırasında hizmetin anında başlatılmasını onayladığınızda, hizmetin fiilen kullanıldığı
            kısım bakımından cayma hakkınız sona erer. Buna rağmen, aşağıdaki durumlarda iade talebinizi
            değerlendiririz:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Satın alınan paketin hiç kullanılmamış olması (hiçbir creator erişimi veya ayrıcalığı tüketilmemişse).</li>
            <li>Teknik bir arıza nedeniyle hizmetin size hiç sunulamamış veya kesintiye uğramış olması.</li>
            <li>Yinelenen veya yanlışlıkla yapılmış çift çekim.</li>
          </ul>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">5. İptal ve İade Talebi</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Üyelik planınızı veya paketinizi dilediğiniz zaman panelinizden iptal edebilirsiniz; iptal, içinde
            bulunduğunuz dönemin sonunda geçerli olur ve sonraki dönem için ücret alınmaz. İade talebinizi{" "}
            <a href={`mailto:${COMPANY.email}`} className="font-medium text-foreground underline underline-offset-4">
              {COMPANY.email}
            </a>{" "}
            adresine veya{" "}
            <Link href="/iletisim" className="font-medium text-foreground underline underline-offset-4">
              iletişim formu
            </Link>{" "}
            üzerinden iletebilirsiniz. Talebinizde hesabınıza kayıtlı e-posta adresini, işlem tarihini ve iade
            gerekçenizi belirtmeniz süreci hızlandırır. Talepler en geç{" "}
            <span className="font-medium text-foreground">3 iş günü</span> içinde sonuçlandırılarak size yazılı
            olarak bildirilir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">6. İadenin Yapılması ve Süresi</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Onaylanan iadeler, <span className="font-medium text-foreground">ödemenin yapıldığı kartın aynısına</span>{" "}
            ve aynı para biriminde yapılır; nakit veya farklı bir hesaba iade yapılmaz. İade tutarı, talebin
            onaylanmasından itibaren en geç 14 gün içinde iyzico ödeme altyapısı üzerinden bankanıza gönderilir.
            Tutarın kart ekstrenize yansıması, bankanızın işleyişine bağlı olarak ortalama 2-10 iş günü sürebilir; bu
            süre TRUGC&apos;nin kontrolünde değildir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">7. Hizmetin Sunulamaması</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Satın aldığınız hizmetin sunulmasının imkânsız hale gelmesi durumunda bu durum size derhal bildirilir ve
            tahsil edilen tüm ödemeler, bildirimden itibaren en geç 14 gün içinde iade edilir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">8. Şikâyet ve Uyuşmazlık Çözümü</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Taleplerinizi öncelikle destek ekibimize iletmenizi rica ederiz. Çözüme ulaşılamayan durumlarda,
            Ticaret Bakanlığı&apos;nca her yıl belirlenen parasal sınırlar çerçevesinde, ikametgâhınızın veya
            işlemin yapıldığı yerin Tüketici Hakem Heyetlerine ya da Tüketici Mahkemelerine başvurabilirsiniz.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">9. Satıcı Bilgileri</h2>
          {legalRows.length > 0 ? (
            <dl className="mt-4 divide-y divide-border/60 rounded-2xl border border-border/60 text-sm">
              {legalRows.map((row) => (
                <div key={row.label} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-6">
                  <dt className="w-44 shrink-0 text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Şirket künye bilgileri için{" "}
              <Link href="/iletisim" className="font-medium text-foreground underline underline-offset-4">
                iletişim sayfamıza
              </Link>{" "}
              bakabilirsiniz.
            </p>
          )}
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Destek saatlerimiz: {COMPANY.supportHours}.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-12 rounded-2xl border border-border/60 bg-muted/30 p-6">
          <h2 className="text-base font-semibold tracking-tight">Ödeme Yöntemleri</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Visa ve Mastercard logolu kredi ve banka kartlarıyla ödeme yapabilirsiniz.
          </p>
          <PaymentMethods className="mt-5" />
        </section>
      </Reveal>
    </div>
  );
}
