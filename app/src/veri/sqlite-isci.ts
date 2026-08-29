/**
 * SQLite worker'ı — yalnızca tarayıcı (geliştirme) derlemesinde.
 *
 * OPFS'in eşzamanlı dosya erişimi (createSyncAccessHandle) ana iş
 * parçacığında yok, yalnızca worker'da var. Bu yüzden veritabanı burada
 * açılıyor ve ana taraf mesajla konuşuyor. Cihazda bu dosya hiç
 * çalışmaz — orada SQLCipher devrede (KARARLAR.md · K-002).
 */
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm'

export type IstekTip = 'ac' | 'calistir' | 'betik' | 'hepsi' | 'kapat'

export interface Istek {
  id: number
  tip: IstekTip
  sql?: string
  param?: unknown[]
  dosya?: string
}

export interface Yanit {
  id: number
  sonuc?: unknown
  hata?: string
  kalici?: boolean
}

let db: Database | null = null
let kalici = false

async function ac(dosya: string): Promise<void> {
  const sqlite3 = await sqlite3InitModule()
  try {
    const havuz = await sqlite3.installOpfsSAHPoolVfs({ name: 'defter' })
    db = new havuz.OpfsSAHPoolDb('/' + dosya)
    kalici = true
  } catch (e) {
    console.warn('[defter] OPFS açılamadı — veritabanı yalnızca bellekte.', e)
    db = new sqlite3.oo1.DB(':memory:', 'c')
    kalici = false
  }
}

function satirlar(sql: string, param: unknown[]): Record<string, unknown>[] {
  const cikti: Record<string, unknown>[] = []
  db!.exec({
    sql,
    ...(param.length ? { bind: param as never } : {}),
    rowMode: 'object',
    callback: (r: unknown) => void cikti.push(r as Record<string, unknown>),
  })
  return cikti
}

self.onmessage = async (e: MessageEvent<Istek>) => {
  const { id, tip, sql = '', param = [], dosya = 'defter.db' } = e.data
  try {
    let sonuc: unknown
    if (tip === 'ac') await ac(dosya)
    else if (tip === 'kapat') {
      /* Kapatma bir sorgu değil: boş SQL'i exec'e vermeyelim. */
      db?.close()
      db = null
    } else if (tip === 'betik') db!.exec(sql)
    else sonuc = satirlar(sql, param)
    const yanit: Yanit = { id, sonuc, kalici }
    self.postMessage(yanit)
  } catch (hata) {
    const yanit: Yanit = { id, hata: hata instanceof Error ? hata.message : String(hata) }
    self.postMessage(yanit)
  }
}
