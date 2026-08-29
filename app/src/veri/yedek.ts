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

export interface MuhurluYedek {
  bicim: typeof YEDEK_BICIM
  surum: 1
  tuz: string
  param: KilitParam
  iv: string
  /** base64 — gzip'lenmiş dökümün AES-GCM şifrelisi. */
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

async function sikistir(b: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') return b
  const akis = new Blob([b as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(akis).arrayBuffer())
}

async function ac(b: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') return b
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
  const govde = await sikistir(new TextEncoder().encode(JSON.stringify(dokum)))
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
  return JSON.parse(new TextDecoder().decode(await ac(govde))) as Dokum
}
