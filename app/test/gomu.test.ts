import { describe, expect, it } from 'vitest'
import { benzerlik, enYakinlar, normalize, paketiAc, paketle } from '../src/cekirdek/gomu.js'

const v = (...x: number[]) => new Float32Array(x)
const kur = (...x: number[]) => paketiAc(paketle(v(...x)))!

describe('gömü · niceleme', () => {
  it('gidiş-dönüş yönü koruyor', () => {
    const a = kur(1, 0, 0)
    const b = kur(1, 0, 0)
    expect(benzerlik(a, b)).toBeCloseTo(1, 2)
  })

  it('dik vektörler sıfıra yakın', () => {
    expect(benzerlik(kur(1, 0, 0), kur(0, 1, 0))).toBeCloseTo(0, 2)
  })

  it('ters vektörler -1', () => {
    expect(benzerlik(kur(1, 0, 0), kur(-1, 0, 0))).toBeCloseTo(-1, 2)
  })

  it('uzunluk fark etmiyor — normalize ediliyor', () => {
    /* Aynı yön, farklı boy: kosinüs 1 olmalı. */
    expect(benzerlik(kur(3, 4, 0), kur(30, 40, 0))).toBeCloseTo(1, 2)
  })

  it('niceleme hata payı retrieval için yeterli', () => {
    /* Rastgele 384 boyutlu vektörlerde nicelenmiş kosinüs, gerçeğine yakın. */
    const rast = () => {
      const a = new Float32Array(384)
      for (let i = 0; i < 384; i++) a[i] = Math.random() * 2 - 1
      return a
    }
    for (let d = 0; d < 20; d++) {
      const a = rast()
      const b = rast()
      const na = normalize(a)
      const nb = normalize(b)
      let gercek = 0
      for (let i = 0; i < 384; i++) gercek += na[i]! * nb[i]!
      const nicel = benzerlik(paketiAc(paketle(a))!, paketiAc(paketle(b))!)
      expect(Math.abs(nicel - gercek)).toBeLessThan(0.02)
    }
  })

  it('sıfır vektör çökmüyor', () => {
    expect(() => paketle(v(0, 0, 0))).not.toThrow()
    expect(benzerlik(kur(0, 0, 0), kur(1, 0, 0))).toBe(0)
  })

  it('bozuk paket null dönüyor', () => {
    expect(paketiAc('bu base64 değil!!!')).toBeNull()
  })

  /* Farklı modellerin vektörleri karşılaştırılamaz; boy tutmazsa 0. */
  it('boyları tutmayan vektörler eşleşmiyor', () => {
    expect(benzerlik(kur(1, 0, 0), kur(1, 0, 0, 0))).toBe(0)
  })

  it('384 boyut 512 base64 karakter', () => {
    const a = new Float32Array(384)
    a[0] = 1
    expect(paketle(a)).toHaveLength(512)
  })
})

describe('gömü · en yakınlar', () => {
  const indeks: [string, Int8Array][] = [
    ['aynı', kur(1, 0, 0)],
    ['yakın', kur(0.9, 0.2, 0)],
    ['dik', kur(0, 1, 0)],
    ['ters', kur(-1, 0, 0)],
  ]

  it('eşiği geçenleri puan sırasında veriyor', () => {
    const y = enYakinlar(kur(1, 0, 0), indeks)
    expect(y.map((x) => x.kayitId)).toEqual(['aynı', 'yakın'])
    expect(y[0]!.puan).toBeGreaterThan(y[1]!.puan)
  })

  it('sınırı aşmıyor', () => {
    expect(enYakinlar(kur(1, 0, 0), indeks, { esik: -1, sinir: 2 })).toHaveLength(2)
  })

  it('boş indekste boş dönüyor', () => {
    expect(enYakinlar(kur(1, 0, 0), [])).toEqual([])
  })

  it('hiçbiri eşiği geçmezse boş', () => {
    expect(enYakinlar(kur(0, 0, 1), indeks)).toEqual([])
  })
})
