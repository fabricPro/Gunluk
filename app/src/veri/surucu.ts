import { Capacitor } from '@capacitor/core'
import type { SqlSurucu } from './db.js'
import { veritabaniAnahtari } from './kripto.js'

/**
 * Çalışılan ortama göre sürücü seçer.
 *
 * Cihaz  -> SQLCipher, şifreli.
 * Tarayıcı -> sqlite-wasm. Kilit kuruluysa defter bellekte açılır ve
 *             diske MÜHÜRLÜ yazılır (KARARLAR.md · K-037). Kilit yoksa
 *             anahtar da yok: eski şifresiz yol, ve bu sessiz geçilmez —
 *             uyarı yazılır, `sifreli` false döner.
 */
export interface AcilisSonuc {
  surucu: SqlSurucu
  sifreli: boolean
  /** Açılışta şifresiz eski defter mühürlüye taşındı mı. */
  tasindi: boolean
  /** Tarayıcı depoyu kalıcı saymayı kabul etti mi (cihazda her zaman evet). */
  kaliciIzin: boolean
  /** Sekme arka plana geçerken çağrılır; düz yolda hiçbir şey yapmaz. */
  muhurleSimdi(): Promise<void>
  /** Çıkışta mühürlü kopyayı siler; cihazda iz kalmasın. */
  unut(): Promise<void>
}

export async function surucuSec(): Promise<AcilisSonuc> {
  if (Capacitor.isNativePlatform()) {
    const { cihazSurucusu } = await import('./surucu-cihaz.js')
    return {
      surucu: await cihazSurucusu(),
      sifreli: true,
      tasindi: false,
      kaliciIzin: true,
      muhurleSimdi: async () => {},
      unut: async () => {},
    }
  }

  const { webSurucusu } = await import('./surucu-web.js')
  /*
   * Anahtar kilitten geliyor (`anahtariDayat`). Kilit kurulmamışsa
   * `null` döner ve defter şifresiz açılır — tarayıcıda kilit ARTIK
   * yalnızca bir perde değil, şifrelemenin kendisi.
   */
  const { anahtar } = await veritabaniAnahtari()
  const surucu = await webSurucusu('defter.db', anahtar ?? undefined)
  if (!surucu.muhurlu)
    console.warn(
      '[defter] Kilit kurulu degil - veritabani SIFRESIZ. Ayarlardan kilit kurunca muhurlenir.',
    )
  if (!surucu.kalici) console.warn('[defter] Bu ortamda veri kalici degil.')
  return {
    surucu,
    sifreli: surucu.muhurlu,
    tasindi: surucu.tasindi,
    kaliciIzin: surucu.kaliciIzin,
    muhurleSimdi: () => surucu.muhurleSimdi(),
    unut: () => surucu.unut(),
  }
}
