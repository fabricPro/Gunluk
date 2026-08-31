import { kurtarmaCoz } from './kurtarma.js'
import {
  VARSAYILAN_PARAM,
  aesAnahtar,
  ayristir,
  b64Yaz,
  onaltilikYaz,
  yavasTuret,
  type KilitParam,
} from './gizle.js'

/**
 * DEFTER KİMLİĞİ — senkronun kimlik ve anahtar türetmesi.
 *
 * "Sunucu ne görüyor" sorusunun tek cevabı bu dosya. Saf: ağ yok, DOM
 * yok, depo yok. Buraya bir `fetch` eklenemez — `test/senkronGizlilik.test.ts`
 * uygulamada ağa çıkabilen dosyaların listesini sabitliyor.
 *
 * Kullanıcı e-posta girmiyor, parola girmiyor, hesap açmıyor. Tek bir
 * kod var: ikinci cihazda onu yazıyor. Her şey ondan türüyor
 * (KARARLAR.md · K-036).
 *
 *   gizli  = kurtarmaCoz(kod)                  128 bit, kullanıcının
 *   kok    = Argon2id(gizli, SABİT_TUZ)        pahalı, oturumda bir kez
 *   ├─ kimlik  = HKDF(kok, ".../kimlik")       sunucunun gördüğü tek şey
 *   ├─ parola  = HKDF(kok, ".../parola")       Better Auth parolası
 *   ├─ sifre   = HKDF(kok, ".../sifre")        AES-GCM — CİHAZDAN ÇIKMAZ
 *   └─ satir   = HKDF(kok, ".../satir")        satır kimliği HMAC'i
 *
 * Üç çıktı HKDF ile ayrıldığı için biri sızsa diğerleri hakkında bilgi
 * vermiyor: sunucu `kimlik`i biliyor ama ondan `sifre`ye gidemiyor.
 */

/**
 * Sabit tuz. Argon2 tuz istiyor ve tuz kullanıcıya göre değişemez:
 * ikinci cihaz aynı koddan aynı kimliği üretmek zorunda.
 *
 * Normalde sabit tuz gökkuşağı tablolarına açık kapı bırakır. Burada
 * bırakmıyor, çünkü girdi kullanıcının seçtiği bir parola değil,
 * **128 bit rastgele** bir kod. Önceden hesaplanacak bir tablo yok.
 */
const SABIT_TUZ = new TextEncoder().encode('defter/senkron/tuz/v1')

/**
 * Sentetik e-postanın alan adı. `.invalid` RFC 2606'da tam bu iş için
 * ayrılmış: hiçbir zaman çözülmeyecek, hiçbir yere posta gitmeyecek.
 *
 * Kullanıcı bunu ne görüyor ne giriyor. Gerçek bir e-posta toplanmıyor;
 * bu yalnızca Better Auth'un kimlik alanına konan opak bir dize.
 */
export const ALAN_ADI = 'defter.invalid'

export interface SenkronKimlik {
  /** Sunucunun gördüğü opak kimlik (onaltılık). */
  kimlik: string
  /** Better Auth'a verilen sentetik e-posta. */
  eposta: string
  /** Better Auth parolası — koddan türer, saklanmaz. */
  parola: string
  /** Gövdeleri şifreleyen anahtar. Cihazdan çıkmaz. */
  sifre: CryptoKey
  /** Satır kimliklerini opaklaştıran HMAC anahtarı. */
  satir: CryptoKey
}

/**
 * Koddan kimliği türetir. Kod geçersizse null.
 *
 * Argon2id burada bir kez koşuyor (48 MiB, ~yarım saniye). Sonuç oturum
 * boyunca tutuluyor — her senkron turunda yeniden türetilmiyor.
 */
export async function kimlikTuret(
  kod: string,
  param: KilitParam = VARSAYILAN_PARAM,
): Promise<SenkronKimlik | null> {
  const gizli = kurtarmaCoz(kod)
  if (!gizli) return null

  const kok = await yavasTuret(gizli, SABIT_TUZ, param)
  const [kimlikHam, parolaHam, sifreHam, satirHam] = await Promise.all([
    ayristir(kok, 'defter/senkron/kimlik', 16),
    ayristir(kok, 'defter/senkron/parola', 32),
    ayristir(kok, 'defter/senkron/sifre', 32),
    ayristir(kok, 'defter/senkron/satir', 32),
  ])

  const kimlik = onaltilikYaz(kimlikHam!)
  return {
    kimlik,
    eposta: `${kimlik}@${ALAN_ADI}`,
    parola: b64Yaz(parolaHam!),
    sifre: await aesAnahtar(sifreHam!),
    satir: await crypto.subtle.importKey(
      'raw',
      satirHam! as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    ),
  }
}

/**
 * Bir varlığın sunucudaki opak satır kimliği.
 *
 * Ham kimlik (`kayit`ın UUID'si) doğrudan yazılsaydı sunucu varlık
 * tipini ve kimliklerin yedekle/dışa aktarmayla ilişkisini görebilirdi.
 * HMAC'ten sonra sunucunun elinde anlamsız bir dize kalıyor — tip bile
 * görünmüyor, o da şifreli gövdenin içinde.
 */
export async function satirKimligi(
  k: SenkronKimlik,
  varlik: string,
  id: string,
): Promise<string> {
  const imza = await crypto.subtle.sign(
    'HMAC',
    k.satir,
    new TextEncoder().encode(`${varlik}|${id}`) as BufferSource,
  )
  return onaltilikYaz(new Uint8Array(imza))
}
