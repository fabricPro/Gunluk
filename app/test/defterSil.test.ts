import { beforeEach, describe, expect, it } from 'vitest'
import { Depo } from '../src/veri/depo.js'
import { defteriAc } from '../src/veri/db.js'
import type { SqlSurucu } from '../src/veri/db.js'
import { testSurucusu } from './surucu.js'

let db: SqlSurucu
let depo: Depo

beforeEach(async () => {
  db = await defteriAc(testSurucusu())
  depo = new Depo(db)
})

const sayi = async (tablo: string): Promise<number> =>
  (await db.tek<{ n: number }>(`SELECT count(*) AS n FROM ${tablo}`))?.n ?? 0

async function doldur(id: string): Promise<string> {
  depo.defteriSec(id)
  const k = await depo.kayitEkle({
    tarih: '2026-03-12',
    saat: '09:00',
    metin: 'silinecek kayıt',
    temalar: ['kerem'],
  })
  await depo.baslikYaz(k.id, 'başlık')
  await depo.kenarEkle(k.id, 'kenar notu')
  await depo.ekYaz({ kayitId: k.id, tur: 'image/jpeg', veri: 'AAAA', en: 4, boy: 3, bayt: 3 })
  return k.id
}

describe('defter silme', () => {
  it('defterle birlikte kayıt, başlık, kenar notu ve ek de gidiyor', async () => {
    const a = await depo.defterAc('Gidecek', 'deri')
    const b = await depo.defterAc('Kalacak', 'deri')
    await doldur(a.id)
    await doldur(b.id)

    await depo.defterSil(a.id)

    expect(await sayi('defter')).toBe(2) // 'defter-1' göçten geliyor + Kalacak
    expect(await sayi('kayit')).toBe(1)
    expect(await sayi('sayfa_baslik')).toBe(1)
    expect(await sayi('kenar')).toBe(1)
    expect(await sayi('ek')).toBe(1)
    expect(await sayi('kayit_tema')).toBe(1)
  })

  it('silinen defterin kayıtları aramadan da düşüyor — FTS temizleniyor', async () => {
    const a = await depo.defterAc('Gidecek', 'deri')
    await doldur(a.id)
    depo.defteriSec(a.id)
    expect(await depo.ara('silinecek')).toHaveLength(1)

    await depo.defterSil(a.id)

    expect(await sayi('kayit_fts')).toBe(0)
  })

  it('açık defter silinince başka bir deftere geçiliyor', async () => {
    const a = await depo.defterAc('Gidecek', 'deri')
    depo.defteriSec(a.id)
    await depo.defterSil(a.id)
    expect(depo.aktifDefterId).not.toBe(a.id)
    expect(depo.aktifDefterId).not.toBe('')
    expect(await depo.ayarOku('aktifDefter')).toBe(depo.aktifDefterId)
  })

  it('başka defterin içindekilere dokunmuyor', async () => {
    const a = await depo.defterAc('Gidecek', 'deri')
    const b = await depo.defterAc('Kalacak', 'deri')
    await doldur(a.id)
    const kb = await doldur(b.id)
    await depo.defterSil(a.id)
    depo.defteriSec(b.id)
    expect(await depo.kayitGetir(kb)).not.toBeNull()
    expect((await depo.kenarlar()).get(kb)).toHaveLength(1)
    expect((await depo.ekler()).get(kb)).toBeDefined()
  })
})

describe('silmeden önceki döküm', () => {
  it('boş defterde sıfır sayıyor', async () => {
    const d = await depo.defterAc('Deneme', 'deri')
    const oz = await depo.defterOzeti(d.id)
    expect(oz).toEqual({ kayit: 0, gun: 0, kenar: 0, ek: 0, ilk: null, son: null })
  })

  it('ne kaybedileceğini sayıyor', async () => {
    const d = await depo.defterAc('Dolu', 'deri')
    depo.defteriSec(d.id)
    const k1 = await depo.kayitEkle({ tarih: '2026-01-05', saat: '09:00', metin: 'bir' })
    await depo.kayitEkle({ tarih: '2026-01-05', saat: '21:00', metin: 'iki' })
    await depo.kayitEkle({ tarih: '2026-04-20', saat: '10:00', metin: 'üç' })
    await depo.kenarEkle(k1.id, 'not bir')
    await depo.kenarEkle(k1.id, 'not iki')
    await depo.ekYaz({ kayitId: k1.id, tur: 'image/jpeg', veri: 'AAAA', en: 4, boy: 3, bayt: 3 })

    expect(await depo.defterOzeti(d.id)).toEqual({
      kayit: 3,
      gun: 2,
      kenar: 2,
      ek: 1,
      ilk: '2026-01-05',
      son: '2026-04-20',
    })
  })
})
