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
 * KASA — Defter Kimliği'nin paroladan açılan kopyası.
 *
 * ── Neden var ────────────────────────────────────────────────
 *
 * Tarayıcı "site verilerini" temizlediğinde defterin kendisi kaybolmuyor:
 * senkron açıksa her satır Neon'da duruyor ve su seviyesi sıfırdan
 * başladığı için kod girilince hepsi geri iniyor. Kaybolan şey **kodun
 * kendisi** — çünkü yalnızca `localStorage`ta duruyordu.
 *
 * Kasa o kodu, kullanıcının parolasıyla şifreleyip sunucuda tutuyor.
 * Kodu kaybetsen parola, parolayı unutsan kod kurtarıyor: ikisini birden
 * kaybetmen gerekiyor (KARARLAR.md · K-038).
 *
 * ── Neden AYRI bir kimlik ────────────────────────────────────
 *
 * `senkronKimlik.ts`te her şey koddan türüyor. Kurtarmada elde kod YOK —
 * onu almaya geldik. Kasaya ulaşmak için koddan bağımsız, yalnızca
 * paroladan türeyen ikinci bir kimlik gerekiyor. Döngüyü kıran şey bu.
 *
 *   kokP = Argon2id(P, SABİT_TUZ, AGIR)
 *   ├─ kimlik = HKDF(kokP, ".../kimlik")   sunucunun gördüğü opak kimlik
 *   ├─ parola = HKDF(kokP, ".../parola")   Better Auth parolası
 *   └─ sifre  = HKDF(kokP, ".../sifre")    kasayı açan AES anahtarı
 *
 * ── Bu bir bedel ve saklanmıyor ──────────────────────────────
 *
 * Senkronda sunucudaki şifreli defteri açmanın tek yolu 128 bit rastgele
 * bir kodu kırmaktı. Kasadan sonra sunucuda ikinci bir hedef var: **insan
 * parolasıyla** şifrelenmiş bir blob ve tek engel Argon2id. Uçtan uca
 * şifreleme bozulmuyor (parola sunucuya hiç gitmiyor, sunucu ne defteri ne
 * anahtarı açabiliyor) ama sistemin en zayıf halkası artık parolanın gücü.
 *
 * Bu yüzden burada parametreler senkronunkinden AĞIR ve arayüz en az
 * `EN_AZ_PAROLA` karakter istiyor.
 *
 * Saf: ağ yok, DOM yok, depo yok. `test/senkronGizlilik.test.ts` bu
 * katmanı tarıyor.
 */

/**
 * Sabit tuz — ve burada gerekçelendirilmek zorunda.
 *
 * `senkronKimlik.ts`te sabit tuz zararsızdı: girdi 128 bit rastgele bir
 * koddu, önceden hesaplanacak bir tablo yoktu. Burada girdi bir insan
 * parolası, yani tablo hesaplanabilir.
 *
 * Yine de tuz kullanıcıya göre değişemez: kurtarma anında elimizde
 * paroladan başka HİÇBİR ŞEY yok — tuzu nereden okuyacağımız sorusunun
 * cevabı yok. Bedeli Argon2id'yi ağırlaştırarak ödeniyor.
 */
const SABIT_TUZ = new TextEncoder().encode('defter/kasa/tuz/v1')

/**
 * Kasanın Argon2id parametreleri — senkronunkinden ağır.
 *
 * Senkron `VARSAYILAN_PARAM` (t=3, m=48 MiB) kullanıyor ve orada girdi
 * rastgele olduğu için o yeterli. Burada girdi parola; tek engel bu.
 *
 * Bir kez koşuyor: kasa açılırken ve kurtarırken. Gündelik kullanımda
 * hiç çalışmıyor.
 */
export const KASA_PARAM: KilitParam = { t: 4, m: 131072, p: 1 }

/**
 * Kasa parolasının alt sınırı.
 *
 * Kilidin eski sınırı 8'di ve yalnızca yerel diski koruyorken yeterliydi:
 * sarmalı ele geçirmek için önce cihaza erişmek gerekiyordu. Kasa sunucuda
 * duruyor, yani blob'a erişmek için kimseye fiziksel erişim gerekmiyor.
 * Sınır bu yüzden yükseldi — gerileme değil, sıkılaştırma.
 */
export const EN_AZ_PAROLA = 12

export interface KasaKimlik {
  /** Sunucunun gördüğü opak kimlik (onaltılık). */
  kimlik: string
  /** Better Auth'a verilen sentetik e-posta. */
  eposta: string
  /** Better Auth parolası — paroladan türer, saklanmaz. */
  parola: string
  /** Kasa gövdesini açan anahtar. Cihazdan çıkmaz. */
  sifre: CryptoKey
}

/**
 * Paroladan kasa kimliğini türetir. Parola kısaysa `null`.
 *
 * `param` yalnızca test için gevşetilebiliyor; üretimde `KASA_PARAM`.
 */
export async function kasaKimligiTuret(
  parola: string,
  param: KilitParam = KASA_PARAM,
): Promise<KasaKimlik | null> {
  if (parola.length < EN_AZ_PAROLA) return null

  const kok = await yavasTuret(parola, SABIT_TUZ, param)
  const [kimlikHam, parolaHam, sifreHam] = await Promise.all([
    ayristir(kok, 'defter/kasa/kimlik', 16),
    ayristir(kok, 'defter/kasa/parola', 32),
    ayristir(kok, 'defter/kasa/sifre', 32),
  ])

  const kimlik = onaltilikYaz(kimlikHam!)
  return {
    kimlik,
    eposta: `${kimlik}@${ALAN_ADI}`,
    parola: b64Yaz(parolaHam!),
    sifre: await aesAnahtar(sifreHam!),
  }
}
