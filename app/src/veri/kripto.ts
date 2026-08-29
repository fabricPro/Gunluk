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
 * PIN + biyometri bu milestone'da yok (Faz 2.7). Anahtar şimdilik cihaza
 * bağlı, kullanıcı doğrulaması istemiyor.
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
export async function veritabaniAnahtari(): Promise<AnahtarSonuc> {
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
