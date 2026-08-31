import { argon2id } from 'hash-wasm'
import { kurtarmaCoz } from '../cekirdek/kurtarma.js'
import { VARSAYILAN_PARAM, onaltilikOku, onaltilikYaz, type KilitParam } from './kilit.js'
import type { Dokum } from './dokum.js'

/**
 * Mühürlü yedek (KARARLAR.md · K-003, K-022).
 *
 * Anahtar cihazdan değil **kurtarma kodundan** türüyor: telefon kaybolduğunda
 * yedek de ölmesin. Sunucu yok — dosya kullanıcının kendi bulutuna, kendi
 * açık eylemiyle gidiyor (ilke 2.3).
 */

export const YEDEK_BICIM = 'defter-muhurlu-yedek'

/**
 * Gövdenin nasıl paketlendiği. Biçimde AÇIKÇA yazılı olmak zorunda.
 *
 * Önce yazılmıyordu ve `CompressionStream` yoksa sıkıştırma sessizce
 * atlanıyordu. Sıkıştırma destekleyen bir ortamda mühürlenip
 * desteklemeyen bir ortamda açılan dosya, GCM etiketini geçip
 * `JSON.parse`ta çöple patlıyordu — kullanıcıya "kurtarma kodu yanlış"
 * bile demeden. Yedek biçimi on yıl sonra okunacak diye tasarlandı
 * (K-003); içinde tahmin edilecek hiçbir şey kalmamalı.
 */
export type Sikistirma = 'gzip' | 'yok'

export interface MuhurluYedek {
  bicim: typeof YEDEK_BICIM
  surum: 1
  tuz: string
  param: KilitParam
  iv: string
  /**
   * Gövde nasıl paketlendi. Alan yoksa dosya bu düzeltmeden önce
   * yazılmış demektir; o dosyalar sıkıştırma destekleyen ortamlarda
   * üretildiği için varsayılan 'gzip'.
   */
  sikistirma?: Sikistirma
  /** base64 — paketlenmiş dökümün AES-GCM şifrelisi. */
  veri: string
}

export class YedekHatasi extends Error {}

const b64Yaz = (b: Uint8Array): string => {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s)
}
const b64Oku = (s: string): Uint8Array =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

/** Sıkıştırır ve NE YAPTIĞINI söyler. */
async function sikistir(b: Uint8Array): Promise<{ govde: Uint8Array; nasil: Sikistirma }> {
  if (typeof CompressionStream === 'undefined') return { govde: b, nasil: 'yok' }
  const akis = new Blob([b as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'))
  return { govde: new Uint8Array(await new Response(akis).arrayBuffer()), nasil: 'gzip' }
}

/** Biçimin söylediğine göre açar; tahmin etmez. */
async function ac(b: Uint8Array, nasil: Sikistirma): Promise<Uint8Array> {
  if (nasil === 'yok') return b
  if (typeof DecompressionStream === 'undefined')
    throw new YedekHatasi(
      'Bu yedek sıkıştırılmış ve bu ortam gzip açamıyor. Başka bir cihazda dene.',
    )
  const akis = new Blob([b as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(akis).arrayBuffer())
}

async function anahtar(gizli: Uint8Array, tuz: Uint8Array, p: KilitParam): Promise<CryptoKey> {
  const ham = await argon2id({
    password: gizli,
    salt: tuz,
    parallelism: p.p,
    iterations: p.t,
    memorySize: p.m,
    hashLength: 32,
    outputType: 'binary',
  })
  return crypto.subtle.importKey('raw', ham as BufferSource, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

/** Dökümü kurtarma koduyla mühürler. */
export async function muhurle(
  dokum: Dokum,
  kurtarmaKodu: string,
  param: KilitParam = VARSAYILAN_PARAM,
): Promise<MuhurluYedek> {
  const gizli = kurtarmaCoz(kurtarmaKodu)
  if (!gizli) throw new YedekHatasi('Kurtarma kodu geçersiz.')

  const tuz = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const { govde, nasil } = await sikistir(new TextEncoder().encode(JSON.stringify(dokum)))
  const sifreli = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      await anahtar(gizli, tuz, param),
      govde as BufferSource,
    ),
  )
  return {
    bicim: YEDEK_BICIM,
    surum: 1,
    tuz: onaltilikYaz(tuz),
    param,
    iv: onaltilikYaz(iv),
    sikistirma: nasil,
    veri: b64Yaz(sifreli),
  }
}

/** Mührü kurtarma koduyla açar. Kod yanlışsa anlaşılır bir hata verir. */
export async function muhruAc(yedek: MuhurluYedek, kurtarmaKodu: string): Promise<Dokum> {
  if (yedek?.bicim !== YEDEK_BICIM) throw new YedekHatasi('Bu bir Defter yedeği değil.')
  if (yedek.surum !== 1) throw new YedekHatasi('Bu yedeğin biçimi tanınmıyor.')
  const gizli = kurtarmaCoz(kurtarmaKodu)
  if (!gizli) throw new YedekHatasi('Kurtarma kodu geçersiz.')

  let govde: Uint8Array
  try {
    govde = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: onaltilikOku(yedek.iv) as BufferSource },
        await anahtar(gizli, onaltilikOku(yedek.tuz), yedek.param),
        b64Oku(yedek.veri) as BufferSource,
      ),
    )
  } catch {
    throw new YedekHatasi('Kurtarma kodu bu yedeği açmıyor.')
  }
  const nasil = yedek.sikistirma ?? 'gzip'
  return JSON.parse(new TextDecoder().decode(await ac(govde, nasil))) as Dokum
}
