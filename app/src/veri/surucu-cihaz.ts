import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { S } from '../cekirdek/metin.js'
import { yenidenGirilebilirIslem, type SqlSurucu } from './db.js'
import { veritabaniAnahtari } from './kripto.js'

/**
 * Cihaz sürücüsü: @capacitor-community/sqlite üstünden SQLCipher.
 * Dosyanın tamamı şifreli; FTS indeksi de bu şifreli dosyanın içinde
 * durur (KARARLAR.md · K-002). Anahtar Keychain / Android Keystore'dan
 * gelir ve cihazdan çıkmaz (ilke 2.3).
 */
export async function cihazSurucusu(ad = 'defter'): Promise<SqlSurucu> {
  const { anahtar, sifreli } = await veritabaniAnahtari()
  if (!sifreli)
    throw new Error(
      S('veri.guvenliDepoYok'),
    )

  const baglanti = new SQLiteConnection(CapacitorSQLite)
  await CapacitorSQLite.setEncryptionSecret({ passphrase: anahtar! })
  const db = await baglanti.createConnection(ad, true, 'secret', 1, false)
  await db.open()

  const cevir = (r: unknown): Record<string, unknown>[] =>
    ((r as { values?: Record<string, unknown>[] }).values ?? [])

  return {
    calistir: async (sql, param = []) => void (await db.run(sql, param, false)),
    betik: async (sql) => void (await db.execute(sql, false)),
    hepsi: async <T>(sql: string, param: unknown[] = []) =>
      cevir(await db.query(sql, param)) as T[],
    tek: async <T>(sql: string, param: unknown[] = []) =>
      ((cevir(await db.query(sql, param))[0] as T | undefined) ?? null),
    islem: yenidenGirilebilirIslem(async (sql) => void (await db.execute(sql, false))),
    kapat: async () => {
      await db.close()
      await baglanti.closeConnection(ad, false)
    },
  }
}
