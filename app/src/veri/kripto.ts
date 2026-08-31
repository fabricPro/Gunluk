/**
 * Veritabanı anahtarının üretimi ve saklanması.
 *
 * Cihazda: 32 baytlık rastgele anahtar üretilir ve Keychain
 * (kSecAttrAccessibleWhenUnlockedThisDeviceOnly) veya Android Keystore'a
 * yazılır. Anahtar hiçbir zaman cihazdan çıkmaz (ilke 2.3).
 *
 * Tarayıcıda (geliştirme): güvenli depo yok, veritabanı şifresiz açılır.
 * Bu durum sessiz geçilmez — konsola yazılır ve `sifreli` alanı false döner.
 *
 * Kilit kurulduğunda (Faz 2.7 / K-021) anahtar buradan gelmez: kullanıcının
 * PIN'i ya da biyometrisi çözer ve `anahtariDayat` ile geçilir. Bu modül o
 * zaman devreden çıkar — kilitli defterin anahtarı hiçbir yerde
 * doğrulamasız durmaz.
 */

const ANAHTAR_ADI = 'defter.db.anahtar'

export interface AnahtarSonuc {
  anahtar: string | null
  sifreli: boolean
}

/** Capacitor eklentisinin çalışma anında sağladığı güvenli depo arayüzü. */
export interface GuvenliDepo {
  oku(ad: string): Promise<string | null>
  yaz(ad: string, deger: string): Promise<void>
}

let depo: GuvenliDepo | null = null

/** Native kabuk açılırken güvenli depoyu bağlar. */
export function guvenliDepoyuBagla(d: GuvenliDepo): void {
  depo = d
}

const onaltilik = (b: Uint8Array): string =>
  [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

function yeniAnahtar(): string {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return onaltilik(b)
}

/**
 * Veritabanı anahtarını getirir; ilk açılışta üretip güvenli depoya yazar.
 * Güvenli depo yoksa şifresiz çalışılır ve bu açıkça bildirilir.
 */
let dayatilan: string | null = null

/**
 * Kilit çözüldüğünde ana anahtarı doğrudan geçer.
 * Bundan sonraki açılışlar cihaz anahtarını değil bunu kullanır.
 */
export function anahtariDayat(anahtar: string | null): void {
  dayatilan = anahtar
}

/**
 * Bellekteki ana anahtar — kilit açıkken var, kilitliyken `null`.
 *
 * `anahtarDepo.ts` tarayıcıda saklanan sırları bununla sarmalıyor:
 * kilitliyken okunamamaları gerekiyor (KARARLAR.md · K-037).
 */
export const dayatilanAnahtar = (): string | null => dayatilan

export async function veritabaniAnahtari(): Promise<AnahtarSonuc> {
  if (dayatilan) return { anahtar: dayatilan, sifreli: true }
  if (!depo) {
    console.warn(
      '[defter] Güvenli depo bağlı değil — veritabanı ŞİFRESİZ açılıyor. ' +
        'Bu yalnızca tarayıcıdaki geliştirme derlemesi için geçerlidir.',
    )
    return { anahtar: null, sifreli: false }
  }
  const mevcut = await depo.oku(ANAHTAR_ADI)
  if (mevcut) return { anahtar: mevcut, sifreli: true }
  const yeni = yeniAnahtar()
  await depo.yaz(ANAHTAR_ADI, yeni)
  return { anahtar: yeni, sifreli: true }
}
