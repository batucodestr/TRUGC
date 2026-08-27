import { Reveal } from "@/components/Motion/Reveal";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Kullanım Şartları — TRUGC" };

export default function KullanimSartlariPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal>
        <p className="text-sm font-medium text-violet-600">Yasal</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Kullanım Şartları</h1>
        <p className="mt-4 text-sm text-muted-foreground">Son güncelleme: 26 Ağustos 2026</p>
        <p className="mt-6 text-muted-foreground leading-relaxed">
          Bu Kullanım Şartları, TRUGC platformunu (&quot;Platform&quot;) kullanan markalar ve creator&apos;lar dahil tüm
          kullanıcılar için geçerlidir. Platforma kayıt olarak veya platformu kullanarak bu şartları kabul etmiş
          sayılırsınız. Şartları kabul etmiyorsanız platformu kullanmamanızı rica ederiz.
        </p>
      </Reveal>

      <Separator className="mt-10" />

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">1. Hesap Oluşturma ve Sorumluluklar</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Platformu kullanabilmek için doğru, güncel ve eksiksiz bilgilerle bir hesap oluşturmanız gerekir.
            Hesabınızın güvenliğinden ve hesabınız üzerinden gerçekleştirilen tüm işlemlerden siz sorumlusunuz.
            Şifrenizi üçüncü kişilerle paylaşmamalı, şüpheli bir erişim fark ettiğinizde derhal bizimle iletişime
            geçmelisiniz. 18 yaşından küçük kullanıcıların platforma yasal veli onayı olmadan kayıt olması yasaktır.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">2. Platform Kullanım Kuralları</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Platformu kullanırken aşağıdaki kurallara uymayı kabul edersiniz:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Yanıltıcı, sahte veya yanlış istatistik ve içerik paylaşmamak.</li>
            <li>Sahte takipçi, bot etkileşimi veya benzeri yapay yöntemlerle profil verilerini şişirmemek.</li>
            <li>Platform dışında ödeme almayı teklif ederek komisyon yükümlülüğünden kaçınmamak.</li>
            <li>Diğer kullanıcılara karşı taciz edici, ayrımcı veya yasa dışı içerik ve davranışta bulunmamak.</li>
            <li>Platformun teknik altyapısına zarar verecek veya işleyişini bozacak girişimlerde bulunmamak.</li>
          </ul>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Bu kurallara aykırı davranışlar tespit edildiğinde hesabınız uyarılabilir, kısıtlanabilir veya
            kalıcı olarak kapatılabilir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">3. Creator ve Marka Yükümlülükleri</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Creator&apos;lar, kabul ettikleri kampanya brief&apos;lerine uygun içerik üretmeyi, üzerinde anlaşılan
            teslim tarihlerine uymayı ve profillerinde paylaştıkları istatistiklerin doğruluğunu taahhüt eder.
            Markalar ise kampanya brief&apos;lerini açık ve eksiksiz şekilde hazırlamayı, onaylanan teslimatlar için
            ödemeyi zamanında yapmayı ve creator&apos;larla profesyonel bir iletişim yürütmeyi kabul eder. Taraflar
            arasındaki kampanya anlaşmaları, platform üzerinden kayıt altına alınan brief, teklif ve onay
            adımlarıyla bağlayıcı hale gelir.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">4. Ödeme ve Komisyon Şartları</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Markalar, bir kampanyayı başlatmadan önce anlaşılan tutarı TRUGC emanet (escrow) hesabına yatırır.
            Ödeme, creator&apos;ın teslimatı onaylandıktan sonra serbest bırakılır. TRUGC, creator&apos;a yapılan
            her ödemeden <span className="font-medium text-foreground">%8.5 oranında platform hizmet bedeli</span>{" "}
            keser; bu bedel platformun işletilmesi, güvenli ödeme altyapısı ve müşteri desteği maliyetlerini
            karşılamak için kullanılır. Güncel komisyon oranı creator panelinde ve kampanya özetlerinde açıkça
            gösterilir. İade ve anlaşmazlık durumlarında emanet tutarı, ilgili sürecin sonuçlanmasına kadar bloke
            halinde tutulur.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">5. Fikri Mülkiyet</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Creator&apos;ların ürettiği içeriklerin telif hakları, aksi kampanya anlaşmasında açıkça belirtilmedikçe
            creator&apos;a aittir. Kampanya kapsamında markaya tanınan kullanım hakları (örneğin sosyal medyada
            yeniden paylaşım, reklam kullanımı) brief ve teklif aşamasında netleştirilmelidir. Platformun kendisi,
            tasarımı, logosu ve yazılımı TRUGC&apos;nin fikri mülkiyetindedir ve izinsiz kopyalanamaz veya ticari
            amaçla kullanılamaz.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">6. Sorumluluğun Sınırlandırılması</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            TRUGC, marka ve creator&apos;lar arasındaki iş birliklerinin bir aracısı olarak hizmet verir; taraflar
            arasındaki içerik kalitesi, yaratıcı uyum veya ticari sonuçlarla ilgili taahhütte bulunmaz. Platform
            &quot;olduğu gibi&quot; sunulur ve kesintisiz veya hatasız çalışacağı garanti edilmez. TRUGC, dolaylı zararlar,
            kâr kaybı veya üçüncü taraf eylemlerinden doğan zararlar da dahil olmak üzere, yürürlükteki mevzuatın
            izin verdiği azami ölçüde sorumluluğunu sınırlandırır.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">7. Hesap Fesih Koşulları</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Hesabınızı istediğiniz zaman ayarlar panelinden kapatabilirsiniz; devam eden kampanyalarınız varsa bu
            kampanyaların tamamlanması veya karşılıklı olarak sonlandırılması gerekir. TRUGC, bu şartların ihlal
            edilmesi, dolandırıcılık şüphesi veya yasal bir zorunluluk halinde, önceden makul bir bildirimde
            bulunarak hesabınızı askıya alma veya kapatma hakkını saklı tutar. Fesih sonrasında tamamlanmış
            kampanyalara ilişkin ödeme yükümlülükleri geçerliliğini korur.
          </p>
        </section>
      </Reveal>

      <Reveal variant="fade">
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">8. Uyuşmazlık Çözümü</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Marka ve creator&apos;lar arasında bir kampanya kapsamında ortaya çıkan anlaşmazlıklarda, taraflar önce
            TRUGC destek ekibinin arabuluculuğuyla çözüm aramayı kabul eder. Bu yolla çözülemeyen uyuşmazlıklarda,
            bu şartlardan doğan her türlü ihtilafın çözümünde Türkiye Cumhuriyeti kanunları uygulanır ve İstanbul
            (Merkez) Mahkemeleri ile İcra Daireleri yetkilidir.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
