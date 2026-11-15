# TRUGC – Geliştirme Promptu

## Genel Bağlam (önce bunu oku)

Sen kıdemli bir full-stack geliştiricisin. **TRUGC** (https://trugc.com.tr) adlı, markalar ile içerik üreticilerini (creator) buluşturan Türkiye merkezli bir UGC pazaryeri üzerinde çalışıyorsun.

- Site **zaten yayında ve çalışıyor**. Sıfırdan proje kurma. Mevcut kod tabanını incele, mevcut yapıyı, veritabanını, auth sistemini ve sayfa yapısını koruyarak geliştir.
- Front-end **Next.js**. Mevcut klasör yapısına, kodlama stiline ve kullanılan kütüphanelere uy.
- Ödeme altyapısı olarak **PayTR zaten entegre** (3D Secure ile). Yeni bir ödeme sağlayıcısı ekleme; mevcut PayTR entegrasyonunu genişlet.
- Site dili **Türkçe**, para birimi **TL (KDV dahil)**.
- İşe başlamadan önce kod tabanını tara ve kısa bir durum raporu çıkar: hangi özellik zaten var, hangisi eksik, hangisi yarım. Sonra eksikleri tamamla. Var olan bir şeyi yeniden yazma, sadece eksik veya hatalı kısmı düzelt.

### Çalışma kuralları (çok önemli)

1. **Yarı yolda bana soru sorma ve durma.** Bir karar gerekiyorsa en mantıklı, en güvenli ve sektör standardı olan seçeneği kendin seç, kodun içine kısa bir yorum olarak hangi kararı neden aldığını yaz ve devam et.
2. Bir API anahtarı, secret, webhook URL'i, OAuth client ID vb. gerekirse **beni bekleme**. Kodda bunları `process.env.XXX` ile oku, `.env.example` dosyasına placeholder olarak ekle ve işine devam et.
3. **En sonda** bana tek bir liste ver: `.env` dosyasına eklemem gereken tüm değişkenler, her birinin ne işe yaradığı ve nereden alınacağı (ör. "Meta Developer Console → App → Client ID"). Ayrıca çalıştırmam gereken migration / seed / kurulum komutlarını da aynı listede sırayla yaz.
4. Gerekli paketleri kendin kur, gerekli veritabanı tablolarını/migration'larını kendin oluştur.
5. Tüm kritik kontroller (hak sayısı, üyelik süresi, ödeme doğrulama, yetki) **sunucu tarafında** yapılmalı. Tarayıcıdan gelen hiçbir değere güvenme.

---

## Yapılacaklar

### A. Üyelik ve Başvuru Sistemi

Mevcut creator paketleri (sitedeki fiyatlar korunacak):

| Paket | Süre | Fiyat (KDV dahil) | Başvuru Hakkı |
|---|---|---|---|
| Classic Creator | 3 gün | 149 TL | 3 |
| Classic Creator | Haftalık | 399 TL | 10 |
| Classic Creator | Aylık | 699 TL | 22 |
| Premium Creator | 3 gün | 249 TL | 5 |
| Premium Creator | Haftalık | 699 TL | 20 |
| Premium Creator | Aylık | 1.299 TL | 50 |

Premium ek özellikleri: premium rozet, öne çıkan profil, kampanya önceliği, gelişmiş istatistikler, premium kampanyalara erişim.

Yapılması gerekenler:
- 3 günlük, haftalık ve aylık üyelikler çalışmalı.
- **Satın alma sonrası otomatik aktivasyon:** Üyelik, yalnızca PayTR'den gelen ve sunucuda doğrulanan başarılı ödeme bildirimi (callback/webhook) sonrası açılmalı.
- **Süre bitince üyelik otomatik sona ermeli** (zamanlanmış görev/cron + her istekte `expires_at` kontrolü).
- **Başvuru hakkı doğru hesaplanmalı:** Her başvuruda hak, veritabanı işlemi (transaction) içinde atomik olarak düşülmeli.
- **Paket yükseltme ve yenileme:** Classic → Premium yükseltme, süre bitmeden yenileme. Yükseltme/yenilemede kalan hak ve süre nasıl taşınacak, mantıklı bir kural belirle ve uygula (ör. kalan haklar yeni pakete eklenir, süre yeni paketin süresiyle başlar).
- **Ödeme başarısızsa üyelik aktifleşmemeli.**
- **Aynı başvurudan iki kez hak düşülmemeli:** Bir creator aynı kampanyaya ikinci kez başvuramamalı (veritabanında unique constraint: creator_id + campaign_id), çift tıklama / yeniden gönderimde idempotent davranmalı.
- Hak sayısı ve üyelik süresi **kesinlikle sunucuda** kontrol edilmeli; kullanıcı tarayıcıdan müdahale ederek hak sayısını değiştirememeli.

### B. Kampanya Sistemi

Marka kampanya oluşturduğunda akış şu olmalı:
1. Kampanya bilgileri kaydedilmeli (başlık, açıklama, kategori, platform, bütçe/ücret, tarih aralığı, teslim şartları, görseller).
2. Admin onayı gerekiyorsa kampanya **"İncelemede"** durumuna alınmalı; admin panelinden onay/red yapılabilmeli.
3. Yayınlandığında **uygun creator'lara** gösterilmeli (kategori, platform, paket tipi; premium kampanyalar sadece Premium creator'lara).
4. Creator başvuru yapabilmeli (A bölümündeki hak kurallarıyla).
5. Marka başvuruyu **kabul veya reddedebilmeli**.
6. Kabul edilen creator ile **iş birliği başlamalı**.
7. İçerik **teslim edilmeli ve marka tarafından onaylanmalı** (revizyon isteme seçeneğiyle).
8. İş tamamlandığında **ödeme süreci başlatılmalı**.

Kampanya durumları: Taslak → İncelemede → Aktif/Yayında → Devam Ediyor → Tamamlandı / İptal.
İş birliği durumları: Başvuru → Kabul / Red → İçerik Bekleniyor → Teslim Edildi → Revizyon → Onaylandı → Ödendi.

**Her aşama kayıt altında tutulmalı:** Durum değişikliklerini kim, ne zaman, hangi eskiden hangi yeniye değiştirdi şeklinde bir log/audit tablosunda sakla.

### C. Ödeme Sistemi (Kritik Öncelik)

TRUGC'nin en hassas bölümü. İki farklı para akışı **birbirinden ayrı** tutulmalı:
1. **Creator'ın üyelik ödemesi.**
2. **Markanın kampanya bütçesi ve creator'a yapılacak ödeme.**

İstenen özellikler:
- Mevcut **PayTR** entegrasyonunu kullan; kampanya ödemeleri için PayTR'nin **pazaryeri / alt üye işyeri (marketplace)** yapısını kullan. Platformun kendi hesabında kendi kendine bir "emanet/escrow" sistemi kurma; para tutma ve dağıtma işlemleri PayTR'nin pazaryeri altyapısı üzerinden yürüsün.
- **Ödeme bildirimi sunucu tarafından doğrulanmalı** (PayTR hash/imza kontrolü, tutar ve sipariş no eşleşmesi). Aynı bildirim iki kez gelirse işlem iki kez yapılmamalı (idempotency).
- **Başarılı ödeme olmadan üyelik açılmamalı.**
- **İade ve iptal yönetimi** (üyelik iadesi, kampanya iptalinde marka bütçesinin iadesi).
- **Marka ve creator hak edişleri ayrı tutulmalı** (bakiye/hak ediş tabloları ayrı).
- **Komisyonlar otomatik hesaplanmalı:** Mevcut kural korunacak → markaya kampanya bütçesi üzerine **%10 platform komisyonu** eklenir, creator kazancından kesilmez.
- **Her işlemin muhasebe kaydı tutulmalı** (ledger mantığı: işlem tipi, tutar, komisyon, KDV, taraf, sipariş no, durum, tarih). Kayıtlar silinmez, sadece ters kayıtla düzeltilir.
- Marka panelinde "Ödemeler", creator panelinde "Kazançlarım" sayfaları bu verilerden beslenmeli.

### D. Creator Doğrulama Sistemi

TRUGC'nin en büyük avantajı gerçek creator'ları gösterebilmesi olmalı.
- **Instagram, TikTok ve YouTube hesap bağlantıları** (resmî API ve OAuth ile).
- **Takipçi sayısı ve erişim bilgileri** API üzerinden çekilip periyodik olarak güncellenmeli.
- **Sahte profil kontrolü** (bağlanan hesabın gerçekten o kullanıcıya ait olduğunun OAuth ile doğrulanması, şüpheli verilerin admin'e işaretlenmesi).
- **Profil doğrulama rozeti** (mavi tik – doğrulanmış creator).
- **Portföy videosu yükleme.**
- **Marka değerlendirmeleri** (iş bitince marka creator'a puan ve yorum verir).
- **Tamamlanan iş sayısı.**
- **Zamanında teslim oranı.**

Kurallar: **Sosyal medya şifreleri kesinlikle istenmeyecek.** Sadece resmî API ve OAuth bağlantıları kullanılacak. Her platformun erişim ve veri kullanım sınırlarına uyulacak. OAuth client ID/secret'ları `.env`'den okunacak.

### E. Mesajlaşma Sistemi

Marka ve creator platform dışına çıkmadan iletişim kurabilmeli.
- Anlık mesajlaşma (WebSocket veya mevcut altyapıya uygun realtime çözüm).
- Fotoğraf ve video gönderme.
- Dosya yükleme.
- Okundu bilgisi.
- Bildirim sistemi (site içi zil ikonu + okunmamış sayacı; sol menüdeki "Mesajlar" rozetleri).
- Şikâyet ve engelleme.
- Kampanya bazlı mesaj geçmişi (her konuşma bir kampanya/iş birliğine bağlı).

Mesajlar ve dosyalar **güvenli saklanmalı**: dosyalar herkese açık URL ile değil, yetki kontrollü / süreli imzalı URL ile sunulmalı; sadece konuşmanın tarafları erişebilmeli. Dosya tipi ve boyut sınırı sunucuda kontrol edilmeli.

---

## Yeni Tema

Mevcut sitenin tasarımı tamamen yenilenecek. Sana ayrıca 3 referans ekran görüntüsü vereceğim (Ana Sayfa, Marka Paneli, Creator Paneli). **Tasarımı bu görsellerle birebir aynı yap.** Aşağıdaki açıklama görsellere ek olarak renk, font ve bileşen detaylarını tanımlıyor. İçerik, fiyatlar ve işlevler korunur; sadece görünüm değişir. Tüm sayfalar (giriş, kayıt, fiyatlandırma, kampanya detay, profil, ayarlar vb.) aynı tasarım diliyle güncellenmeli ve tam **responsive** (mobil, tablet, masaüstü) olmalı.

### Genel Stil
- **Koyu tema (dark mode)**, mor ağırlıklı, premium ve modern bir SaaS görünümü.
- Arka planda koyu lacivert-siyah zemin üzerinde hafif **mor ışık parlamaları (glow / radial gradient)**.
- Kartlar yarı saydam, hafif **glassmorphism** etkili, ince açık kenarlıklı, yuvarlatılmış köşeli.
- Butonlar ve vurgular **mor → fuşya gradient**.
- Yumuşak gölgeler, mor glow efektli hover durumları, akıcı geçişler (150–250ms).

### Renk Paleti

| Kullanım | Renk |
|---|---|
| Ana arka plan | `#0B0A16` |
| İkincil arka plan / sidebar | `#110E20` |
| Kart arka planı | `#17132B` (veya `rgba(255,255,255,0.03)`) |
| Kart kenarlığı | `rgba(255,255,255,0.08)` |
| Ana mor (primary) | `#8B3DFF` |
| Açık mor (vurgulu başlık metni, linkler) | `#A855F7` |
| Primary gradient | `linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #C026D3 100%)` |
| Glow | `rgba(139, 61, 255, 0.35)` |
| Başlık / ana metin | `#FFFFFF` |
| İkincil metin | `#A9A6C2` |
| Soluk metin | `#6E6A8A` |
| Başarı / artış (↑ +%36, Aktif) | `#22C55E` (zemin `rgba(34,197,94,0.15)`) |
| Bilgi rozeti (Devam Ediyor) | `#3B82F6` (zemin `rgba(59,130,246,0.18)`) |
| Nötr rozet (Tamamlandı, İçerik Bekleniyor) | zemin `rgba(255,255,255,0.08)`, metin `#D4D2E3` |
| Doğrulama tiki | `#3B9BFF` |
| Premium taç ikonu | `#FBBF24` |
| Bildirim noktası | `#D946EF` |

### Tipografi
- **Font:** `Plus Jakarta Sans` (Google Fonts, Türkçe karakter desteği var). Yedek: `Inter, system-ui, sans-serif`. `next/font/google` ile yükle.
- Hero başlığı: 56–64px, **800 (ExtraBold)**, satır aralığı 1.1, harf aralığı -0.02em. Son satır ("Buluşturuyoruz") mor gradient/açık mor renkte.
- Panel karşılama başlığı ("Tekrar hoş geldiniz, **Glow Cosmetics** 👋"): 32–36px, 700–800; isim açık mor.
- Kart başlıkları: 20–22px, 700.
- İstatistik rakamları (3, 128, 24.900 TL, 2.4M): 30–36px, 800.
- Gövde metni: 15–16px, 400–500, ikincil metin rengi.
- Küçük etiket / rozet: 12–13px, 500–600.

### Köşe, Boşluk ve Gölge
- Kart köşe yarıçapı: **16–20px**; butonlar **12–14px**; rozetler/chip'ler **tam yuvarlak (pill)**.
- İkon kutuları: 48–56px, yuvarlatılmış kare, mor yarı saydam zemin (`rgba(139,61,255,0.15)`), mor ikon.
- Kart iç boşluğu 20–24px; kartlar arası boşluk 20–24px.
- Primary buton: gradient zemin, beyaz metin, alt kısımda mor glow gölge (`0 8px 24px rgba(139,61,255,0.4)`).
- Secondary buton: şeffaf zemin, 1px açık mor/beyaz yarı saydam kenarlık, beyaz metin.
- İkon seti: ince çizgili (outline) ikonlar — `lucide-react`.

### Ana Sayfa (1. görsel)
- **Üst menü:** Solda mor gradient kare içinde "T" logo + "TRUGC" yazısı. Ortada: İçerik Üreticileri ▾, Markalar ▾, Kampanyalar, Nasıl Çalışır?, Fiyatlandırma. Sağda "Giriş Yap" (outline) ve "Kayıt Ol" (gradient) butonları.
- **Hero (sol):** Üstte ⚡ ikonlu pill rozet "Türkiye'nin UGC & Creator Pazaryeri". Büyük başlık "Markalar ile İçerik Üreticilerini **Buluşturuyoruz**". Altında açıklama metni. "Hemen Başla →" (gradient) ve "▶ Tanıtım Videosu" (outline) butonları. Altında üç istatistik: ikon + "12.400+ İçerik Üreticisi", "2.900+ Marka", "%184 Ortalama Etkileşim Artışı".
- **Hero (sağ):** Mor daire/glow önünde creator görseli; etrafında hafif eğik, glow'lu, yüzen Instagram, TikTok, YouTube ve Reels ikonları (yavaş float animasyonu). Sağ üstte cam efektli "Kampanya Sonucu +%184 Etkileşim" kartı (yeşil yükselen grafik oku). Alt tarafta "@cerenugc ✓ UGC Creator | ▶ 85.4K" profil kartı.
- **Özellik şeridi:** Tek geniş kart içinde dikey ayraçlarla 4 kolon: Doğru Eşleşme, Hızlı Kampanya, Güvenli Ödeme, Ölçülebilir Sonuç (mor outline ikon + başlık + açıklama).
- **CTA banner:** Mor gradient geniş kart. Solda hafif eğik, üst üste binen 3 creator video kartı (▶ 256K, 421K, 198K). Ortada "Markanız için UGC içerik mi arıyorsunuz?" başlığı ve açıklama. Sağda beyaz zeminli, mor yazılı "Hemen Kampanya Oluştur →" butonu.
- Mevcut ana sayfa bölümleri (kategori chip'leri, marka logoları, içerik vitrini, nasıl çalışır, yorumlar, fiyatlandırma, SSS, footer) korunup bu tasarım diliyle yeniden stillendirilmeli.

### Marka Paneli (2. görsel)
- **Sol sidebar:** Genel Bakış (aktifken gradient dolu buton), Kampanyalarım, İçerik Üreticileri, Başvurular (mor sayı rozeti), Mesajlar (rozet), Ödemeler, Raporlar, Marka Profilim, Ayarlar. Altta "👑 Premium Marka" gradient kartı + "Paketi Yükselt →" butonu.
- **Üst bar:** Menü + bildirim zili (fuşya nokta) + sağda marka avatarı, "Glow Cosmetics / Marka Hesabı" ▾.
- **Karşılama:** "Tekrar hoş geldiniz, **Glow Cosmetics** 👋" + alt açıklama; sağda dekoratif ürün görseli ve mor glow.
- **4 istatistik kartı:** Aktif Kampanya, Toplam Başvuru, Kabul Edilen, Tahmini Erişim — ikon kutusu + rakam + yeşil ↑ değişim yüzdesi.
- **Kampanya Performansı:** Mor çizgili, altı mor gradient dolgulu yumuşak alan grafiği (smooth area chart), beyaz noktalı veri noktaları, son noktada tooltip kartı ("2.4M Erişim"), sağ üstte "Son 30 Gün ▾" seçici. (Recharts kullanılabilir.)
- **Hızlı İşlemler:** "+ Yeni Kampanya Oluştur" gradient butonu ve altında ok ikonlu liste satırları (Uygun Creator'ları Keşfet, Başvuruları İncele [rozet], Raporları Görüntüle).
- **Son Kampanyalarım:** Küçük görsel + başlık + durum rozeti (Aktif yeşil, Devam Ediyor mavi, Tamamlandı gri) + tarih + başvuru/onay sayısı + erişim + ⋮ menü. Sağ üstte "Tümünü Gör →".
- **Son Başvurular:** Avatar + kullanıcı adı (doğrulama tiki) + takipçi sayısı + "İncele →" outline buton.

### Creator Paneli (3. görsel)
- **Sol sidebar:** Genel Bakış, Kampanyalar (rozet), Başvurularım (rozet), İşbirliklerim, Kazançlarım, İstatistikler, İçerik Portföyüm, Profilim, Ayarlar. Altta "👑 Creator Pro" kartı + "Pro'ya Yükselt →".
- **Karşılama:** "Merhaba **Ceren**! 👋" + açıklama; sağda creator görseli ve yüzen sosyal medya ikonları.
- **4 istatistik kartı:** Aktif İşbirliği, Toplam Başvuru, Toplam Erişim, Toplam Kazanç (yeşil artış pill'leri).
- **Senin İçin Önerilen Kampanyalar:** 4'lü kart ızgarası — görsel üzerinde kategori pill'i (sol üst) ve kalp ikonu (sağ üst), marka logosu + adı + doğrulama tiki, kampanya başlığı, ücret (ör. 5.000 TL) ve küçük gradient "Başvur →" butonu.
- **Profil Tamamlama:** Dairesel ilerleme halkası (%85), açıklama, yeşil tikli kontrol listesi, "Tamamla →" gradient buton.
- **Kazançlarım:** Büyük tutar (12.400 TL), yeşil ↑ %58, "Bu ay ▾" seçici, aylara göre giderek yükselen mor gradient bar grafik.
- **Son İşbirliklerim:** Görsel + "Marka – Kampanya" + durum rozeti + sağda yeşil/beyaz tutar (+5.000 TL).
- **Duyurular** kartı ve mor gradient **İpucu** kartı (💡 ikon).

### Teknik Tema Notları
- Renkleri ve fontları tek bir yerde tanımla (CSS değişkenleri veya Tailwind `theme.extend`), bileşenlerde sabit renk kodu kullanma.
- Ortak bileşenler oluştur: `Button` (primary/secondary/white), `Card`, `StatCard`, `Badge`, `Sidebar`, `Topbar`, `IconBox`.
- Panellerdeki tüm sayılar ve listeler sahte veri değil, **gerçek veritabanı verisiyle** dolmalı (görsellerdeki değerler sadece örnek).
- Erişilebilirlik: metin/zemin kontrastı yeterli olsun, odak (focus) durumları görünür olsun.

---

## İş Bitiminde Bana Vereceğin Çıktı

1. Yapılanların kısa özeti (A–E bölümleri + Yeni Tema; her madde için ✅ tamamlandı / ⚠️ kısmi).
2. **`.env` listesi:** Eklemem gereken tüm değişkenler, açıklamaları ve nereden alınacakları (PayTR merchant bilgileri, Meta/Instagram, TikTok, Google/YouTube OAuth, dosya depolama, realtime servis, e-posta vb.).
3. Çalıştırmam gereken komutlar (paket kurulumu, migration, seed, cron kurulumu) sırasıyla.
4. Elle yapmam gereken dış ayarlar (ör. PayTR panelinde callback URL tanımlama, OAuth uygulamalarında redirect URL ekleme).
