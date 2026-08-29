import { beforeEach, describe, expect, it } from 'vitest'
import { GOCLER, SON_SURUM, defteriAc, gocleriUygula, pragmalariKur } from '../src/veri/db.js'
import type { SqlSurucu } from '../src/veri/db.js'
import { Depo } from '../src/veri/depo.js'
import { testSurucusu } from './surucu.js'

/**
 * Göç testleri. Buradaki asıl soru şu: on yıllık bir defteri taşırken
 * hiçbir kayıt kayboluyor mu.
 */

/** Yalnızca 1. sürüme kadar göç uygular — eski bir defter taklidi. */
async function eskiDefter(db: SqlSurucu): Promise<void> {
  await pragmalariKur(db)
  await db.islem(async () => {
    await db.betik(GOCLER[0]!.sql)
    await db.calistir('PRAGMA user_version = 1')
  })
}

let db: SqlSurucu

beforeEach(() => {
  db = testSurucusu()
})

describe('002 — kitaplık göçü', () => {
  it('var olan kayıtların hiçbiri kaybolmuyor', async () => {
    await eskiDefter(db)
    const t = Date.now()
    for (let i = 0; i < 120; i++)
      await db.calistir(
        `INSERT INTO kayit (id, tarih, saat, metin, sira, olusturma, guncelleme, duzenlendi)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [`k${i}`, '2026-0' + ((i % 9) + 1) + '-01', '10:00', `eski kayıt ${i}`, i, t, t],
      )
    await db.calistir("INSERT INTO cilt (no, ad) VALUES (1, 'Son yıl')")

    expect((await db.tek<{ n: number }>('SELECT count(*) AS n FROM kayit'))!.n).toBe(120)
    expect(await gocleriUygula(db)).toBe(GOCLER.filter((g) => g.surum > 1).length)
    expect((await db.tek<{ n: number }>('SELECT count(*) AS n FROM kayit'))!.n).toBe(120)
    expect((await db.tek<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(
      SON_SURUM,
    )
  })

  it('bütün kayıtlar tek deftere bağlanıyor ve defter adı korunuyor', async () => {
    await eskiDefter(db)
    const t = Date.now()
    await db.calistir(
      `INSERT INTO kayit (id, tarih, saat, metin, sira, olusturma, guncelleme, duzenlendi)
       VALUES ('k1', '2026-01-01', '10:00', 'metin', 0, ?, ?, 0)`,
      [t, t],
    )
    await db.calistir("INSERT INTO cilt (no, ad) VALUES (1, 'Son yıl')")
    await gocleriUygula(db)

    expect(
      await db.hepsi<{ id: string; ad: string; cilt: number }>('SELECT id, ad, cilt FROM defter'),
    ).toEqual([{ id: 'defter-1', ad: 'Son yıl', cilt: 1 }])
    expect(
      (await db.tek<{ n: number }>("SELECT count(*) AS n FROM kayit WHERE defter_id != 'defter-1'"))!
        .n,
    ).toBe(0)
  })

  it('cilt adı yoksa defter adı "Defter" olur', async () => {
    await eskiDefter(db)
    await gocleriUygula(db)
    expect((await db.tek<{ ad: string }>('SELECT ad FROM defter'))?.ad).toBe('Defter')
  })

  it('arama göçten sonra da çalışıyor — FTS indeksi yeniden kuruldu', async () => {
    await eskiDefter(db)
    const t = Date.now()
    await db.calistir(
      `INSERT INTO kayit (id, tarih, saat, metin, sira, olusturma, guncelleme, duzenlendi)
       VALUES ('k1', '2026-01-01', '10:00', 'açık havada yürüdüm', 0, ?, ?, 0)`,
      [t, t],
    )
    await gocleriUygula(db)

    const depo = new Depo(db)
    expect(await depo.ara('açık')).toHaveLength(1)
    expect(await depo.ara('acik')).toHaveLength(0)
    await depo.kayitEkle({ tarih: '2026-08-29', saat: '09:00', metin: 'yeni bir kayıt' })
    expect(await depo.ara('yeni')).toHaveLength(1)
  })

  it('başlık, kenar notu ve kapsül göçten sağ çıkıyor', async () => {
    await eskiDefter(db)
    const t = Date.now()
    await db.calistir(
      `INSERT INTO kayit (id, tarih, saat, metin, sira, olusturma, guncelleme, duzenlendi)
       VALUES ('k1', '2026-01-01', '10:00', 'metin', 0, ?, ?, 0)`,
      [t, t],
    )
    await db.calistir("INSERT INTO sayfa_baslik (kayit_id, baslik) VALUES ('k1', 'Başlık')")
    await db.calistir(
      "INSERT INTO kenar (id, kayit_id, metin, tarih) VALUES ('kn', 'k1', 'not', '1 ocak')",
    )
    await db.calistir(
      "INSERT INTO kapsul (id, yazilma, acilma, metin) VALUES ('kp', 1, '2030-01-01', 'mektup')",
    )
    await gocleriUygula(db)

    const depo = new Depo(db)
    expect((await depo.basliklar()).get('k1')).toBe('Başlık')
    expect((await depo.kenarlar()).get('k1')?.[0]?.metin).toBe('not')
    expect(await depo.kapsuller()).toHaveLength(1)
  })

  it('sıfırdan kurulan defterde de tek bir defter açılıyor', async () => {
    await defteriAc(db)
    expect(await db.hepsi<{ id: string }>('SELECT id FROM defter')).toHaveLength(1)
  })
})

describe('005 — ek göçü', () => {
  it('mevcut defter göçten sağ çıkıyor ve ek tablosu geliyor', async () => {
    await eskiDefter(db)
    const t = Date.now()
    await db.calistir(
      `INSERT INTO kayit (id, tarih, saat, metin, sira, olusturma, guncelleme)
       VALUES ('k1', '2026-01-05', '09:00', 'göçten önce yazılmış', 0, ?, ?)`,
      [t, t],
    )
    await db.calistir("INSERT INTO sayfa_baslik (kayit_id, baslik) VALUES ('k1', 'Başlangıç')")

    await gocleriUygula(db)

    expect((await db.tek<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(
      SON_SURUM,
    )
    expect((await db.tek<{ metin: string }>("SELECT metin FROM kayit WHERE id = 'k1'"))?.metin).toBe(
      'göçten önce yazılmış',
    )
    expect(
      (await db.tek<{ baslik: string }>("SELECT baslik FROM sayfa_baslik WHERE kayit_id = 'k1'"))
        ?.baslik,
    ).toBe('Başlangıç')

    const depo = new Depo(db)
    await depo.ekYaz({ kayitId: 'k1', tur: 'image/jpeg', veri: 'AAAA', en: 4, boy: 3, bayt: 3 })
    expect((await depo.ekVeri('k1'))?.veri).toBe('AAAA')
  })
})

describe('006 — kenar notu zaman damgası', () => {
  it('göçten önceki notlar duruyor ve kalıcı sayılıyor', async () => {
    await eskiDefter(db)
    const t = Date.now()
    await db.calistir(
      `INSERT INTO kayit (id, tarih, saat, metin, sira, olusturma, guncelleme)
       VALUES ('k1', '2026-01-05', '09:00', 'kayıt', 0, ?, ?)`,
      [t, t],
    )
    await db.calistir(
      "INSERT INTO kenar (id, kayit_id, metin, tarih) VALUES ('n1', 'k1', 'eski not', '5 ocak 2026')",
    )

    await gocleriUygula(db)

    const notlar = (await new Depo(db).kenarlar()).get('k1')!
    expect(notlar).toHaveLength(1)
    expect(notlar[0]!.metin).toBe('eski not')
    /* 0 = "bugün yazılmadı", yani silinemez. Varsayılan doğru tarafa düşüyor. */
    expect(notlar[0]!.olusturma).toBe(0)
  })
})
