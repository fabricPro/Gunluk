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
 *
 * **İki dil, tek dosya.** İngilizce tabloları ayrı bir dosyaya taşımak
 * cazipti; taşınmadı. Bu dosyanın değeri "neyin neden tetiklediği tek
 * yerde okunabiliyor" olması ve iki dil için de aynı gözün geçmesi
 * (KARARLAR.md · K-030, K-035).
 */
import type { Dil } from './dil.js'

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
const duzle = (metin: string, dil: Dil): string =>
  ' ' +
  metin
    .toLocaleLowerCase(dil)
    /* Kesme işareti ÖNCE düşüyor, boşluğa dönmüyor: "don't" -> "dont".
       Genel kurala bırakılsaydı "don t" olur ve kalıp tutmazdı. Türkçede
       de doğru olan bu: "Kerem'in" -> "keremin". */
    .replace(/['’`´]/g, '')
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

/* ── İNGİLİZCE ─────────────────────────────────────────────
   Aynı iki tablo, aynı dar eşik. Türkçede "öl-" abartmanın merkeziyse,
   İngilizcede "kill / die / dead" tam olarak aynı işi görüyor: *this job
   is killing me*, *dying to see you*, *dead tired*, *cut myself
   shaving*. Deyim listesi burada da özelliğin yarısı.

   Noktalama düşürüldüğü için kalıplar kesme işaretsiz yazılı:
   "don't" -> "dont". */

const DEYIMLER_EN: RegExp[] = [
  /\b(is|are|was|were|s|re) killing me\b/,
  /\bkill(ing)? me (now|already)\b/,
  /\b(could|would|d) kill for\b/,
  /\bkilled it\b/,
  /\bdying (to|for) \b/,
  /\bdying of (hunger|thirst|boredom|laughter|embarrassment|shame|curiosity|cold|heat)\b/,
  /\b(bored|starving|hungry|tired|scared|worried) to death\b/,
  /\bdead (tired|serious|set|weight|end|line|silent|quiet)\b/,
  /\bdrop dead\b/,
  /\b(to|would|d) die for\b/,
  /\bdie of (embarrassment|shame|boredom|laughter)\b/,
  /\b(career|political|social|electoral|commercial) suicide\b/,
  /\bsuicide (mission|squad|watch|prevention|hotline|note in the (book|film|movie))\b/,
  /\bcut myself (shaving|on|with|while)\b/,
  /\bhurt myself (playing|running|lifting|at the gym|on|while)\b/,
  /\bhalf to death\b/,
]

const KALIPLAR_EN: { ad: string; re: RegExp }[] = [
  { ad: 'kendini öldürme', re: /\b(kill|killing) myself\b/ },
  { ad: 'hayatına son verme', re: /\b(end|ending|take|taking) my (own )?life\b/ },
  { ad: 'ölmek isteği', re: /\b(want to|wanna|wanted to|wish i could) die\b/ },
  { ad: 'ölü olma isteği', re: /\bwish i (was|were|wasnt|am not) (dead|alive|here)\b/ },
  { ad: 'yaşamak istememe', re: /\bdont want to (live|be alive|be here anymore|exist)\b/ },
  { ad: 'kendine zarar', re: /\b(hurt|harm|cut|cutting|hurting|harming) myself\b/ },
  { ad: 'intihar', re: /\bsuicid(e|al)\b/ },
  { ad: 'yok olma isteği', re: /\b(better off|be better off) (dead|without me)\b/ },
  { ad: 'yok olma isteği', re: /\beveryone would be better off\b/ },
  { ad: 'uyanmama isteği', re: /\b(not|never|dont) wak(e|ing) up\b/ },
  { ad: 'veda', re: /\b(goodbye|good bye) (everyone|everybody|all)\b/ },
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
 *
 * `dil` ZORUNLU ve varsayılanı YOK — bilerek. Varsayılan 'tr' iken iki
 * çağrı yeri dili geçirmeyi atlamıştı ve derleyici susmuştu: İngilizce
 * yazan bir kullanıcının açık kriz cümlesi Türkçe kalıplarla taranıyor,
 * hiç tetiklenmiyordu. Biri kartı susturuyordu, diğeri o metni modele
 * göndermeye izin veriyordu. Güvenliğe bakan bir işlevde sessiz
 * varsayılan, hatanın kendisidir (KARARLAR.md · K-030, K-035).
 */
export function krizIsareti(metin: string, dil: Dil): KrizIsaret {
  if (!metin.trim()) return { var: false }
  const ingilizce = dil === 'en'
  const d = duzle(metin, dil)
  /* Türkçe sadeleştirmesi İngilizceye zarar vermez ama gereksiz. */
  const hazir = ingilizce ? d : sade(d)

  /* Deyimleri metinden düş; geriye kalanda kriz örüntüsü ara. */
  let kalan = hazir
  for (const deyim of ingilizce ? DEYIMLER_EN : DEYIMLER)
    kalan = kalan.replace(new RegExp(deyim, 'g'), ' ')

  for (const k of ingilizce ? KALIPLAR_EN : KALIPLAR)
    if (k.re.test(kalan)) return { var: true, kalip: k.ad }
  return { var: false }
}
