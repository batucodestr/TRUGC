import { Reveal } from "@/components/Motion/Reveal";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Gizlilik Politikası — TRUGC" };

export default function GizlilikPolitikasiPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal>
        <p className="text-sm font-medium text-violet-600">Yasal</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Gizlilik Politikası</h1>
        <p className="mt-4 text-sm text-muted-foreground">Son güncelleme: 26 Ağustos 2026</p>
        <p className="mt-6 text-muted-foreground leading-relaxed">
          TRUGC olarak, platformumuzu kullanan markaların ve creator&apos;ların gizliliğine önem veriyoruz. Bu
          Gizlilik Politikası, trugc.com üzerinden sunduğumuz hizmetler kapsamında hangi kişisel verileri
          topladığımızı, bu verileri hangi amaçlarla kullandığımızı ve haklarınızı nasıl kullanabileceğinizi açıklar.
          Platformu kullanarak bu politikada açıklanan uygulamaları kabul etmiş olursunuz.
        </p>
      </Reveal>

      <Separator className="mt-10" />

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">1. Toplanan Veriler</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Hesabınızı oluştururken ve platformu kullanırken aşağıdaki veri kategorilerini işleriz:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Kimlik ve iletişim verileri:</span> ad soyad, e-posta
              adresi, telefon numarası, doğum tarihi ve profilinizde paylaştığınız diğer bilgiler.
            </li>
            <li>
              <span className="font-medium text-foreground">Hesap ve profil verileri:</span> kullanıcı adı, profil
              fotoğrafı, niş/kategori tercihleri, bağladığınız sosyal medya hesapları (Instagram, TikTok, YouTube,
              Twitch) ve bu hesaplara ait genel istatistikler.
            </li>
            <li>
              <span className="font-medium text-foreground">İşlem ve ödeme verileri:</span> kampanya başvuruları,
              teslim edilen içerikler, fatura bilgileri ve ödeme sağlayıcımız aracılığıyla işlenen ödeme kayıtları.
              Kart bilgilerinizi kendi sunucularımızda saklamayız.
            </li>
            <li>
              <span className="font-medium text-foreground">Kullanım verileri:</span> cihaz bilgileri, IP adresi,
              tarayıcı türü, ziyaret edilen sayfalar ve platform içi etkileşim kayıtları.
            </li>
            <li>
              <span className="font-medium text-foreground">İletişim kayıtları:</span> destek ekibimizle yaptığınız
              yazışmalar ve platform içi mesajlaşma geçmişiniz.
            </li>
          </ul>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">2. Verilerin Kullanım Amaçları</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">Topladığımız verileri şu amaçlarla kullanırız:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Hesabınızı oluşturmak, doğrulamak ve platform hizmetlerini sunmak.</li>
            <li>Marka ve creator&apos;ları niş, bütçe ve hedef kitleye göre eşleştirmek.</li>
            <li>Kampanya süreçlerini, teslimatları ve ödemeleri yönetmek.</li>
            <li>Platform güvenliğini sağlamak, dolandırıcılık ve kötüye kullanımı önlemek.</li>
            <li>Müşteri desteği sunmak ve size hizmetle ilgili bildirimler göndermek.</li>
            <li>Platformu geliştirmek amacıyla anonimleştirilmiş kullanım verilerini analiz etmek.</li>
            <li>Onayınız dahilinde pazarlama ve ürün duyurusu e-postaları göndermek.</li>
          </ul>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">3. Çerezler</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Platformumuzda oturum yönetimi, tercihlerinizin hatırlanması ve site performansının ölçülmesi amacıyla
            çerezler (cookies) kullanılır. Zorunlu çerezler platformun temel işlevlerinin çalışması için gereklidir
            ve devre dışı bırakılamaz. Analitik ve tercih çerezleri ise site içi davranışları anlamamıza ve deneyimi
            kişiselleştirmemize yardımcı olur; bu çerezleri tarayıcı ayarlarınızdan yönetebilir veya
            reddedebilirsiniz. Çerez tercihlerinizi değiştirmeniz platformun bazı özelliklerinin beklendiği gibi
            çalışmamasına neden olabilir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">4. Üçüncü Taraf Paylaşımı</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Kişisel verilerinizi yalnızca aşağıdaki durumlarda ve gerekli ölçüde üçüncü taraflarla paylaşırız:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              Kampanya sürecinin doğası gereği, başvurunuzu ya da profilinizi ilgili marka veya creator ile
              paylaşırız.
            </li>
            <li>Ödeme işlemlerini gerçekleştirmek için lisanslı ödeme kuruluşları ve bankalarla.</li>
            <li>
              Sunucu barındırma, e-posta gönderimi ve analitik gibi hizmetleri sağlayan güvenilir tedarikçilerle,
              yalnızca hizmetin gerektirdiği ölçüde.
            </li>
            <li>Yasal bir yükümlülüğün yerine getirilmesi veya yetkili bir mercinin talebi halinde.</li>
          </ul>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Verilerinizi hiçbir koşulda pazarlama amacıyla üçüncü taraflara satmayız.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">5. Veri Güvenliği</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Verilerinizi korumak için şifreleme, erişim kontrolleri ve düzenli güvenlik denetimleri dahil olmak üzere
            sektör standardı teknik ve idari önlemler uygularız. Ödeme bilgileri, PCI-DSS uyumlu ödeme
            sağlayıcılarımız tarafından işlenir. Buna rağmen internet üzerinden hiçbir veri iletiminin veya
            depolamanın yüzde yüz güvenli olmadığını hatırlatırız; herhangi bir güvenlik ihlali şüphesi durumunda
            sizi ve ilgili mercileri en kısa sürede bilgilendiririz.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">6. Kullanıcı Hakları</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">Kişisel verilerinizle ilgili olarak şu haklara sahipsiniz:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Hangi verilerinizin işlendiğini öğrenme ve bir kopyasını talep etme.</li>
            <li>Eksik veya yanlış verilerin düzeltilmesini isteme.</li>
            <li>Belirli koşullarda verilerinizin silinmesini veya işlenmesinin durdurulmasını talep etme.</li>
            <li>Pazarlama iletişimlerinden istediğiniz zaman çıkma (abonelikten çıkma bağlantısı ile).</li>
            <li>Verilerinizin işlenmesine itiraz etme.</li>
          </ul>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Bu haklarınızı kullanmak için aşağıdaki iletişim kanallarından bize ulaşabilirsiniz. Talepleriniz en geç
            30 gün içinde değerlendirilerek sonuçlandırılır.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">7. İletişim</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Gizlilik politikamızla ilgili sorularınız için bizimle{" "}
            <span className="font-medium text-foreground">privacy@trugc.com</span> adresinden iletişime
            geçebilirsiniz. Bu politikada zaman zaman güncellemeler yapabiliriz; önemli değişiklikleri platform
            üzerinden veya e-posta yoluyla sizlere bildireceğiz.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
