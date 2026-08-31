/**
 * Kriz işareti — ilke 2.1.
 *
 * > Kendine zarar verme veya ağır bunalım işareti içeren bir kayıt
 * > yorumlanmaz, analiz edilmez, örüntüye dahil edilmez, arşiv cevabında
 * > kullanılmaz. Tek yapılan şey sessiz bir kart.
 *
 * **Kural tabanlı, model yok.** İki sebep: güvenlik isteğe bağlı bir
 * 145 MB'lık indirmeye (K-029) bağlanamaz, ve kural tabanlı olmak
 * denetlenebilir olmak demek — neyin neden tetiklediği bu dosyada
 * okunabiliyor (KARARLAR.md · K-030).
 *
 * **Eşik dar.** "Bugün berbatım", "her şey anlamsız" tetiklemez. Sık
 * tetiklenen bir kart önce sinir bozar, sonra görünmez olur — ve
 * kullanıcıya dürüst yazmayı bıraktırır, yani tam tersini yapar.
 *
 * **Hiçbir yere yazılmaz.** Bu modülün çıktısı saklanmıyor: ne sütun, ne
 * ayar, ne sayaç. Saklanan bir bayrak, kullanıcının en kötü anlarının
 * kalıcı kaydı ve "teşhis çağrışımı yasak" kuralının (PROJE.md §5) tam
 * karşılığı olurdu. Her seferinde yeniden hesaplanıyor.
 */

export interface KrizIsaret {
  var: boolean
  /** Hangi örüntünün tetiklediği — yalnızca test ve hata ayıklama için. */
  kalip?: string
}

/**
 * Metni karşılaştırmaya hazırlar: küçük harf, noktalama boşluğa, tek boşluk.
 * Gövdeleme YOK — burada aşırı genelleme yanlış alarm demek (K-027'nin
 * gövdeleyicisi aramada doğru, burada tehlikeli).
 */
const duzle = (metin: string): string =>
  ' ' +
  metin
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim() +
  ' '

/**
 * DEYİMLER — bunlar kriz değil ve Türkçede son derece yaygın.
 *
 * Bu liste özelliğin en önemli parçası. "Öl-" kökü Türkçede abartma
 * kalıbının merkezinde: "bu iş beni öldürüyor", "açlıktan ölüyorum",
 * "gülmekten öldüm". Deyim listesi olmadan sınıflandırıcı her gün
 * tetiklenir ve kart anlamını yitirir.
 *
 * Deyim eşleşen BÖLGEYİ nötrler, kaydın tamamını değil. Başta tamamını
 * veto ediyordu ve bu bir kaçış kapısıydı: uzun bir kaydın başındaki
 * "bu iş beni öldürüyor", sonundaki gerçek işareti susturuyordu.
 */
const DEYIMLER: RegExp[] = [
  /\b(beni|bizi|insani|adami|onu) (bitiriyor|bitirdi|olduruyor|oldurdu|olduruyordu)\b/,
  /\b(aclik|susuzluk|yorgunluk|sicak|soguk|uyku|merak|sikinti|utanc)tan ol/,
  /\b(gulmekten|yorgunluktan|utanctan|korkudan|heyecandan|sevincten) (ol|oldum|oluyorum)/,
  /\bolesiye\b/,
  /\bol(um|umune) (yorgun|susamis|aciktim)/,
  /\bcanima tak etti\b/,
  /\bic(imi|ime) sikildi\b/,
  /\bkeske gelmeseydim\b/,
  /\bolur mu olur\b/,
]

/**
 * KRİZ ÖRÜNTÜLERİ — niyet + birinci şahıs.
 *
 * Hepsi açık ifade; ima, üzüntü, umutsuzluk kapsam dışı. Çekim ekleri
 * serbest bırakıldı ("öldürmek istiyorum", "öldüreceğim", "öldürsem").
 */
const KALIPLAR: { ad: string; re: RegExp }[] = [
  { ad: 'kendine zarar', re: /\bkendi(m|mi|me|min)? ?(canima)? ?(zarar ver|kiy)/ },
  { ad: 'kendini öldürme', re: /\bkendimi (oldur|asa|as[iı]p|vur)/ },
  { ad: 'ölmek isteği', re: /\bolmek ist(iyorum|erdim|edigim)\b/ },
  { ad: 'yaşamak istememe', re: /\byasamak istem(iyorum|edigim)\b/ },
  { ad: 'hayatına son verme', re: /\bhayat(ima|imi) son ver/ },
  { ad: 'intihar', re: /\bintihar\b/ },
  { ad: 'yok olma isteği', re: /\b(olmasam|olmesem|gitsem|yok olsam) daha iyi\b/ },
  { ad: 'bilek kesme', re: /\bbilek(lerimi|imi) kes/ },
  { ad: 'uyanmama isteği', re: /\b(uyanmasam|uyanmak istemiyorum)\b/ },
  { ad: 'veda', re: /\bherkese veda\b/ },
]

/** Türkçe harfleri karşılaştırma için sadeleştirir: ölüyorum -> oluyorum. */
const sade = (s: string): string =>
  s
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')

/**
 * Metinde açık bir kriz işareti var mı.
 *
 * Bu bir teşhis değil, risk puanı değil, tıbbi bir değerlendirme değil.
 * Tek işi uygulamanın susmasını ve gerçek desteğin numarasının
 * gösterilmesini tetiklemek.
 */
export function krizIsareti(metin: string): KrizIsaret {
  if (!metin.trim()) return { var: false }
  const d = sade(duzle(metin))

  /* Deyimleri metinden düş; geriye kalanda kriz örüntüsü ara. */
  let kalan = d
  for (const deyim of DEYIMLER) kalan = kalan.replace(new RegExp(deyim, 'g'), ' ')

  for (const k of KALIPLAR) if (k.re.test(kalan)) return { var: true, kalip: k.ad }
  return { var: false }
}
