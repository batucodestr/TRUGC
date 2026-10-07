import Link from "next/link";
import { Reveal } from "@/components/Motion/Reveal";
import { Separator } from "@/components/ui/separator";
import { COMPANY, companyLegalRows } from "@/lib/company";

export const metadata = {
  title: "Mesafeli Satış Sözleşmesi — TRUGC",
  description:
    "TRUGC üzerinden elektronik ortamda satın alınan hizmetlere ilişkin mesafeli satış sözleşmesi: taraflar, hizmet bedeli, ifa, cayma hakkı ve uyuşmazlık çözümü.",
};

export default function MesafeliSatisSozlesmesiPage() {
  const legalRows = companyLegalRows();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal>
        <p className="text-sm font-medium text-violet-600">Yasal</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Mesafeli Satış Sözleşmesi</h1>
        <p className="mt-4 text-sm text-muted-foreground">Son güncelleme: 7 Ekim 2026</p>
        <p className="mt-6 text-muted-foreground leading-relaxed">
          Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca,
          TRUGC üzerinden elektronik ortamda satın alınan hizmetler için düzenlenmiştir. Ödeme adımını
          tamamladığınızda bu sözleşmeyi okuduğunuzu ve kabul ettiğinizi beyan etmiş olursunuz.
        </p>
      </Reveal>

      <Separator className="mt-10" />

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">1. Taraflar</h2>
          <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Satıcı</h3>
          {legalRows.length > 0 ? (
            <dl className="mt-3 divide-y divide-border/60 rounded-2xl border border-border/60 text-sm">
              {legalRows.map((row) => (
                <div key={row.label} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-6">
                  <dt className="w-44 shrink-0 text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Satıcıya ait ticaret unvanı, adres, vergi dairesi ve vergi kimlik numarası bilgileri{" "}
              <Link href="/iletisim" className="font-medium text-foreground underline underline-offset-4">
                iletişim sayfasında
              </Link>{" "}
              yer almaktadır.
            </p>
          )}
          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Alıcı</h3>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Platforma üye olurken ve ödeme adımında beyan ettiğiniz ad, soyad / unvan, adres, e-posta ve telefon
            bilgileri esas alınır. Bu bilgilerin doğruluğundan alıcı sorumludur.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">2. Sözleşmenin Konusu</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Bu sözleşmenin konusu, alıcının TRUGC üzerinden elektronik ortamda satın aldığı dijital hizmetlere
            (creator erişim paketleri, üyelik planları ve kampanya bütçesi işlemleri) ilişkin olarak tarafların hak ve
            yükümlülüklerinin belirlenmesidir. Platform üzerinden fiziksel ürün satışı yapılmaz.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">3. Hizmet Bedeli ve Ödeme</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Satın alınan hizmetin adı, süresi ve toplam bedeli, ödeme adımından önce ekranda özet olarak gösterilir.
            Tüm fiyatlar Türk Lirası (TL) cinsinden ve <span className="font-medium text-foreground">KDV dahil</span>{" "}
            olarak belirtilir; ayrıca bir hizmet veya işlem bedeli alınmaz. Ödeme, Visa ve Mastercard logolu kredi ve
            banka kartlarıyla, iyzico güvenli ödeme altyapısı üzerinden 3D Secure doğrulamasıyla tahsil edilir. Kart
            bilgileri yalnızca ödeme kuruluşunun sayfasına girilir; TRUGC tarafından görülmez ve saklanmaz.
          </p>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Kampanya bütçeleri doğrudan creator&apos;a aktarılmaz; emanet (escrow) hesabında bloke edilir ve ancak
            marka teslimatı onayladığında serbest bırakılır. Platform hizmet bedeli (komisyon) oranı{" "}
            <Link href="/kullanim-sartlari" className="font-medium text-foreground underline underline-offset-4">
              Kullanım Şartları
            </Link>{" "}
            metninde ve kampanya özetlerinde açıkça gösterilir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">4. İfa ve Teslimat</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Hizmet, ödemenin onaylandığı anda alıcının TRUGC hesabına tanımlanarak elektronik ortamda ifa edilir;
            teknik bir aksaklık halinde ifa süresi en geç 24 saattir. Dijital hizmet söz konusu olduğundan kargo veya
            teslimat bedeli alınmaz. Teslimata ilişkin ayrıntılar{" "}
            <Link href="/teslimat-ve-iade" className="font-medium text-foreground underline underline-offset-4">
              Teslimat ve İade Koşulları
            </Link>{" "}
            metninde yer alır ve bu sözleşmenin ayrılmaz parçasıdır.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">5. Cayma Hakkı</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Alıcı, sözleşmenin kurulduğu tarihten itibaren 14 gün içinde gerekçe göstermeksizin ve cezai şart
            ödemeksizin cayma hakkına sahiptir. Cayma bildirimi,{" "}
            <a href={`mailto:${COMPANY.email}`} className="font-medium text-foreground underline underline-offset-4">
              {COMPANY.email}
            </a>{" "}
            adresine veya{" "}
            <Link href="/iletisim" className="font-medium text-foreground underline underline-offset-4">
              iletişim formuna
            </Link>{" "}
            yazılı olarak iletilir. Cayma hakkının usulüne uygun kullanılması halinde, tahsil edilen bedel bildirimin
            ulaşmasından itibaren en geç 14 gün içinde, ödemenin yapıldığı kartın aynısına iade edilir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">6. Cayma Hakkının Kullanılamayacağı Haller</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15. maddesi uyarınca, elektronik ortamda anında ifa edilen
            hizmetler ile tüketiciye anında teslim edilen gayrimaddi mallara ilişkin sözleşmelerde cayma hakkı
            kullanılamaz. Alıcı, satın alma adımında hizmetin anında başlatılmasını onayladığında, fiilen
            yararlanılan kısım bakımından cayma hakkının sona erdiğini kabul eder. Hizmetin hiç kullanılmadığı,
            teknik arıza nedeniyle sunulamadığı veya yinelenen çekim yapıldığı hallerde iade talepleri{" "}
            <Link href="/teslimat-ve-iade" className="font-medium text-foreground underline underline-offset-4">
              Teslimat ve İade Koşulları
            </Link>{" "}
            kapsamında değerlendirilir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">7. Temerrüt Hali</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Alıcının kredi kartıyla yaptığı işlemlerde temerrüde düşmesi halinde, kart sahibi bankayla arasındaki
            kredi kartı sözleşmesi çerçevesinde bankaya karşı sorumlu olacağını kabul eder. Satıcının ifada temerrüde
            düşmesi halinde alıcı, sözleşmeyi feshederek ödediği bedelin iadesini talep edebilir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">8. Uyuşmazlık Çözümü</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Bu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığı&apos;nca her yıl ilan edilen parasal sınırlar
            çerçevesinde alıcının yerleşim yerindeki veya işlemin yapıldığı yerdeki Tüketici Hakem Heyetleri ile
            Tüketici Mahkemeleri yetkilidir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">9. Yürürlük</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Alıcı, ödeme adımında bu sözleşmenin tüm koşullarını okuduğunu ve kabul ettiğini onaylar; sözleşme bu
            onayla birlikte yürürlüğe girer. Sözleşmenin bir örneği, satın alma sonrasında alıcının kayıtlı e-posta
            adresine gönderilir.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
