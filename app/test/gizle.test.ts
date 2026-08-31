import { describe, expect, it } from 'vitest'
import {
  ac,
  aesAnahtar,
  ayristir,
  b64Oku,
  b64Yaz,
  kapat,
  onaltilikOku,
  onaltilikYaz,
  rastgele,
  yavasTuret,
} from '../src/veri/gizle.js'

/**
 * Ortak kripto sarmalayıcısı.
 *
 * `kilit.ts` ve `yedek.ts` bunun iki ayrı kopyasını taşıyordu; senkron
 * üçüncüsü olmasın diye tek yere çıkarıldı (KARARLAR.md · K-036).
 */

const HIZLI = { t: 1, m: 1024, p: 1 }

describe('bayt yardımcıları', () => {
  it('onaltılık gidiş-dönüş', () => {
    const b = rastgele(32)
    expect(onaltilikOku(onaltilikYaz(b))).toEqual(b)
  })

  it('base64 gidiş-dönüş — 0 ve 255 dahil', () => {
    const b = new Uint8Array([0, 1, 127, 128, 254, 255])
    expect(b64Oku(b64Yaz(b))).toEqual(b)
  })

  it('rastgele gerçekten değişiyor', () => {
    expect(onaltilikYaz(rastgele(16))).not.toBe(onaltilikYaz(rastgele(16)))
  })
})

describe('AES-GCM', () => {
  it('şifrele → çöz aynı baytları veriyor', async () => {
    const k = await aesAnahtar(rastgele(32))
    const veri = new TextEncoder().encode('kimseye söylemediğim şey')
    expect(new Uint8Array(await ac(await kapat(veri, k), k))).toEqual(veri)
  })

  it('IV her çağrıda yeni — aynı metin iki farklı şifreli veriyor', async () => {
    const k = await aesAnahtar(rastgele(32))
    const veri = new TextEncoder().encode('aynı metin')
    const a = await kapat(veri, k)
    const b = await kapat(veri, k)
    expect(a.iv).not.toBe(b.iv)
    expect(a.govde).not.toBe(b.govde)
  })

  it('yanlış anahtar çözemiyor', async () => {
    const k1 = await aesAnahtar(rastgele(32))
    const k2 = await aesAnahtar(rastgele(32))
    const kapali = await kapat(new TextEncoder().encode('gizli'), k1)
    await expect(ac(kapali, k2)).rejects.toThrow()
  })

  it('oynanmış gövde çözülmüyor — GCM etiketi tutuyor', async () => {
    const k = await aesAnahtar(rastgele(32))
    const kapali = await kapat(new TextEncoder().encode('gizli'), k)
    const bozuk = b64Oku(kapali.govde)
    bozuk[0] = bozuk[0]! ^ 1
    await expect(ac({ ...kapali, govde: b64Yaz(bozuk) }, k)).rejects.toThrow()
  })
})

describe('yavaş türetme (Argon2id)', () => {
  it('aynı sır + aynı tuz = aynı anahtar', async () => {
    const tuz = rastgele(16)
    const a = await yavasTuret('123456', tuz, HIZLI)
    const b = await yavasTuret('123456', tuz, HIZLI)
    expect(a).toEqual(b)
  })

  it('tuz değişince anahtar değişiyor', async () => {
    const a = await yavasTuret('123456', rastgele(16), HIZLI)
    const b = await yavasTuret('123456', rastgele(16), HIZLI)
    expect(a).not.toEqual(b)
  })
})

describe('ayrıştırma (HKDF)', () => {
  const kok = rastgele(32)

  it('aynı kök + aynı etiket = aynı anahtar', async () => {
    expect(await ayristir(kok, 'a')).toEqual(await ayristir(kok, 'a'))
  })

  it('farklı etiket = bağımsız anahtar', async () => {
    const a = await ayristir(kok, 'defter/senkron/kimlik')
    const b = await ayristir(kok, 'defter/senkron/sifre')
    expect(a).not.toEqual(b)
    /* Ortak önek yok — biri sızsa diğeri hakkında bilgi vermiyor. */
    expect(a[0] === b[0] && a[1] === b[1] && a[2] === b[2]).toBe(false)
  })

  it('kök değişince hepsi değişiyor', async () => {
    expect(await ayristir(kok, 'x')).not.toEqual(await ayristir(rastgele(32), 'x'))
  })

  it('istenen uzunlukta dönüyor', async () => {
    expect((await ayristir(kok, 'x', 16)).length).toBe(16)
    expect((await ayristir(kok, 'x', 64)).length).toBe(64)
  })
})
