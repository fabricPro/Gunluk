import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { onaltilikYaz, rastgele } from '../src/cekirdek/gizle.js'
import { anahtariDayat } from '../src/veri/kripto.js'
import { SENKRON_KODU, tarayiciAnahtarDepo } from '../src/veri/anahtarDepo.js'

/**
 * TARAYICIDA SAKLANAN SIRLAR.
 *
 * Defter Kimliği ve Anthropic anahtarı eskiden localStorage'ta DÜZ METİN
 * duruyordu; ayar kağıdı bunu "korumasız" diye söylüyordu (K-013).
 * Artık ikisi de kilidin ana anahtarıyla mühürlü (KARARLAR.md · K-037).
 *
 * Buradaki söz iki cümle: değer diskte açık durmuyor, ve kilitliyken
 * okunmuyor.
 */

const KOD = 'BU-BIR-DEFTER-KIMLIGI-9c41f7ab-DISARI-CIKMAMALI'

let saklanan: Map<string, string>

beforeEach(() => {
  saklanan = new Map()
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (a: string) => saklanan.get(a) ?? null,
    setItem: (a: string, d: string) => void saklanan.set(a, d),
    removeItem: (a: string) => void saklanan.delete(a),
  }
  anahtariDayat(onaltilikYaz(rastgele(32)))
})

afterEach(() => {
  anahtariDayat(null)
  delete (globalThis as { localStorage?: unknown }).localStorage
})

describe('gidiş-dönüş', () => {
  it('yazılan değer aynen okunuyor', async () => {
    const depo = tarayiciAnahtarDepo(SENKRON_KODU)
    await depo.yaz(KOD)
    expect(await depo.oku()).toBe(KOD)
  })

  it('silinince yok', async () => {
    const depo = tarayiciAnahtarDepo(SENKRON_KODU)
    await depo.yaz(KOD)
    await depo.sil()
    expect(await depo.oku()).toBeNull()
  })
})

describe('diskte açık durmuyor', () => {
  it('saklanan dizede Defter Kimliği geçmiyor', async () => {
    await tarayiciAnahtarDepo(SENKRON_KODU).yaz(KOD)
    const ham = saklanan.get(SENKRON_KODU)!
    expect(ham.length).toBeGreaterThan(20)
    expect(ham).not.toContain(KOD)
    /* base64 çözülünce de görünmesin. */
    expect(atob(ham)).not.toContain(KOD)
  })

  it('aynı değer iki kez yazılınca farklı çıkıyor', async () => {
    const depo = tarayiciAnahtarDepo(SENKRON_KODU)
    await depo.yaz(KOD)
    const a = saklanan.get(SENKRON_KODU)
    await depo.yaz(KOD)
    expect(saklanan.get(SENKRON_KODU)).not.toBe(a)
  })
})

describe('kilitliyken okunmuyor', () => {
  it('ana anahtar bellekte yoksa null', async () => {
    const depo = tarayiciAnahtarDepo(SENKRON_KODU)
    await depo.yaz(KOD)
    anahtariDayat(null)
    expect(await depo.oku()).toBeNull()
  })

  it('kilitliyken yazmak da olmuyor', async () => {
    anahtariDayat(null)
    await expect(tarayiciAnahtarDepo(SENKRON_KODU).yaz(KOD)).rejects.toThrow()
  })

  it('başka bir ana anahtar açmıyor', async () => {
    const depo = tarayiciAnahtarDepo(SENKRON_KODU)
    await depo.yaz(KOD)
    anahtariDayat(onaltilikYaz(rastgele(32)))
    expect(await depo.oku()).toBeNull()
  })
})

describe('sarmalamadan önce yazılmış düz değerler', () => {
  it('kaybolmuyor — okunuyor', async () => {
    /* Kullanıcının Defter Kimliği bir sürüm yükseltmesinde yok olamaz. */
    saklanan.set(SENKRON_KODU, KOD)
    expect(await tarayiciAnahtarDepo(SENKRON_KODU).oku()).toBe(KOD)
  })

  it('okunduktan sonra düz kopya kalmıyor', async () => {
    saklanan.set(SENKRON_KODU, KOD)
    const depo = tarayiciAnahtarDepo(SENKRON_KODU)
    await depo.oku()
    expect(saklanan.get(SENKRON_KODU)).not.toBe(KOD)
    expect(saklanan.get(SENKRON_KODU)).not.toContain(KOD)
    /* Ve mühürlendikten sonra hâlâ doğru okunuyor. */
    expect(await depo.oku()).toBe(KOD)
  })

  it('base64 gibi görünen düz değer de doğru anlaşılıyor', async () => {
    /*
     * Anthropic anahtarları `sk-ant-...`; base64 olarak çözülebilen ama
     * bizim mührümüz OLMAYAN bir dize sarmalanmış sanılmamalı.
     */
    const dizi = 'c2stYW50LXRlc3Q='
    saklanan.set(SENKRON_KODU, dizi)
    expect(await tarayiciAnahtarDepo(SENKRON_KODU).oku()).toBe(dizi)
  })
})
