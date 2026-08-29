import { describe, expect, it } from 'vitest'
import {
  VARSAYILAN_PARAM,
  beklemeSuresi,
  denemeDurumu,
  hataIsle,
  hataSifirla,
  kilidiKur,
  onaltilikOku,
  onaltilikYaz,
  pinIleAc,
  yeniAnaAnahtar,
} from '../src/veri/kilit.js'

/* Testler hızlı kalsın diye hafif Argon2 parametreleri. */
const HIZLI = { t: 1, m: 1024, p: 1 }

describe('sarmalama', () => {
  it('doğru PIN ana anahtarı geri verir', async () => {
    const av = yeniAnaAnahtar()
    const { kayit } = await kilidiKur('123456', av, HIZLI)
    expect(await pinIleAc(kayit, '123456')).toBe(av)
  })

  it('yanlış PIN açamaz, null döner', async () => {
    const { kayit } = await kilidiKur('123456', yeniAnaAnahtar(), HIZLI)
    expect(await pinIleAc(kayit, '123457')).toBeNull()
    expect(await pinIleAc(kayit, '')).toBeNull()
    expect(await pinIleAc(kayit, '12345')).toBeNull()
  })

  it('alfanümerik parola da çalışır', async () => {
    const av = yeniAnaAnahtar()
    const { kayit } = await kilidiKur('uzun bir parola · şÇğİ', av, HIZLI)
    expect(await pinIleAc(kayit, 'uzun bir parola · şÇğİ')).toBe(av)
    expect(await pinIleAc(kayit, 'uzun bir parola')).toBeNull()
  })

  it('ana anahtar kayıtta AÇIK durmaz', async () => {
    const av = yeniAnaAnahtar()
    const { kayit } = await kilidiKur('123456', av, HIZLI)
    expect(JSON.stringify(kayit)).not.toContain(av)
  })

  it('her kurulumda tuz ve iv farklı — aynı PIN aynı sarmalı vermez', async () => {
    const av = yeniAnaAnahtar()
    const a = await kilidiKur('123456', av, HIZLI)
    const b = await kilidiKur('123456', av, HIZLI)
    expect(a.kayit.tuz).not.toBe(b.kayit.tuz)
    expect(a.kayit.iv).not.toBe(b.kayit.iv)
    expect(a.kayit.sarmal).not.toBe(b.kayit.sarmal)
  })

  it('kayıt sürümü ve parametreleri saklar — ileride ağırlaştırılabilsin', async () => {
    const { kayit } = await kilidiKur('123456', yeniAnaAnahtar(), HIZLI)
    expect(kayit.surum).toBe(1)
    expect(kayit.param).toEqual(HIZLI)
  })

  it('var olan defterin anahtarı korunur — kilit sonradan kurulabilir', async () => {
    const mevcut = yeniAnaAnahtar()
    const { kayit, anaAnahtar } = await kilidiKur('999999', mevcut, HIZLI)
    expect(anaAnahtar).toBe(mevcut)
    expect(await pinIleAc(kayit, '999999')).toBe(mevcut)
  })

  it('varsayılan parametreler ciddi bir maliyet taşıyor', () => {
    expect(VARSAYILAN_PARAM.m).toBeGreaterThanOrEqual(32768)
    expect(VARSAYILAN_PARAM.t).toBeGreaterThanOrEqual(2)
  })
})

describe('onaltılık dönüşüm', () => {
  it('gidiş dönüş bozulmaz', () => {
    const b = new Uint8Array([0, 1, 15, 16, 127, 128, 255])
    expect(onaltilikOku(onaltilikYaz(b))).toEqual(b)
  })
})

describe('deneme sınırlama', () => {
  it('ilk beş deneme serbest', () => {
    for (let h = 0; h < 5; h++) expect(beklemeSuresi(h)).toBe(0)
  })

  it('sonra bekleme artıyor', () => {
    expect(beklemeSuresi(5)).toBe(30_000)
    expect(beklemeSuresi(8)).toBe(120_000)
    expect(beklemeSuresi(12)).toBe(600_000)
    expect(beklemeSuresi(50)).toBe(600_000)
  })

  it('hata işlenince bekleme başlıyor', async () => {
    let { kayit } = await kilidiKur('123456', yeniAnaAnahtar(), HIZLI)
    const t = 1_000_000
    for (let i = 0; i < 5; i++) kayit = hataIsle(kayit, t)
    expect(kayit.hata).toBe(5)
    expect(denemeDurumu(kayit, t).acik).toBe(false)
    expect(denemeDurumu(kayit, t).kalan).toBe(30_000)
    expect(denemeDurumu(kayit, t + 30_000).acik).toBe(true)
  })

  it('doğru PIN sayacı sıfırlıyor', async () => {
    let { kayit } = await kilidiKur('123456', yeniAnaAnahtar(), HIZLI)
    kayit = hataIsle(kayit, 1000)
    kayit = hataSifirla(kayit)
    expect(kayit.hata).toBe(0)
    expect(denemeDurumu(kayit, 1000).acik).toBe(true)
  })

  it('sınırlama VERİ SİLMİYOR — yanlış PIN defteri yok edemez', async () => {
    const av = yeniAnaAnahtar()
    let { kayit } = await kilidiKur('123456', av, HIZLI)
    for (let i = 0; i < 40; i++) kayit = hataIsle(kayit, 1000)
    /* Kırk yanlış denemeden sonra bile doğru PIN hâlâ açıyor. */
    expect(await pinIleAc(kayit, '123456')).toBe(av)
  })
})
