import baslangicSql from './sema/001_baslangic.sql?raw'
import { S } from '../cekirdek/metin.js'
import kitaplikSql from './sema/002_kitaplik.sql?raw'
import sayfaSiniriSql from './sema/003_sayfa_siniri.sql?raw'
import soruSql from './sema/004_soru.sql?raw'
import ekSql from './sema/005_ek.sql?raw'
import kenarSql from './sema/006_kenar.sql?raw'
import gomuSql from './sema/007_gomu.sql?raw'
import senkronSql from './sema/008_senkron.sql?raw'

/**
 * Sürücüden bağımsız asgari SQL arayüzü.
 * Cihazda @capacitor-community/sqlite (SQLCipher), testlerde better-sqlite3
 * aynı arayüzü karşılar. Üst katmanlar hangisinin çalıştığını bilmez.
 */
export interface SqlSurucu {
  /** Tek ifade çalıştırır. */
  calistir(sql: string, param?: unknown[]): Promise<void>
  /** Çok ifadeli betik çalıştırır. */
  betik(sql: string): Promise<void>
  hepsi<T = Record<string, unknown>>(sql: string, param?: unknown[]): Promise<T[]>
  tek<T = Record<string, unknown>>(sql: string, param?: unknown[]): Promise<T | null>
  /** Tek işlem içinde çalıştırır; hata olursa geri alır. */
  islem<T>(f: () => Promise<T>): Promise<T>
  kapat(): Promise<void>
}

/**
 * Yeniden girilebilir işlem sarmalayıcısı.
 *
 * SQLite iç içe BEGIN kabul etmez, ama üst katmanda iç içe işlem doğal:
 * tohum yüzlerce kaydı tek işlemde ekliyor, `kayitEkle` ise kendi işlemini
 * açıyor. En dıştaki işlem gerçek olur, içtekiler ona katılır.
 */
export function yenidenGirilebilirIslem(
  calistir: (sql: string) => void | Promise<void>,
): <T>(f: () => Promise<T>) => Promise<T> {
  let derinlik = 0
  return async <T>(f: () => Promise<T>): Promise<T> => {
    if (derinlik++ > 0)
      try {
        return await f()
      } finally {
        derinlik--
      }
    await calistir('BEGIN')
    try {
      const s = await f()
      await calistir('COMMIT')
      return s
    } catch (e) {
      await calistir('ROLLBACK')
      throw e
    } finally {
      derinlik--
    }
  }
}

export interface Goc {
  surum: number
  sql: string
}

/** Göçler sırayla uygulanır; uygulanan sürüm PRAGMA user_version'da tutulur. */
export const GOCLER: Goc[] = [
  { surum: 1, sql: baslangicSql },
  { surum: 2, sql: kitaplikSql },
  { surum: 3, sql: sayfaSiniriSql },
  { surum: 4, sql: soruSql },
  { surum: 5, sql: ekSql },
  { surum: 6, sql: kenarSql },
  { surum: 7, sql: gomuSql },
  { surum: 8, sql: senkronSql },
]

export const SON_SURUM = GOCLER[GOCLER.length - 1]!.surum

async function surumOku(db: SqlSurucu): Promise<number> {
  const r = await db.tek<{ user_version: number }>('PRAGMA user_version')
  return r?.user_version ?? 0
}

/**
 * Şemayı güncel sürüme getirir. Zaten güncelse hiçbir şey yapmaz.
 * Uygulanan göç sayısını döndürür.
 */
/**
 * Göçleri uygular. `hedef` verilirse yalnızca o sürüme kadar — yedek geri
 * yüklerken şema önce dökümün alındığı sürümde kuruluyor (K-022).
 */
export async function gocleriUygula(db: SqlSurucu, hedef = SON_SURUM): Promise<number> {
  const mevcut = await surumOku(db)
  if (mevcut > SON_SURUM)
    throw new Error(
      `Veritabanı sürümü ${mevcut}, bu uygulama en fazla ${SON_SURUM} biliyor. ` +
        S('veri.surumYeni'),
    )
  let uygulanan = 0
  /*
   * Yabancı anahtarlar göç boyunca kapalı.
   *
   * SQLite'ta tablo yapısını değiştirmenin yolu tabloyu yeniden kurmak.
   * Ama `DROP TABLE kayit` açık yabancı anahtarlarla birlikte ON DELETE
   * CASCADE zincirini tetikliyor ve sayfa başlıklarını, kenar notlarını,
   * tema bağlarını da siliyor. Bu, sessiz veri kaybı.
   *
   * `PRAGMA foreign_keys` işlem İÇİNDE yok sayılır, o yüzden burada —
   * işlemin dışında — kapatılıp sonra geri açılıyor. SQLite'ın tablo
   * değiştirme yordamının önerdiği sıra bu.
   */
  await db.calistir('PRAGMA foreign_keys = OFF')
  try {
    for (const g of GOCLER) {
      if (g.surum <= mevcut || g.surum > hedef) continue
      await db.islem(async () => {
        await db.betik(g.sql)
        await db.calistir(`PRAGMA user_version = ${g.surum}`)
      })
      uygulanan++
    }
  } finally {
    await db.calistir('PRAGMA foreign_keys = ON')
  }
  return uygulanan
}

/** Her açılışta uygulanan ayarlar. */
export async function pragmalariKur(db: SqlSurucu): Promise<void> {
  await db.calistir('PRAGMA foreign_keys = ON')
  /* Silinen kayıt sayfada iz bırakmasın. */
  await db.calistir('PRAGMA secure_delete = ON')
  await db.calistir('PRAGMA journal_mode = WAL')
  await db.calistir('PRAGMA synchronous = NORMAL')
}

export async function defteriAc(db: SqlSurucu): Promise<SqlSurucu> {
  await pragmalariKur(db)
  await gocleriUygula(db)
  return db
}
