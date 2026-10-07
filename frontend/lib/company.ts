/**
 * Şirketin yasal künye bilgileri.
 *
 * iyzico üye iş yeri başvurusunda, **vergi levhası üzerinde yer alan tüm
 * bilgilerin** (ticaret unvanı, vergi dairesi, vergi kimlik numarası, açık
 * adres) web sitesinde yayınlanması zorunludur. Bilgiler burada tek yerde
 * tutulur; künye, iletişim sayfası, Teslimat/İade ve Mesafeli Satış metinleri
 * hepsi bunu okur.
 *
 * Kaynak: GİB İşe Başlama Bildirimi, Kayıt No 1396723, 29.09.2026
 * (Karşıyaka Vergi Dairesi Müdürlüğü).
 *
 * İki uyarı, bilerek böyle:
 *
 * 1. **T.C. kimlik numarası yayınlanmaz.** Belgede TCKN ile VKN birlikte yer
 *    alır; künyede yalnızca vergi kimlik numarası kullanılır. iyzico TCKN'yi
 *    sitede aramaz ve yayınlamak gereksiz bir KVKK riskidir.
 * 2. **Faaliyet kodları künyeye konmaz.** Bildirimdeki kodlar (522104 çekme ve
 *    yol yardımı vb.) bu platformun işiyle örtüşmez; künyede yalnızca kimlik ve
 *    iletişim alanları gösterilir.
 */
interface CompanyInfo {
  legalName: string;
  tradeName: string;
  taxOffice: string;
  taxNumber: string;
  mersisNumber: string;
  address: string;
  phone: string;
  /** `tel:` bağlantısı için boşluksuz biçim. */
  phoneHref: string;
  email: string;
  supportHours: string;
}

export const COMPANY: CompanyInfo = {
  /** Bildirimdeki "Adı Soyadı/Ünvanı" — şahıs işletmesi, gerçek usul. */
  legalName: "Gökhan Akça",
  /** Markanın ticari adı — levhadaki unvandan farklıdır. */
  tradeName: "TRUGC",
  /** Bağlı olunan vergi dairesi. */
  taxOffice: "Karşıyaka Vergi Dairesi Müdürlüğü",
  /** Vergi kimlik numarası (TCKN değil — bkz. dosya başındaki not). */
  taxNumber: "0180599298",
  /** MERSİS numarası — şahıs işletmesinde yoktur. */
  mersisNumber: "",
  /** Bildirimdeki faaliyet adresi. */
  address: "Cengizhan Mahallesi, 1620/25 Sokak No: 67/1 İç Kapı No: 3, Bayraklı / İzmir",
  /** Bildirimdeki cep telefonu. */
  phone: "+90 538 779 02 35",
  /** Telefon bağlantıları (tel:) için sade biçim. */
  phoneHref: "+905387790235",
  email: "akcagokhan3525@gmail.com",
  supportHours: "Hafta içi 09:00 - 19:00",
};

/**
 * Künyede gösterilecek satırlar — yalnızca doldurulmuş alanlar döner.
 *
 * Ticaret unvanı girilmemişse hiç satır dönmez: yalnızca e-postadan oluşan
 * bir "Satıcı Bilgileri" bloğu iyzico için geçerli bir künye değildir ve
 * kullanıcıyı yanıltır. Çağrı noktaları boş listede bloğu hiç basmaz.
 */
export function companyLegalRows(): { label: string; value: string }[] {
  if (!COMPANY.legalName) return [];
  return [
    { label: "Ticaret unvanı", value: COMPANY.legalName },
    { label: "Adres", value: COMPANY.address },
    { label: "Vergi dairesi", value: COMPANY.taxOffice },
    { label: "Vergi kimlik no", value: COMPANY.taxNumber },
    { label: "MERSİS no", value: COMPANY.mersisNumber },
    { label: "Telefon", value: COMPANY.phone },
    { label: "E-posta", value: COMPANY.email },
  ].filter((row) => row.value.length > 0);
}

/** Künye tek satırda gösterilecekse (footer) kullanılan kısa biçim. */
export function companyLegalLine(): string {
  if (!COMPANY.legalName) return "";
  // taxOffice zaten "… Vergi Dairesi Müdürlüğü" biçiminde; sonuna ayrıca
  // "V.D." eklenmez.
  return [COMPANY.legalName, COMPANY.address, COMPANY.taxOffice, COMPANY.taxNumber && `VKN ${COMPANY.taxNumber}`]
    .filter(Boolean)
    .join(" · ");
}
