import { kurtarmaCoz } from '../cekirdek/kurtarma.js'
import { S } from '../cekirdek/metin.js'
import {
  VARSAYILAN_PARAM,
  aesAnahtar,
  b64Oku,
  b64Yaz,
  onaltilikOku,
  onaltilikYaz,
  rastgele,
  yavasTuret,
  type KilitParam,
} from '../cekirdek/gizle.js'
import { paketiAc, paketle, type Sikistirma } from '../cekirdek/muhur.js'
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
export type { Sikistirma }

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

const anahtar = async (gizli: Uint8Array, tuz: Uint8Array, p: KilitParam): Promise<CryptoKey> =>
  aesAnahtar(await yavasTuret(gizli, tuz, p))

/** Dökümü kurtarma koduyla mühürler. */
export async function muhurle(
  dokum: Dokum,
  kurtarmaKodu: string,
  param: KilitParam = VARSAYILAN_PARAM,
): Promise<MuhurluYedek> {
  const gizli = kurtarmaCoz(kurtarmaKodu)
  if (!gizli) throw new YedekHatasi(S('veri.kodGecersiz'))

  const tuz = rastgele(16)
  const iv = rastgele(12)
  const { govde, nasil } = await paketle(new TextEncoder().encode(JSON.stringify(dokum)))
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
  if (yedek?.bicim !== YEDEK_BICIM) throw new YedekHatasi(S('veri.yedekDegil'))
  if (yedek.surum !== 1) throw new YedekHatasi(S('veri.yedekBicim'))
  const gizli = kurtarmaCoz(kurtarmaKodu)
  if (!gizli) throw new YedekHatasi(S('veri.kodGecersiz'))

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
    throw new YedekHatasi(S('veri.kodAcmiyor'))
  }
  const nasil = yedek.sikistirma ?? 'gzip'
  const cozulmus = await paketiAc(govde, nasil).catch(() => {
    throw new YedekHatasi(S('veri.gzipYok'))
  })
  return JSON.parse(new TextDecoder().decode(cozulmus)) as Dokum
}
