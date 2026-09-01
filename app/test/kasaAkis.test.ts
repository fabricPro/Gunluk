import { describe, expect, it } from 'vitest'
import { kurtarmaUret } from '../src/cekirdek/kurtarma.js'
import type { KasaKimlik } from '../src/cekirdek/kasaKimlik.js'
import type { KasaSatir } from '../src/veri/senkronDepo.js'
import { kasaTasi, kasadanKurtar, kasayaYaz, type KasaSunucu } from '../src/kasaAkis.js'

/**
 * KASA AKIŞI — kurtarmanın tam turu, ağsız.
 *
 * Sorduğu tek soru: tarayıcıdaki her şey silindikten sonra, elde
 * YALNIZCA parola varken Defter Kimliği geri geliyor mu — ve yanlış
 * parola sessizce boş bir şey vermiyor mu (KARARLAR.md · K-038).
 */

const HIZLI = { t: 1, m: 1024, p: 1 }
const PAROLA = 'bu-uzun-bir-kurtarma-parolasi'
const YENI = 'bambaska-ve-yine-uzun-parola'

/** Bellekte duran sunucu: hesap kimliği → satır. */
class SahteKasa {
  readonly satirlar = new Map<string, KasaSatir>()
  silinenler: string[] = []

  yapici =
    (kimlik: KasaKimlik): KasaSunucu => ({
      oku: async () => this.satirlar.get(kimlik.kimlik) ?? null,
      yaz: async (s) => void this.satirlar.set(kimlik.kimlik, s),
      sil: async () => {
        this.silinenler.push(kimlik.kimlik)
        this.satirlar.delete(kimlik.kimlik)
      },
    })
}

describe('yaz → kurtar', () => {
  it('yalnızca parolayla kod geri geliyor', async () => {
    const s = new SahteKasa()
    const kod = kurtarmaUret()
    expect(await kasayaYaz(PAROLA, kod, s.yapici, HIZLI)).toBe(true)
    expect(await kasadanKurtar(PAROLA, s.yapici, HIZLI)).toBe(kod)
  })

  it('kasa bir tek satır tutuyor — iki yazma birikmiyor', async () => {
    const s = new SahteKasa()
    await kasayaYaz(PAROLA, kurtarmaUret(), s.yapici, HIZLI)
    const kod = kurtarmaUret()
    await kasayaYaz(PAROLA, kod, s.yapici, HIZLI)
    expect(s.satirlar.size).toBe(1)
    expect(await kasadanKurtar(PAROLA, s.yapici, HIZLI)).toBe(kod)
  })
})

describe('açılmayan durumlar — hepsi null, hiçbiri boş defter değil', () => {
  it('yanlış parola null', async () => {
    const s = new SahteKasa()
    await kasayaYaz(PAROLA, kurtarmaUret(), s.yapici, HIZLI)
    expect(await kasadanKurtar(YENI, s.yapici, HIZLI)).toBeNull()
  })

  it('hiç kasa yokken null', async () => {
    expect(await kasadanKurtar(PAROLA, new SahteKasa().yapici, HIZLI)).toBeNull()
  })

  it('kısa parola null — ne yazıyor ne kurtarıyor', async () => {
    const s = new SahteKasa()
    expect(await kasayaYaz('kisa', kurtarmaUret(), s.yapici, HIZLI)).toBe(false)
    expect(s.satirlar.size).toBe(0)
    expect(await kasadanKurtar('kisa', s.yapici, HIZLI)).toBeNull()
  })

  it('geçersiz kod yazılmıyor', async () => {
    const s = new SahteKasa()
    expect(await kasayaYaz(PAROLA, 'BU-BIR-KOD-DEGIL', s.yapici, HIZLI)).toBe(false)
    expect(s.satirlar.size).toBe(0)
  })

  it('oynanmış gövde null — çökme değil', async () => {
    const s = new SahteKasa()
    await kasayaYaz(PAROLA, kurtarmaUret(), s.yapici, HIZLI)
    const [ad, satir] = [...s.satirlar.entries()][0]!
    const ilk = satir.govde[0] === 'A' ? 'B' : 'A'
    s.satirlar.set(ad, { ...satir, govde: ilk + satir.govde.slice(1) })
    expect(await kasadanKurtar(PAROLA, s.yapici, HIZLI)).toBeNull()
  })
})

describe('sunucuda duran şey', () => {
  it('kasa satırında kod açık geçmiyor', async () => {
    const s = new SahteKasa()
    const kod = kurtarmaUret()
    await kasayaYaz(PAROLA, kod, s.yapici, HIZLI)
    const ham = JSON.stringify([...s.satirlar.entries()])
    expect(ham.length).toBeGreaterThan(60)
    expect(ham).not.toContain(kod)
    expect(ham).not.toContain(kod.replace(/-/g, ''))
  })

  it('satır yalnızca iv ve gövde taşıyor — fazladan üstveri yok', async () => {
    const s = new SahteKasa()
    await kasayaYaz(PAROLA, kurtarmaUret(), s.yapici, HIZLI)
    expect(Object.keys([...s.satirlar.values()][0]!).sort()).toEqual(['govde', 'iv'])
  })

  it('parolanın kendisi hiçbir yerde geçmiyor', async () => {
    const s = new SahteKasa()
    await kasayaYaz(PAROLA, kurtarmaUret(), s.yapici, HIZLI)
    const ham = JSON.stringify([...s.satirlar.entries()])
    expect(ham).not.toContain(PAROLA)
    for (const parca of ['kurtarma', 'parolasi', 'uzun']) expect(ham).not.toContain(parca)
  })
})

describe('parola değişimi', () => {
  it('yeni parola açıyor, eski açmıyor', async () => {
    const s = new SahteKasa()
    const kod = kurtarmaUret()
    await kasayaYaz(PAROLA, kod, s.yapici, HIZLI)

    expect(await kasaTasi(PAROLA, YENI, kod, s.yapici, HIZLI)).toBe(true)
    expect(await kasadanKurtar(YENI, s.yapici, HIZLI)).toBe(kod)
    expect(await kasadanKurtar(PAROLA, s.yapici, HIZLI)).toBeNull()
  })

  it('eski satır gerçekten siliniyor — geride şifreli çöp kalmıyor', async () => {
    const s = new SahteKasa()
    const kod = kurtarmaUret()
    await kasayaYaz(PAROLA, kod, s.yapici, HIZLI)
    await kasaTasi(PAROLA, YENI, kod, s.yapici, HIZLI)
    expect(s.satirlar.size).toBe(1)
    expect(s.silinenler).toHaveLength(1)
  })

  it('yeni parola kısaysa eski kasaya DOKUNULMUYOR', async () => {
    /*
     * Sıra bağlayıcı: önce yaz, sonra sil. Ters olsaydı burada kullanıcı
     * hem eski hem yeni kasasız kalırdı.
     */
    const s = new SahteKasa()
    const kod = kurtarmaUret()
    await kasayaYaz(PAROLA, kod, s.yapici, HIZLI)
    expect(await kasaTasi(PAROLA, 'kisa', kod, s.yapici, HIZLI)).toBe(false)
    expect(await kasadanKurtar(PAROLA, s.yapici, HIZLI)).toBe(kod)
    expect(s.silinenler).toHaveLength(0)
  })

  it('eski kasa silinemese bile yeni kasa çalışıyor', async () => {
    const s = new SahteKasa()
    const kod = kurtarmaUret()
    await kasayaYaz(PAROLA, kod, s.yapici, HIZLI)
    const bozuk = (k: KasaKimlik) => ({
      ...s.yapici(k),
      sil: () => Promise.reject(new Error('ağ')),
    })
    expect(await kasaTasi(PAROLA, YENI, kod, bozuk, HIZLI)).toBe(true)
    expect(await kasadanKurtar(YENI, s.yapici, HIZLI)).toBe(kod)
  })
})
