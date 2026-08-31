import { S } from './metin.js'
import { acHam, kapatHam, rastgele } from './gizle.js'

/**
 * YEREL MÜHÜR — bir bayt yığınını anahtarla kapatıp geri açar.
 *
 * Tarayıcıda veritabanı diskte düz duramaz (KARARLAR.md · K-037):
 * cihazdaki SQLCipher'ın karşılığı burada, defterin ham baytlarını
 * AES-GCM ile mühürleyip OPFS'e tek dosya olarak yazmak.
 *
 * `veri/yedek.ts`in mühürlü yedeğiyle aynı fikir, iki farkla:
 *
 * 1. **İkili, JSON değil.** Yedek dosyası insanın taşıyacağı bir şey,
 *    base64 olması sorun değil. Bu her yazmada diske giden defterin
 *    tamamı; base64 boyutu üçte bir büyütürdü.
 * 2. **Sıkıştırma bayrağı şifrenin İÇİNDE.** Yedekte biçim alanı açıkta
 *    duruyor. Burada gövdenin ilk baytı olduğu için GCM etiketi onu da
 *    doğruluyor: oynanamıyor.
 *
 * Biçim:
 *
 *     0..7    sihir + sürüm   ("DFTRMHR" + 0x01)
 *     8..19   IV (12 bayt)
 *     20..    AES-GCM( [0] = sıkıştırma, [1..] = gövde )
 *
 * Ö2'nin dersi burada da geçerli ve daha sıkı uygulandı: paketin nasıl
 * paketlendiği biçimde YAZILI, tahmin edilmiyor.
 */

const SIHIR = new Uint8Array([0x44, 0x46, 0x54, 0x52, 0x4d, 0x48, 0x52, 0x01])
const IV_YER = SIHIR.length
const IV_BOY = 12
const GOVDE_YER = IV_YER + IV_BOY

export type Sikistirma = 'gzip' | 'yok'

const GZIP = 1
const DUZ = 0

/**
 * Sıkıştırır ve NE YAPTIĞINI söyler.
 *
 * `CompressionStream` her ortamda yok. Önce sessizce atlanıyordu ve
 * biçimde bunu söyleyen bir alan olmadığı için, sıkıştıran bir ortamda
 * yazılıp sıkıştırmayan bir ortamda açılan dosya çöple patlıyordu (Ö2).
 */
export async function paketle(b: Uint8Array): Promise<{ govde: Uint8Array; nasil: Sikistirma }> {
  if (typeof CompressionStream === 'undefined') return { govde: b, nasil: 'yok' }
  const akis = new Blob([b as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'))
  return { govde: new Uint8Array(await new Response(akis).arrayBuffer()), nasil: 'gzip' }
}

/** Biçimin söylediğine göre açar; tahmin etmez. */
export async function paketiAc(b: Uint8Array, nasil: Sikistirma): Promise<Uint8Array> {
  if (nasil === 'yok') return b
  if (typeof DecompressionStream === 'undefined') throw new Error(S('veri.gzipYok'))
  const akis = new Blob([b as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(akis).arrayBuffer())
}

/**
 * Bu baytlar bizim mührümüz mü.
 *
 * Mühürlemeden ÖNCE yazılmış düz değerleri tanımak için: `anahtarDepo`
 * eskiden localStorage'a düz metin yazıyordu ve o değerler sessizce
 * kaybolmamalı (KARARLAR.md · K-037).
 */
export function muhurMu(bayt: Uint8Array): boolean {
  if (bayt.length <= GOVDE_YER) return false
  for (let i = 0; i < SIHIR.length; i++) if (bayt[i] !== SIHIR[i]) return false
  return true
}

/** Baytları mühürler. */
export async function muhurle(bayt: Uint8Array, anahtar: CryptoKey): Promise<Uint8Array> {
  const { govde, nasil } = await paketle(bayt)
  const ic = new Uint8Array(1 + govde.length)
  ic[0] = nasil === 'gzip' ? GZIP : DUZ
  ic.set(govde, 1)

  const iv = rastgele(IV_BOY)
  const kapali = await kapatHam(ic, anahtar, iv)

  const muhur = new Uint8Array(GOVDE_YER + kapali.govde.length)
  muhur.set(SIHIR, 0)
  muhur.set(iv, IV_YER)
  muhur.set(kapali.govde, GOVDE_YER)
  return muhur
}

/**
 * Mührü açar. Anahtar yanlışsa, dosya bozuksa ya da bizim biçimimiz
 * değilse `null` döner — atmıyor.
 *
 * Çağıran taraf "yanlış parola" ile "bozuk dosya"yı ayırt etmek zorunda
 * değil: ikisinde de defter açılmıyor ve ikisinde de kullanıcıya aynı
 * şey söyleniyor.
 */
export async function muhruAc(muhur: Uint8Array, anahtar: CryptoKey): Promise<Uint8Array | null> {
  if (!muhurMu(muhur)) return null

  const ic = await acHam(
    { iv: muhur.slice(IV_YER, GOVDE_YER), govde: muhur.slice(GOVDE_YER) },
    anahtar,
  ).catch(() => null)
  if (!ic || ic.length < 1) return null

  const nasil: Sikistirma = ic[0] === GZIP ? 'gzip' : 'yok'
  return paketiAc(ic.slice(1), nasil).catch(() => null)
}
