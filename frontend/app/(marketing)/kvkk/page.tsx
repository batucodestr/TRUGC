import { Reveal } from "@/components/Motion/Reveal";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "KVKK Aydınlatma Metni — TRUGC" };

export default function KvkkPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal>
        <p className="text-sm font-medium text-violet-600">Yasal</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">KVKK Aydınlatma Metni</h1>
        <p className="mt-4 text-sm text-muted-foreground">Son güncelleme: 26 Ağustos 2026</p>
        <p className="mt-6 text-muted-foreground leading-relaxed">
          Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, TRUGC Teknoloji
          A.Ş. tarafından veri sorumlusu sıfatıyla işlenen kişisel verileriniz hakkında sizi bilgilendirmek amacıyla
          hazırlanmıştır.
        </p>
      </Reveal>

      <Separator className="mt-10" />

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">1. Veri Sorumlusunun Kimliği</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Kişisel verileriniz, veri sorumlusu sıfatıyla{" "}
            <span className="font-medium text-foreground">TRUGC Teknoloji A.Ş.</span> (&quot;TRUGC&quot;) tarafından
            işlenmektedir.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Adres:</span> Maslak Mahallesi, Büyükdere Caddesi No: 237,
              Nurol Plaza Kat: 8, Sarıyer / İstanbul
            </li>
            <li>
              <span className="font-medium text-foreground">E-posta:</span> kvkk@trugc.com
            </li>
          </ul>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">2. İşlenen Kişisel Veriler</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Platform üzerinden aşağıdaki kategorilerde kişisel verileriniz işlenmektedir:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Kimlik verileri:</span> ad, soyad, doğum tarihi,
              kullanıcı adı.
            </li>
            <li>
              <span className="font-medium text-foreground">İletişim verileri:</span> e-posta adresi, telefon
              numarası, adres bilgisi.
            </li>
            <li>
              <span className="font-medium text-foreground">İşlem güvenliği verileri:</span> IP adresi, oturum
              kayıtları, cihaz ve tarayıcı bilgileri, giriş-çıkış zaman damgaları.
            </li>
            <li>
              <span className="font-medium text-foreground">Pazarlama verileri:</span> alışkanlık ve beğeni
              bilgileri, kampanya tercihleri, bülten aboneliği kayıtları.
            </li>
            <li>
              <span className="font-medium text-foreground">Finans ve ödeme verileri:</span> fatura bilgileri, IBAN,
              ödeme geçmişi ve komisyon kayıtları (kart bilgileri doğrudan lisanslı ödeme kuruluşları tarafından
              işlenir ve TRUGC sunucularında saklanmaz).
            </li>
          </ul>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">3. Kişisel Verilerin İşlenme Amaçları</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">Kişisel verileriniz;</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Platform üyeliğinizin oluşturulması ve yönetilmesi,</li>
            <li>Marka ve creator eşleştirmelerinin gerçekleştirilmesi,</li>
            <li>Kampanya, sözleşme ve ödeme süreçlerinin yürütülmesi,</li>
            <li>Platform güvenliğinin ve hukuki uyumluluğun sağlanması,</li>
            <li>Müşteri ilişkileri ve destek süreçlerinin yürütülmesi,</li>
            <li>Onayınız dahilinde pazarlama ve iletişim faaliyetlerinin yürütülmesi</li>
          </ul>
          <p className="mt-3 text-muted-foreground leading-relaxed">amaçlarıyla işlenmektedir.</p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">4. Kişisel Verilerin İşlenmesinin Hukuki Sebepleri</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Kişisel verileriniz, KVKK&apos;nın 5. maddesinde yer alan aşağıdaki hukuki sebeplere dayanılarak
            işlenmektedir: bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması (kampanya ve
            hesap sözleşmeleri), TRUGC&apos;nin hukuki yükümlülüklerini yerine getirebilmesi, ilgili kişinin
            temel hak ve özgürlüklerine zarar vermemek kaydıyla veri sorumlusunun meşru menfaati (platform güvenliği
            ve hizmet iyileştirme) ve belirli süreçlerde (örneğin pazarlama iletişimi) açık rızanızın bulunması.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">5. Kişisel Verilerin Aktarılması</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Kişisel verileriniz, yukarıda belirtilen amaçların gerçekleştirilmesiyle sınırlı olarak; yurt içindeki
            barındırma ve teknoloji hizmet sağlayıcılarımıza, ödeme işlemlerinin yürütülmesi için lisanslı ödeme
            kuruluşları ve bankalara, hukuki yükümlülüklerimiz kapsamında yetkili kamu kurum ve kuruluşlarına
            aktarılabilir. Kullandığımız bazı bulut altyapı ve analitik hizmet sağlayıcılarının sunucuları yurt
            dışında bulunabilir; bu durumda aktarım, KVKK&apos;nın öngördüğü uygun güvenlik önlemleri alınarak ve
            açık rızanız veya kanunda öngörülen diğer istisnalar çerçevesinde gerçekleştirilir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">6. Veri Sahibinin Hakları</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            KVKK&apos;nın 11. maddesi uyarınca TRUGC&apos;ye başvurarak aşağıdaki haklarınızı kullanabilirsiniz:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
            <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme,</li>
            <li>
              Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,
            </li>
            <li>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme,</li>
            <li>
              Kişisel verilerin eksik veya yanlış işlenmiş olması halinde bunların düzeltilmesini isteme,
            </li>
            <li>
              KVKK&apos;nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerin silinmesini veya yok
              edilmesini isteme,
            </li>
            <li>
              Düzeltme, silme ve yok etme işlemlerinin, kişisel verilerin aktarıldığı üçüncü kişilere de
              bildirilmesini isteme,
            </li>
            <li>
              İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir
              sonucun ortaya çıkmasına itiraz etme,
            </li>
            <li>
              Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın
              giderilmesini talep etme.
            </li>
          </ul>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">7. Başvuru Yöntemi</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Yukarıda sayılan haklarınızı kullanmak için talebinizi yazılı olarak veya kayıtlı elektronik posta (KEP)
            adresi, güvenli elektronik imza, mobil imza ya da TRUGC&apos;ye daha önce bildirdiğiniz ve sistemimizde
            kayıtlı bulunan e-posta adresinizi kullanmak suretiyle{" "}
            <span className="font-medium text-foreground">kvkk@trugc.com</span> adresine ya da yukarıda belirtilen
            şirket adresimize iletebilirsiniz. Başvurunuz, talebin niteliğine göre en geç 30 gün içinde ücretsiz
            olarak sonuçlandırılır; işlemin ayrıca bir maliyet gerektirmesi halinde Kişisel Verileri Koruma Kurulu
            tarafından belirlenen tarifedeki ücret talep edilebilir.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
