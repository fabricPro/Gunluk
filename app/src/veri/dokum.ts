import { GOCLER, SON_SURUM, gocleriUygula, type SqlSurucu } from './db.js'
import { defteriSifirla } from './sifirla.js'

/**
 * Defterin mantıksal dökümü.
 *
 * Ham veritabanı dosyası yerine tablo tablo JSON: şema sürümü değişse bile
 * eski bir yedek göçlerden geçirilerek geri yüklenebiliyor, ve tarayıcı
 * derlemesiyle cihaz derlemesi aynı dosyayı okuyabiliyor
 * (KARARLAR.md · K-022).
 */

export interface Dokum {
  bicim: 'defter-dokum'
  surum: 1
  /** Dökümün alındığı şema sürümü — geri yüklerken buna göre göç uygulanır. */
  semaSurum: number
  olusturma: number
  tablolar: Record<string, Record<string, unknown>[]>
}

/** FTS sanal tablosu ve gölgeleri türetilmiş veri — döküme girmez. */
const ATLA = /^(sqlite_|kayit_fts)/

async function tabloAdlari(db: SqlSurucu): Promise<string[]> {
  const satirlar = await db.hepsi<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  )
  return satirlar.map((r) => r.name).filter((ad) => !ATLA.test(ad))
}

export async function dokumAl(db: SqlSurucu): Promise<Dokum> {
  const surum =
    (await db.tek<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? SON_SURUM
  const tablolar: Record<string, Record<string, unknown>[]> = {}
  for (const ad of await tabloAdlari(db))
    tablolar[ad] = await db.hepsi<Record<string, unknown>>(`SELECT * FROM "${ad}"`)
  return {
    bicim: 'defter-dokum',
    surum: 1,
    semaSurum: surum,
    olusturma: Date.now(),
    tablolar,
  }
}

export class DokumHatasi extends Error {}

/**
 * Dökümü geri yükler — mevcut verinin YERİNE GEÇER.
 *
 * Sıra önemli: şema dökümün alındığı sürümde kurulur, satırlar yazılır,
 * sonra bugünkü sürüme kadar göç uygulanır. Böylece eski bir yedek yeni
 * uygulamaya girebiliyor.
 */
export async function dokumuYukle(db: SqlSurucu, d: Dokum): Promise<void> {
  if (d.bicim !== 'defter-dokum') throw new DokumHatasi('Bu bir defter yedeği değil.')
  if (d.semaSurum > SON_SURUM)
    throw new DokumHatasi(
      'Bu yedek daha yeni bir sürümle alınmış. Önce uygulamayı güncelle.',
    )

  await defteriSifirla(db, 0)
  await gocleriUygula(db, d.semaSurum)

  await db.calistir('PRAGMA foreign_keys = OFF')
  try {
    await db.islem(async () => {
      /* Tabloları göç sırasına göre değil, yabancı anahtar kapalıyken yazıyoruz. */
      for (const [ad, satirlar] of Object.entries(d.tablolar)) {
        if (ATLA.test(ad) || !satirlar.length) continue
        const varMi = await db.tek<{ n: number }>(
          "SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name = ?",
          [ad],
        )
        if (!varMi?.n) continue
        const sutunlar = Object.keys(satirlar[0]!)
        const yer = sutunlar.map(() => '?').join(', ')
        const sql = `INSERT OR REPLACE INTO "${ad}" (${sutunlar
          .map((s) => `"${s}"`)
          .join(', ')}) VALUES (${yer})`
        for (const satir of satirlar) await db.calistir(sql, sutunlar.map((s) => satir[s] ?? null))
      }
    })
  } finally {
    await db.calistir('PRAGMA foreign_keys = ON')
  }

  await gocleriUygula(db)
  void GOCLER
}
