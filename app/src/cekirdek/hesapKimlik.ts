import {
  aesAnahtar,
  ayristir,
  b64Yaz,
  onaltilikYaz,
  yavasTuret,
  type KilitParam,
} from './gizle.js'
import { ALAN_ADI } from './senkronKimlik.js'

/**
 * HESAP — kullanıcı adı + şifreden türeyen kimlik.
 *
 * ── Ne işe yarıyor ───────────────────────────────────────────
 *
 * Giriş yapan kullanıcı her cihazdan defterine ulaşıyor: senkron açmak,
 * kod taşımak, kurtarma parolası belirlemek gibi ayrı kavramlar yok.
 * Hesap açmak zaten senkron demek (KARARLAR.md · K-039).
 *
 * Defterin şifrelemesi buna DAYANMIYOR. Asıl anahtar hâlâ 128 bit
 * rastgele Defter Kimliği; buradan türeyen `sifre` yalnızca onu
 * sarmalayan kasayı açıyor. Yani defterin gücü insan parolasına inmiyor.
 *
 * ── Kullanıcı adı tuz ────────────────────────────────────────
 *
 * K-038 sabit tuzu mecburen kabul etmişti: kurtarma anında elde paroladan
 * başka hiçbir şey yoktu, tuz okunacak bir yer yoktu. Kullanıcı adı tam
 * olarak o eksik parça. Tuz artık kullanıcıya özel; önceden hesaplanmış
 * tablo saldırısı kapanıyor. Bu değişiklik kriptoyu ZAYIFLATMIYOR.
 *
 *   kok = Argon2id(sifre, TUZ_ONEK + normalizeAd(ad), t=4 m=128MiB)
 *   ├─ kimlik = HKDF(kok, "defter/hesap/kimlik")
 *   ├─ parola = HKDF(kok, "defter/hesap/parola")
 *   └─ sifre  = HKDF(kok, "defter/hesap/sifre")
 *
 * **Kullanıcı adı sunucuya gitmiyor.** Sunucu yalnızca türetilmiş opak
 * kimliği görüyor; ad tuzun içinde kalıyor ve oradan geri çıkarılamıyor.
 *
 * ── Aynı ad + farklı şifre = BAŞKA hesap ─────────────────────
 *
 * Kimlik ikisinden birden türediği için ad benzersizliği diye bir sorun
 * yok; kimse kimsenin adını "kapatmıyor". Bedeli açık: şifreyi yanlış
 * yazmak "yanlış şifre" değil, "böyle bir hesap yok" demek. Arayüz bunu
 * tek cümlede söylüyor ve giriş sırasında hesap YARATMIYOR.
 *
 * Saf: ağ yok, DOM yok, depo yok.
 */

/** Tuzun sabit öneki; sürüm burada, parametreler ileride ağırlaşabilsin. */
const TUZ_ONEK = 'defter/hesap/v1|'

/**
 * Argon2id parametreleri — senkronunkinden ağır.
 *
 * Senkronda girdi 128 bit rastgele; orada `VARSAYILAN_PARAM` yeterli.
 * Burada girdi bir insan şifresi ve sunucuda ondan sarmalanmış bir kasa
 * duruyor: tek engel bu. Yalnızca hesap açarken ve girişte koşuyor.
 */
export const HESAP_PARAM: KilitParam = { t: 4, m: 131072, p: 1 }

/** Şifrenin alt sınırı — sunucudaki kasayı da bu koruyor. */
export const EN_AZ_SIFRE = 12

/** Kullanıcı adının alt sınırı; boş ad hesap değil. */
export const EN_AZ_AD = 2

/**
 * Kullanıcı adını her cihazda AYNI baytlara indirger.
 *
 * Ad anahtar türetmesine girdiği için normalizasyonun cihazdan cihaza
 * değişmemesi ŞART. Bu yüzden `toLocaleLowerCase` KULLANILMIYOR: Türkçe
 * yerelde "ALI" → "alı", İngilizcede "ali" olurdu ve aynı kullanıcı iki
 * cihazda iki ayrı hesaba düşerdi. `toLowerCase` Unicode'un yerelden
 * bağımsız eşlemesini kullanıyor.
 *
 * NFKC de aynı sebeple: görsel olarak aynı ama farklı kodlanmış adlar
 * (birleşik/ayrık aksan) tek biçime iniyor.
 */
export const adiNormalize = (ad: string): string =>
  ad.normalize('NFKC').trim().toLowerCase()

export interface HesapKimlik {
  /** Sunucunun gördüğü opak kimlik (onaltılık). */
  kimlik: string
  /** Better Auth'a verilen sentetik e-posta. */
  eposta: string
  /** Better Auth şifresi — türer, saklanmaz. */
  parola: string
  /** Kasayı açan anahtar. Cihazdan çıkmaz. */
  sifre: CryptoKey
}

/** Ad ve şifre kabul edilebilir mi — türetmeyi boşuna koşturmamak için. */
export const hesapBicimi = (ad: string, sifre: string): boolean =>
  adiNormalize(ad).length >= EN_AZ_AD && sifre.length >= EN_AZ_SIFRE

/**
 * Kullanıcı adı ve şifreden hesap kimliğini türetir.
 *
 * Ad kısa ya da şifre kısaysa `null`. `param` yalnızca test için
 * gevşetiliyor; üretimde `HESAP_PARAM`.
 */
export async function hesapKimligiTuret(
  ad: string,
  sifre: string,
  param: KilitParam = HESAP_PARAM,
): Promise<HesapKimlik | null> {
  if (!hesapBicimi(ad, sifre)) return null

  const tuz = new TextEncoder().encode(TUZ_ONEK + adiNormalize(ad))
  const kok = await yavasTuret(sifre, tuz, param)
  const [kimlikHam, parolaHam, sifreHam] = await Promise.all([
    ayristir(kok, 'defter/hesap/kimlik', 16),
    ayristir(kok, 'defter/hesap/parola', 32),
    ayristir(kok, 'defter/hesap/sifre', 32),
  ])

  const kimlik = onaltilikYaz(kimlikHam!)
  return {
    kimlik,
    eposta: `${kimlik}@${ALAN_ADI}`,
    parola: b64Yaz(parolaHam!),
    sifre: await aesAnahtar(sifreHam!),
  }
}
