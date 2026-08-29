import Database from 'better-sqlite3'
import { yenidenGirilebilirIslem, type SqlSurucu } from '../src/veri/db.js'

/**
 * Testlerde kullanılan better-sqlite3 sürücüsü. Cihazdaki SQLCipher ve
 * tarayıcıdaki sqlite-wasm ile aynı arayüzü karşılar; böylece depo ve göç
 * testleri gerçek SQL üstünde, tarayıcısız çalışır.
 */
export function testSurucusu(dosya = ':memory:'): SqlSurucu & { dosya: string } {
  const db = new Database(dosya)
  const cagir = (sql: string, param: unknown[]) => db.prepare(sql).run(...(param as never[]))
  return {
    dosya,
    calistir: async (sql, param = []) => void cagir(sql, param),
    betik: async (sql) => void db.exec(sql),
    hepsi: async <T>(sql: string, param: unknown[] = []) =>
      db.prepare(sql).all(...(param as never[])) as T[],
    tek: async <T>(sql: string, param: unknown[] = []) =>
      (db.prepare(sql).get(...(param as never[])) as T) ?? null,
    islem: yenidenGirilebilirIslem((sql) => void db.exec(sql)),
    kapat: async () => void db.close(),
  }
}
