import { yenidenGirilebilirIslem, type SqlSurucu } from './db.js'
import type { Istek, IstekTip, Yanit } from './sqlite-isci.js'

/**
 * Tarayıcı (geliştirme) sürücüsü: resmî SQLite wasm derlemesi, bir
 * worker içinde, OPFS'te kalıcı.
 *
 * SQLCipher yok — bu derlemede veritabanı ŞİFRESİZ ve bu sessiz
 * geçilmiyor. Cihazda surucu-cihaz.ts devreye girer.
 */
export interface WebSurucu extends SqlSurucu {
  /** OPFS açılabildi mi — false ise veri yenilemede gider. */
  kalici: boolean
}

export async function webSurucusu(dosya = 'defter.db'): Promise<WebSurucu> {
  const isci = new Worker(new URL('./sqlite-isci.ts', import.meta.url), { type: 'module' })
  const bekleyen = new Map<number, { coz: (v: unknown) => void; kir: (e: Error) => void }>()
  let sonId = 0
  let kalici = false

  isci.onmessage = (e: MessageEvent<Yanit>) => {
    const b = bekleyen.get(e.data.id)
    if (!b) return
    bekleyen.delete(e.data.id)
    if (e.data.kalici !== undefined) kalici = e.data.kalici
    if (e.data.hata) b.kir(new Error(e.data.hata))
    else b.coz(e.data.sonuc)
  }

  const cagir = (tip: IstekTip, sql = '', param: unknown[] = []): Promise<unknown> =>
    new Promise((coz, kir) => {
      const id = ++sonId
      bekleyen.set(id, { coz, kir })
      const istek: Istek = { id, tip, sql, param, dosya }
      isci.postMessage(istek)
    })

  await cagir('ac')
  if (!kalici)
    console.warn('[defter] OPFS yok — veritabanı yalnızca bellekte, yenilemede gidecek.')

  const surucu: WebSurucu = {
    kalici,
    calistir: async (sql, param = []) => void (await cagir('calistir', sql, param)),
    betik: async (sql) => void (await cagir('betik', sql)),
    hepsi: async <T>(sql: string, param: unknown[] = []) =>
      (await cagir('hepsi', sql, param)) as T[],
    tek: async <T>(sql: string, param: unknown[] = []) =>
      (((await cagir('hepsi', sql, param)) as T[])[0] ?? null),
    islem: yenidenGirilebilirIslem(async (sql) => void (await cagir('calistir', sql))),
    kapat: async () => {
      await cagir('kapat')
      isci.terminate()
    },
  }
  return surucu
}
