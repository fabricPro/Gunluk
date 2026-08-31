import { beforeEach, describe, expect, it } from 'vitest'
import { Depo } from '../src/veri/depo.js'
import { defteriAc } from '../src/veri/db.js'
import type { SqlSurucu } from '../src/veri/db.js'
import { GomuAkis } from '../src/gomuAkis.js'
import { paketiAc, benzerlik, paketle } from '../src/cekirdek/gomu.js'
import type { Gomucu } from '../src/cekirdek/gomucu.js'
import { testSurucusu } from './surucu.js'

let db: SqlSurucu
let depo: Depo

beforeEach(async () => {
  db = await defteriAc(testSurucusu())
  depo = new Depo(db)
})

/**
 * Deterministik sahte gömücü: metnin sözcüklerinden sabit bir vektör.
 * Gerçek model bu ortamda indirilemiyor (K-029); boru hattının tamamı
 * buna karşı test ediliyor.
 */
function sahteGomucu(kimlik = 'sahte@v1'): Gomucu & { cagri: number; gecikme: number } {
  const g = {
    kimlik,
    boyut: 16,
    cagri: 0,
    gecikme: 0,
    async goc(metinler: string[]): Promise<Float32Array[]> {
      g.cagri++
      if (g.gecikme) await new Promise((r) => setTimeout(r, g.gecikme))
      return metinler.map((m) => {
        const v = new Float32Array(16)
        for (const s of m.toLocaleLowerCase('tr').split(/\s+/).filter(Boolean)) {
          let h = 0
          for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
          v[Math.abs(h) % 16] = (v[Math.abs(h) % 16] ?? 0) + 1
        }
        return v
      })
    },
  }
  return g
}

const kayitAc = (metin: string, saat = '09:00') =>
  depo.kayitEkle({ tarih: '2026-03-12', saat, metin })

describe('gömü akışı', () => {
  it('bütün kayıtları gömüyor', async () => {
    for (let i = 0; i < 5; i++) await kayitAc('kayıt ' + i, `0${i}:00`)
    const g = sahteGomucu()
    const akis = new GomuAkis(depo, g)
    await akis.calistir()
    expect((await depo.gomuDurum(g.kimlik)).bekleyen).toBe(0)
    expect((await depo.gomular(g.kimlik)).size).toBe(5)
  })

  it('parça parça ilerliyor — tek seferde hepsini istemiyor', async () => {
    for (let i = 0; i < 20; i++) await kayitAc('kayıt ' + i, `0${i % 10}:00`)
    const g = sahteGomucu()
    await new GomuAkis(depo, g).calistir()
    /* 20 kayıt / 8'lik parça = en az 3 çağrı. */
    expect(g.cagri).toBeGreaterThanOrEqual(3)
  })

  it('ikinci koşu yeniden gömmüyor', async () => {
    for (let i = 0; i < 5; i++) await kayitAc('kayıt ' + i, `0${i}:00`)
    const g = sahteGomucu()
    const akis = new GomuAkis(depo, g)
    await akis.calistir()
    const once = g.cagri
    await akis.calistir()
    expect(g.cagri).toBe(once)
  })

  it('yalnızca eksikleri alıyor', async () => {
    for (let i = 0; i < 3; i++) await kayitAc('eski ' + i, `0${i}:00`)
    const g = sahteGomucu()
    await new GomuAkis(depo, g).calistir()
    await kayitAc('yeni kayıt', '23:00')
    g.cagri = 0
    await new GomuAkis(depo, g).calistir()
    expect(g.cagri).toBe(1)
  })

  it('düzeltilen kayıt yeniden gömülüyor', async () => {
    const k = await kayitAc('ilk hâli')
    const g = sahteGomucu()
    await new GomuAkis(depo, g).calistir()
    const oncekiVektor = (await depo.gomular(g.kimlik)).get(k.id)

    await depo.kayitDuzelt(k.id, 'bambaşka bir metin oldu')
    expect((await depo.gomuDurum(g.kimlik)).bekleyen).toBe(1)
    await new GomuAkis(depo, g).calistir()
    expect((await depo.gomular(g.kimlik)).get(k.id)).not.toBe(oncekiVektor)
  })

  /* Model değişirse eski vektörler karşılaştırılamaz; indeks geçersiz. */
  it('model değişince hepsi yeniden gömülüyor', async () => {
    for (let i = 0; i < 4; i++) await kayitAc('kayıt ' + i, `0${i}:00`)
    await new GomuAkis(depo, sahteGomucu('eski@v1')).calistir()
    const yeni = sahteGomucu('yeni@v2')
    expect((await depo.gomuDurum(yeni.kimlik)).bekleyen).toBe(4)
    await new GomuAkis(depo, yeni).calistir()
    expect((await depo.gomular(yeni.kimlik)).size).toBe(4)
    expect((await depo.gomular('eski@v1')).size).toBe(0)
  })

  it('iptal yarıda bırakıyor, sonraki koşu devam ediyor', async () => {
    for (let i = 0; i < 24; i++) await kayitAc('kayıt ' + i, `0${i % 10}:00`)
    const g = sahteGomucu()
    g.gecikme = 5
    const akis = new GomuAkis(depo, g)
    const is = akis.calistir()
    setTimeout(() => akis.dur(), 8)
    await is
    const yarida = (await depo.gomuDurum(g.kimlik)).bekleyen
    expect(yarida).toBeGreaterThan(0)
    expect(yarida).toBeLessThan(24)

    g.gecikme = 0
    await akis.calistir()
    expect((await depo.gomuDurum(g.kimlik)).bekleyen).toBe(0)
  })

  it('gömücü hata verirse durum bunu taşıyor, iş sessizce ölmüyor', async () => {
    await kayitAc('kayıt')
    const bozuk: Gomucu = {
      kimlik: 'bozuk@v1',
      boyut: 16,
      goc: () => Promise.reject(new Error('model indirilemedi')),
    }
    const akis = new GomuAkis(depo, bozuk)
    await akis.calistir()
    expect(akis.durum.hata).toContain('model indirilemedi')
    expect(akis.durum.calisiyor).toBe(false)
  })

  it('kayıt silinince vektörü de gidiyor', async () => {
    const k = await kayitAc('silinecek')
    const g = sahteGomucu()
    await new GomuAkis(depo, g).calistir()
    await depo.kayitSil(k.id)
    expect((await depo.gomular(g.kimlik)).size).toBe(0)
  })

  it('kapatınca bütün vektörler siliniyor', async () => {
    for (let i = 0; i < 3; i++) await kayitAc('kayıt ' + i, `0${i}:00`)
    const g = sahteGomucu()
    await new GomuAkis(depo, g).calistir()
    await depo.gomulariSil()
    expect((await depo.gomular(g.kimlik)).size).toBe(0)
  })

  it('gömülen vektörler anlamlı benzerlik veriyor', async () => {
    const a = await kayitAc('kerem aradı konuştuk', '09:00')
    await kayitAc('tez teslim edildi', '10:00')
    const g = sahteGomucu()
    await new GomuAkis(depo, g).calistir()
    const indeks = await depo.gomular(g.kimlik)
    const [sorgu] = await g.goc(['kerem aradı konuştuk'])
    const v = paketiAc(paketle(sorgu!))!
    const puanlar = [...indeks].map(([id, k]) => [id, benzerlik(v, paketiAc(k)!)] as const)
    const enIyi = puanlar.sort((x, y) => y[1] - x[1])[0]!
    expect(enIyi[0]).toBe(a.id)
    expect(enIyi[1]).toBeGreaterThan(0.9)
  })
})
