import { Capacitor } from '@capacitor/core'
import type { SqlSurucu } from './db.js'

/**
 * Çalışılan ortama göre sürücü seçer.
 *
 * Cihaz  -> SQLCipher, şifreli.
 * Web    -> sqlite-wasm + OPFS, ŞİFRESİZ. Yalnızca geliştirme içindir ve
 *           sessiz geçilmez: uyarı yazılır, `sifreli` false döner.
 */
export interface AcilisSonuc {
  surucu: SqlSurucu
  sifreli: boolean
}

export async function surucuSec(): Promise<AcilisSonuc> {
  if (Capacitor.isNativePlatform()) {
    const { cihazSurucusu } = await import('./surucu-cihaz.js')
    return { surucu: await cihazSurucusu(), sifreli: true }
  }
  const { webSurucusu } = await import('./surucu-web.js')
  console.warn(
    '[defter] Tarayıcı derlemesi — veritabanı ŞİFRESİZ. Cihaz derlemesinde SQLCipher kullanılır.',
  )
  const surucu = await webSurucusu()
  if (!surucu.kalici)
    console.warn('[defter] Bu ortamda veri kalıcı değil; yenilemede gidecek.')
  return { surucu, sifreli: false }
}
