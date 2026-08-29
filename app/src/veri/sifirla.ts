import { gocleriUygula, type SqlSurucu } from './db.js'

/**
 * Defteri tamamen boşaltır ve şemayı sıfırdan kurar.
 *
 * Geliştirme aracı: tohumla doldurduktan sonra boş deftere dönmenin yolu.
 * Uygulamada bir düğmesi yok ve olmayacak — kullanıcının on yıllık defterini
 * tek dokunuşla silen bir şey bu üründe bulunamaz.
 */
export async function defteriSifirla(db: SqlSurucu, hedef?: number): Promise<void> {
  const nesneler = await db.hepsi<{ tip: string; ad: string }>(
    `SELECT type AS tip, name AS ad FROM sqlite_master
     WHERE name NOT LIKE 'sqlite_%' AND type IN ('table','view','trigger','index')`,
  )
  const sira: Record<string, number> = { trigger: 0, view: 1, index: 2, table: 3 }
  nesneler.sort((a, b) => (sira[a.tip] ?? 9) - (sira[b.tip] ?? 9))

  await db.calistir('PRAGMA foreign_keys = OFF')
  for (const n of nesneler) {
    /* FTS5 sanal tablosunun gölge tabloları ana tabloyla birlikte gider. */
    try {
      await db.calistir(`DROP ${n.tip.toUpperCase()} IF EXISTS "${n.ad}"`)
    } catch {
      /* gölge tablo zaten düşmüş olabilir */
    }
  }
  await db.calistir('PRAGMA user_version = 0')
  await db.calistir('PRAGMA foreign_keys = ON')
  await gocleriUygula(db, hedef)
}
