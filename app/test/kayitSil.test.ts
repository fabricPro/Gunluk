import { beforeEach, describe, expect, it } from 'vitest'
import { Depo } from '../src/veri/depo.js'
import { defteriAc } from '../src/veri/db.js'
import type { SqlSurucu } from '../src/veri/db.js'
import { sayfalariKur } from '../src/cekirdek/sayfa.js'
import { soruCoz } from '../src/cekirdek/sorgu.js'
import { testSurucusu } from './surucu.js'

let db: SqlSurucu
let depo: Depo

beforeEach(async () => {
  db = await defteriAc(testSurucusu())
  depo = new Depo(db)
})

const ek = (kayitId: string) => ({
  kayitId, tur: 'image/jpeg', veri: 'AAAA', en: 4, boy: 3, bayt: 3,
})

async function ikiKayit() {
  const a = await depo.kayitEkle({
    tarih: '2026-03-12', saat: '09:00', metin: 'Silinecek olan kayıt bu.', temalar: ['kerem'],
  })
  const b = await depo.kayitEkle({
    tarih: '2026-03-12', saat: '21:00', metin: 'Kalacak olan kayıt bu.',
  })
  for (const k of [a, b]) {
    await depo.baslikYaz(k.id, 'başlık ' + k.saat)
    await depo.kenarEkle(k.id, 'not ' + k.saat)
    await depo.ekYaz(ek(k.id))
  }
  return { a, b }
}

const sayi = async (tablo: string): Promise<number> =>
  (await db.tek<{ n: number }>(`SELECT count(*) AS n FROM ${tablo}`))?.n ?? 0

describe('kayıt silme', () => {
  it('kayıt günlerden düşüyor, iz bırakmıyor', async () => {
    const { a } = await ikiKayit()
    await depo.kayitSil(a.id)
    const gunler = await depo.gunler()
    const metinler = gunler.flatMap((g) => g.kayitlar.map((k) => k.metin))
    expect(metinler).toEqual(['Kalacak olan kayıt bu.'])
    expect(await depo.kayitGetir(a.id)).toBeNull()
  })

  /* FTS tetikleyicisi silmede de çalışmalı; yoksa silinen kayıt aramada
     hayalet olarak kalırdı. */
  it('aramadan da düşüyor', async () => {
    const { a } = await ikiKayit()
    expect(await depo.ara('Silinecek')).toHaveLength(1)
    await depo.kayitSil(a.id)
    expect(await depo.ara('Silinecek')).toHaveLength(0)
    expect(await depo.ara('Kalacak')).toHaveLength(1)
  })

  it('arşiv sorgusu silinen kaydı döndürmüyor', async () => {
    const { a } = await ikiKayit()
    await depo.kayitSil(a.id)
    const s = soruCoz('silinecek', await depo.gunler(), [], await depo.kenarlar())
    expect(s.bos).toBe(true)
  })

  it('kaydın başlığı, kenar notu ve eki de gidiyor', async () => {
    const { a } = await ikiKayit()
    await depo.kayitSil(a.id)
    expect(await sayi('sayfa_baslik')).toBe(1)
    expect(await sayi('kenar')).toBe(1)
    expect(await sayi('ek')).toBe(1)
    expect(await sayi('kayit_tema')).toBe(0)
  })

  it('başka kaydın notu ve eki duruyor', async () => {
    const { a, b } = await ikiKayit()
    await depo.kayitSil(a.id)
    expect((await depo.kenarlar()).get(b.id)).toHaveLength(1)
    expect((await depo.ekler()).get(b.id)).toBeDefined()
    expect((await depo.basliklar()).get(b.id)).toBe('başlık 21:00')
  })

  it('sayfa akışı yeniden hesaplanıyor — sayfa sayısı azalıyor', async () => {
    const uzun = 'kelime '.repeat(400)
    const k1 = await depo.kayitEkle({ tarih: '2026-03-12', saat: '09:00', metin: uzun })
    await depo.kayitEkle({ tarih: '2026-03-12', saat: '10:00', metin: uzun })
    const once = sayfalariKur({ gunler: await depo.gunler(), kenarlar: new Map() }).sayfalar.length

    await depo.kayitSil(k1.id)
    const sonra = sayfalariKur({ gunler: await depo.gunler(), kenarlar: new Map() }).sayfalar.length
    expect(sonra).toBeLessThan(once)
  })

  it('günün tek kaydı silinince gün de kalmıyor', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-05-01', saat: '09:00', metin: 'tek kayıt' })
    await depo.kayitSil(k.id)
    expect(await depo.gunler()).toEqual([])
    expect(await depo.kayitSayisi()).toBe(0)
  })
})
