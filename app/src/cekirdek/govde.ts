import { SESLI, SERT, sonSesli } from './tr.js'

/**
 * Türkçe gövdeleme — sözlüksüz, aday kümeli.
 *
 * Arama bugüne kadar düz alt-dize eşleşmesiyle çalışıyordu ve Türkçede
 * asimetrik kırılıyordu: "kötü" arayan "kötüydüm"ü buluyor ama "kötüydüm"
 * arayan "kötü"yü bulamıyordu. "hissettiğim" ile "hissetmedim" hiç
 * buluşmuyordu.
 *
 * Burada tam morfolojik çözümleme yok — sözlük yok, kural tabanı yok.
 * Her sözcük bir ADAY GÖVDE KÜMESİNE iniyor, iki sözcük kümeleri
 * kesişiyorsa eşleşiyor (KARARLAR.md · K-027).
 *
 * Küme olması kritik. Ünsüz yumuşamasını geri almak tahmin gerektirir ve
 * yanlış tahmin kayıt kaybettirir: `kitabı` → `kitab` mı `kitap` mı?
 * İkisini de tutunca tahmin etmek gerekmiyor:
 *
 *   kitabı → {kitab, kitap}   kitap → {kitap}   → kesişir
 *   adı    → {ad, at}         ad    → {ad}      → kesişir
 *
 * Simetrik aşırı gövdeleme zararsız: `teslim` dilbilgisel olarak
 * `teslim`dir ama gövdeleyici `tesl`e indirebilir. İki taraf da aynı
 * indirgemeyi yaşadığı için eşleşme bozulmaz; yalnızca aynı gövdeye inen
 * başka bir sözcükle karışma riski kalır, o da seyrektir.
 */

/** Gövde bunun altına inmez — aşırı soyup her şeyi birbirine bağlamasın. */
export const MIN_UZUNLUK = 3

/** Bir turda tutulan en fazla aday — dallanma patlamasın. */
const ADAY_TAVAN = 12

/** Yumuşayan ünsüzün sert karşılığı: kitabı → kitap, ağacın → ağaç. */
const SERTLESME: Record<string, string> = { b: 'p', c: 'ç', d: 't', ğ: 'k', g: 'k' }

/**
 * Ünlü düşmesi kural değil, istisna: burun/burnu, akıl/aklı.
 * Kapsamlı olduğu iddia edilmiyor — en sık geçenler.
 */
const UNLU_DUSMESI: Record<string, string> = {
  ağz: 'ağız', akl: 'akıl', aln: 'alın', beyn: 'beyin', boyn: 'boyun',
  burn: 'burun', fikr: 'fikir', göğs: 'göğüs', gönl: 'gönül', hükm: 'hüküm',
  isml: 'isim', ism: 'isim', karn: 'karın', koyn: 'koyun', nesl: 'nesil',
  oğl: 'oğul', omz: 'omuz', resm: 'resim', sabr: 'sabır', şehr: 'şehir',
  vakt: 'vakit', zihn: 'zihin',
}

/*
 * Ekler dıştan içe sıralı. Her tur en uzun eşleşen ek düşürülüyor ve
 * sözcük yeniden deneniyor; böylece "ev-im-de-ki" gibi zincirler
 * çözülüyor. Sıra önemli: uzun ekler kısa olanlardan önce denenmeli,
 * yoksa "-diğim" hiç yakalanmaz, "-im" onu yer.
 */
const EKLER: string[] = [
  /* fiilimsi / ortaç — "hissettiğim" buradan iniyor */
  'diğim', 'dığım', 'duğum', 'düğüm', 'tiğim', 'tığım', 'tuğum', 'tüğüm',
  'diğin', 'dığın', 'duğun', 'düğün', 'tiğin', 'tığın', 'tuğun', 'tüğün',
  'diği', 'dığı', 'duğu', 'düğü', 'tiği', 'tığı', 'tuğu', 'tüğü',
  'dikçe', 'dıkça', 'dukça', 'dükçe', 'tikçe', 'tıkça', 'tukça', 'tükçe',
  /* zaman + kişi */
  'iyorum', 'ıyorum', 'uyorum', 'üyorum',
  'iyorsun', 'ıyorsun', 'uyorsun', 'üyorsun',
  'ecektim', 'acaktım', 'ecektir', 'acaktır',
  'mişim', 'mışım', 'muşum', 'müşüm',
  'miştim', 'mıştım', 'muştum', 'müştüm',
  'meliyim', 'malıyım', 'meli', 'malı',
  'ecek', 'acak', 'iyor', 'ıyor', 'uyor', 'üyor',
  'miş', 'mış', 'muş', 'müş',
  'dim', 'dım', 'dum', 'düm', 'tim', 'tım', 'tum', 'tüm',
  'din', 'dın', 'dun', 'dün', 'tin', 'tın', 'tun', 'tün',
  'dik', 'dık', 'duk', 'dük', 'tik', 'tık', 'tuk', 'tük',
  'di', 'dı', 'du', 'dü', 'ti', 'tı', 'tu', 'tü',
  'mek', 'mak',
  /* olumsuzluk — "hissetmedim" buradan iniyor */
  'me', 'ma',
  /* iyelik + çoğul + hâl */
  'lerimiz', 'larımız', 'leriniz', 'larınız', 'lerim', 'larım',
  'lerin', 'ların', 'leri', 'ları', 'ler', 'lar',
  'imiz', 'ımız', 'umuz', 'ümüz', 'iniz', 'ınız', 'unuz', 'ünüz',
  'nin', 'nın', 'nun', 'nün', 'in', 'ın', 'un', 'ün',
  'den', 'dan', 'ten', 'tan', 'de', 'da', 'te', 'ta',
  'yle', 'yla', 'le', 'la',
  'ki', 'ce', 'ca', 'çe', 'ça',
  'im', 'ım', 'um', 'üm',
  'ye', 'ya', 'yi', 'yı', 'yu', 'yü',
  'e', 'a', 'i', 'ı', 'u', 'ü',
]

const INCE_MI = (h: string): boolean => h === 'e' || h === 'i' || h === 'ö' || h === 'ü'

/** Ekin İLK ünlüsü — uyum buna bakar. */
function ilkSesli(s: string): string | null {
  for (const h of s) if (SESLI.has(h)) return h
  return null
}

/**
 * Ek gövdeye uyuyor mu.
 *
 * Uyum ekin SON ünlüsüne değil İLK ünlüsüne bakar. "-iyorum" ekinin
 * içindeki `o` değişmez; sona bakan bir kontrol "bekliyorum"u kalın sayıp
 * eki hiç düşürmüyordu.
 */
function uyuyorMu(govde: string, ek: string): boolean {
  const g = sonSesli(govde)
  const e = ilkSesli(ek)
  if (!g || !e) return true
  return INCE_MI(g) === INCE_MI(e)
}

/**
 * Düşürülebilecek BÜTÜN ekleri dener, yalnızca en uzununu değil.
 *
 * Sözlük olmadan hangi ayrıştırmanın doğru olduğu bilinemiyor: "kereme"
 * hem `kere+me` (olumsuz fiil) hem `kerem+e` (yönelme) okunabilir. En
 * uzun eki seçmek `kere`yi verip `kerem`i kaçırıyordu. Hepsini aday
 * saymak bu seçimi ortadan kaldırıyor — eşleşme küme kesişmesi olduğu
 * için fazladan aday yalnızca erişimi artırır.
 */
function ekleriDusur(s: string): string[] {
  const cikti: string[] = []
  for (const ek of EKLER) {
    if (!s.endsWith(ek)) continue
    const kalan = s.slice(0, -ek.length)
    if (kalan.length < MIN_UZUNLUK) continue
    if (!uyuyorMu(kalan, ek)) continue
    cikti.push(kalan)
  }
  return cikti
}

/** Kaynaştırma ünsüzü: iki ünlü arasına giren y/n/s. "kötü-y-düm" */
function kaynastirmasiz(s: string): string | null {
  if (s.length <= MIN_UZUNLUK) return null
  const son = s.slice(-1)
  if (!'yns'.includes(son)) return null
  return SESLI.has(s.slice(-2, -1)) ? s.slice(0, -1) : null
}

/**
 * Sözcüğün aday gövdeleri. Sözcüğün kendisi her zaman kümede —
 * hiç ek almamış bir sözcük de kendisiyle eşleşebilmeli.
 */
/*
 * Sözcük gövdeleri önbellekte. Bir günlükte sözcükler ağır tekrar ediyor;
 * önbelleksiz her sorgu bütün defteri baştan gövdeliyor. Sınırlı boyut:
 * on yıllık bir defterin sözcük dağarcığı buraya sığar, taşarsa sıfırlanır.
 */
const ONBELLEK = new Map<string, Set<string>>()
const ONBELLEK_TAVAN = 20000

export function govdeler(sozcuk: string): Set<string> {
  const hazir = ONBELLEK.get(sozcuk)
  if (hazir) return hazir
  const uretilen = govdeleriUret(sozcuk)
  if (ONBELLEK.size >= ONBELLEK_TAVAN) ONBELLEK.clear()
  ONBELLEK.set(sozcuk, uretilen)
  return uretilen
}

function govdeleriUret(sozcuk: string): Set<string> {
  const temiz = sozcuk.toLocaleLowerCase('tr').replace(/[^a-zçğıiöşü0-9]/g, '')
  const kume = new Set<string>()
  if (!temiz) return kume
  kume.add(temiz)

  /*
   * Zincirli ekleri çöz ("ev-im-de-ki"). Genişlik sınırlı: aday sayısı
   * patlamasın diye her turda en fazla ADAY_TAVAN yeni gövde tutuluyor.
   */
  let sira = [temiz]
  for (let tur = 0; tur < 5 && sira.length; tur++) {
    const sonraki: string[] = []
    for (const s of sira)
      for (const kalan of ekleriDusur(s))
        if (!kume.has(kalan)) {
          kume.add(kalan)
          sonraki.push(kalan)
        }
    sira = sonraki.slice(0, ADAY_TAVAN)
  }

  /*
   * Son geçiş: kaynaştırma ünsüzünü at, yumuşamış ünsüzü sertleştir,
   * ünlü düşmesini geri al. Üçü de tahmin değil, kümeye eklenen ADAY —
   * yanlış tahmin diye bir şey kalmıyor.
   */
  for (const aday of [...kume]) {
    const k = kaynastirmasiz(aday)
    if (k) kume.add(k)
  }
  for (const aday of [...kume]) {
    const son = aday.slice(-1)
    const sert = SERTLESME[son]
    if (sert && !SERT.has(son) && aday.length > MIN_UZUNLUK)
      kume.add(aday.slice(0, -1) + sert)
    const acilim = UNLU_DUSMESI[aday]
    if (acilim) kume.add(acilim)
  }
  return kume
}

/** Metni sözcüklere ayırır; noktalama ve boşluk düşer. */
export const sozcukler = (metin: string): string[] =>
  metin
    .toLocaleLowerCase('tr')
    .split(/[^a-zçğıiöşü0-9]+/)
    .filter(Boolean)

/** İki aday kümesi kesişiyor mu. */
export function ortakGovde(a: Set<string>, b: Set<string>): boolean {
  const [kucuk, buyuk] = a.size <= b.size ? [a, b] : [b, a]
  for (const g of kucuk) if (buyuk.has(g)) return true
  return false
}

/**
 * Metnin bütün sözcüklerinin aday gövdeleri, tek kümede.
 *
 * Eşleşme "metinde bu gövdeyi taşıyan bir sözcük var mı" sorusu olduğu
 * için sözcük kimliğini korumaya gerek yok; birleşik küme hem daha küçük
 * hem tek karşılaştırmada cevap veriyor.
 */
export function metinGovdeleri(metin: string): Set<string> {
  const kume = new Set<string>()
  for (const s of sozcukler(metin)) for (const g of govdeler(s)) kume.add(g)
  return kume
}
