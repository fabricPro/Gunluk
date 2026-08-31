import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defteriAc } from '../src/veri/db.js'
import type { SqlSurucu } from '../src/veri/db.js'
import { Depo } from '../src/veri/depo.js'
import { testSurucusu } from './surucu.js'

/**
 * Senkron izi — hangi satır değişti, hangi sırayla.
 *
 * İz TETİKLEYİCİLERLE tutuluyor: hangi kod yolundan yazılırsa yazılsın
 * düşsün. Bu testler o sözü sabitliyor (KARARLAR.md · K-036).
 */

let dizin: string
let db: SqlSurucu
let depo: Depo

beforeEach(async () => {
  dizin = mkdtempSync(join(tmpdir(), 'defter-iz-'))
  db = testSurucusu(join(dizin, 'defter.db'))
  depo = new Depo(await defteriAc(db))
  await depo.senkronIzleriSil()
})

afterEach(async () => {
  await db.kapat()
  rmSync(dizin, { recursive: true, force: true })
})

const iz = (varlik: string, id: string) =>
  db.tek<{ sira: number; silindi: number; gonderildi: number }>(
    'SELECT sira, silindi, gonderildi FROM senkron_iz WHERE varlik = ? AND id = ?',
    [varlik, id],
  )

describe('iz düşüyor', () => {
  it('kayıt eklenince', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'ilk' })
    expect(await iz('kayit', k.id)).toMatchObject({ silindi: 0, gonderildi: 0 })
  })

  it('kayıt düzeltilince sıra ilerliyor', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'ilk' })
    const once = (await iz('kayit', k.id))!.sira
    await depo.kayitDuzelt(k.id, 'düzeltilmiş')
    expect((await iz('kayit', k.id))!.sira).toBeGreaterThan(once)
  })

  it('kayıt silinince mezar taşı kalıyor', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'gidecek' })
    await depo.kayitSil(k.id)
    expect(await iz('kayit', k.id)).toMatchObject({ silindi: 1, gonderildi: 0 })
  })

  it('kenar notu, başlık, ek ve kapsül de iz bırakıyor', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'gövde' })
    const n = await depo.kenarEkle(k.id, 'sonradan not')
    await depo.baslikYaz(k.id, 'Son yaz')
    await depo.ekYaz({
      kayitId: k.id, tur: 'image/webp', veri: 'AAA', en: 10, boy: 10, bayt: 3,
    })
    const kap = await depo.kapsulEkle('2026-05-04', '2027-05-04', 'sevgili ben')
    expect(await iz('kenar', n.id)).toBeTruthy()
    expect(await iz('sayfa_baslik', k.id)).toBeTruthy()
    expect(await iz('ek', k.id)).toBeTruthy()
    expect(await iz('kapsul', kap)).toBeTruthy()
  })

  it('tema bağı bileşik kimlikle iz bırakıyor', async () => {
    await depo.temaTanimla('kerem', 'Kerem', ['kerem'])
    const k = await depo.kayitEkle({
      tarih: '2026-05-04', saat: '22:15', metin: 'Kerem', temalar: ['kerem'],
    })
    expect(await iz('kayit_tema', `${k.id}|kerem`)).toBeTruthy()
  })
})

describe('Lamport saati', () => {
  it('her değişiklikte kesin artıyor', async () => {
    const a = await depo.senkronSaati()
    await depo.kayitEkle({ tarih: '2026-05-04', saat: '01:00', metin: 'bir' })
    const b = await depo.senkronSaati()
    await depo.kayitEkle({ tarih: '2026-05-04', saat: '02:00', metin: 'iki' })
    const c = await depo.senkronSaati()
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(b)
  })

  it('çekilen daha büyük değere ilerliyor, geri gitmiyor', async () => {
    await depo.senkronSaatiIlerlet(500)
    expect(await depo.senkronSaati()).toBe(500)
    await depo.senkronSaatiIlerlet(100)
    expect(await depo.senkronSaati()).toBe(500)
  })

  it('ilerledikten sonraki yerel değişiklik daha da büyük', async () => {
    await depo.senkronSaatiIlerlet(500)
    const k = await depo.kayitEkle({ tarih: '2026-05-04', saat: '03:00', metin: 'üç' })
    expect((await iz('kayit', k.id))!.sira).toBeGreaterThan(500)
  })
})

describe('uzaktan uygulama tetikleyicileri susturuyor', () => {
  it('çekilen satır "gönderilecek" diye işaretlenmiyor', async () => {
    /* Yankı döngüsünün ta kendisi: susmasaydı iki cihaz birbirine
       sonsuza kadar aynı satırı yollardı. */
    await depo.senkronUygula([
      {
        varlik: 'kayit',
        id: 'uzaktan-1',
        sira: 7,
        alanlar: {
          id: 'uzaktan-1', defter_id: 'defter-1', tarih: '2026-05-05', saat: '09:00',
          metin: 'başka cihazdan', sira: 0, olusturma: 1, guncelleme: 1, duzenlendi: 0,
          soru: null,
        },
      },
    ])
    /*
     * İz DÜŞÜYOR ama `gonderildi = 1` ile: satır zaten sunucuda, geri
     * gönderilmeyecek. İzin durmasının sebebi çakışma kararı — sonraki
     * turda "yerelin Lamport sırası neydi" sorusunun cevabı burada.
     */
    expect(await iz('kayit', 'uzaktan-1')).toMatchObject({ gonderildi: 1, sira: 7 })
    expect(await depo.senkronBekleyenSayisi()).toBe(0)
  })

  it('uygulanan satır gerçekten yazılmış', async () => {
    await depo.senkronUygula([
      {
        varlik: 'kayit',
        id: 'uzaktan-2',
        sira: 7,
        alanlar: {
          id: 'uzaktan-2', defter_id: 'defter-1', tarih: '2026-05-05', saat: '09:00',
          metin: 'başka cihazdan', sira: 0, olusturma: 1, guncelleme: 1, duzenlendi: 0,
          soru: null,
        },
      },
    ])
    expect((await depo.senkronSatir('kayit', 'uzaktan-2'))?.metin).toBe('başka cihazdan')
  })

  it('uzaktan silme yerelden siliyor ve mezar taşını gönderilmiş sayıyor', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'gidecek' })
    await depo.senkronUygula([{ varlik: 'kayit', id: k.id, sira: 9, alanlar: null }])
    expect(await depo.senkronSatir('kayit', k.id)).toBeNull()
    /*
     * İz "silindi" oluyor ama gönderilmiş sayılıyor: silmeyi zaten karşı
     * taraf yaptı, geri yollamaya gerek yok. Silindi bilgisinin durması
     * şart — yoksa aynı kaydın eski canlı sürümü çekilince kayıt dirilir.
     */
    expect(await iz('kayit', k.id)).toMatchObject({ silindi: 1, gonderildi: 1, sira: 9 })
    expect(await depo.senkronBekleyenSayisi()).toBe(0)
  })

  it('bayrak hata durumunda da geri iniyor', async () => {
    await depo
      .senkronUygula([{ varlik: 'kayit', id: 'x', sira: 1, alanlar: { bilinmeyen_sutun: 1 } }])
      .catch(() => {})
    const s = await db.tek<{ uygulaniyor: number }>(
      'SELECT uygulaniyor FROM senkron_sayac WHERE tek = 1',
    )
    expect(s?.uygulaniyor).toBe(0)
  })
})

describe('gönderildi işareti', () => {
  it('gönderim sırasında değişen kayıt gönderilmiş sayılmıyor', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'ilk' })
    const bekleyen = (await depo.senkronBekleyen())[0]!

    /* Gönderim sürerken kullanıcı kaydı düzeltti. */
    await depo.kayitDuzelt(k.id, 'düzeltilmiş')

    /* Eski sırayla işaretleme yapılıyor — tutmamalı. */
    await depo.senkronGonderildi([bekleyen])
    expect((await iz('kayit', k.id))!.gonderildi).toBe(0)
    expect(await depo.senkronBekleyenSayisi()).toBe(1)
  })

  it('değişmeyen kayıt gönderilmiş sayılıyor', async () => {
    await depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'ilk' })
    const bekleyen = await depo.senkronBekleyen()
    await depo.senkronGonderildi(bekleyen)
    expect(await depo.senkronBekleyenSayisi()).toBe(0)
  })

  it('bekleyenler eskiden yeniye sıralı', async () => {
    for (let i = 0; i < 5; i++)
      await depo.kayitEkle({ tarih: '2026-05-04', saat: `0${i}:00`, metin: 'k' + i })
    const b = await depo.senkronBekleyen()
    const siralar = b.map((x) => x.sira)
    expect([...siralar].sort((a, c) => a - c)).toEqual(siralar)
  })
})
