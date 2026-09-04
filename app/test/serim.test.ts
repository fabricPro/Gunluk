import { describe, expect, it } from 'vitest'
import { serimBasi } from '../src/cekirdek/sayfa.js'
import { Durum } from '../src/durum.js'
import type { Depo } from '../src/veri/depo.js'
import type { Sayfa } from '../src/cekirdek/tipler.js'

/**
 * SERİM — açık defterde aynı anda görünen sayfalar (KARARLAR.md · K-050).
 *
 * Buradaki asıl muhafız `aktifSayfa`nın normalleşmesi. İki sayfalı kipte
 * tek sayılı bir indeks etkin olursa çizim o sayfayı SOL yarıya koyar ve
 * bir öncekini hiç göstermez; son sayfaya yazarken de yazma alanı yanlış
 * yarıda kalır. Değer üç ayrı yerden yazılıyor ("bugüne dön", kayıt
 * bırakma, `yenile()` kırpması) — normalleştirmeyi çağıranlara bırakmak
 * birini unutmak demekti.
 */

/** `aktifSayfa` ayarlayıcısı depoya dokunmuyor; boş bir taklit yetiyor. */
const durumKur = (sayfaSayisi: number, sayfaBasi: 1 | 2): Durum => {
  const d = new Durum({} as Depo)
  d.sayfalar = Array.from({ length: sayfaSayisi }, (_, i) => ({ no: i + 1 }) as Sayfa)
  d.sayfaBasi = sayfaBasi
  return d
}

describe('serimBasi', () => {
  it('iki sayfalı serimde sol sayfa her zaman çift indeks', () => {
    expect(serimBasi(0, 2)).toBe(0)
    expect(serimBasi(1, 2)).toBe(0)
    expect(serimBasi(6, 2)).toBe(6)
    expect(serimBasi(7, 2)).toBe(6)
  })

  it('tek sayfalı kipte hiçbir şey değişmiyor', () => {
    for (const i of [0, 1, 7, 44]) expect(serimBasi(i, 1)).toBe(i)
  })

  it('bozuk girdi çökertmiyor', () => {
    expect(serimBasi(-3, 2)).toBe(0)
    expect(serimBasi(5, 0)).toBe(5)
  })
})

describe('aktifSayfa serimin başına normalleşiyor', () => {
  it('tek sayılı son sayfaya gidince serim çift indeksten başlıyor', () => {
    /* 8 sayfa → son sayfa 7 (tek). Serim 6-7 olmalı, 7-8 değil. */
    const d = durumKur(8, 2)
    d.aktifSayfa = d.sonSayfa
    expect(d.sonSayfa).toBe(7)
    /*
     * ASIL İDDİA. Normalleştirme kalkarsa burası 7 döner ve çizim
     * 7'yi sola, var olmayan 8'i sağa koyar: 6. sayfa hiç görünmez.
     */
    expect(d.aktifSayfa % d.sayfaBasi).toBe(0)
    expect(d.aktifSayfa).toBe(6)
    /* Son sayfa görünen aralıkta kalmalı — yazma alanı orada. */
    expect(d.gorunenSayfalar).toEqual([6, 7])
  })

  it('serim değişince eldeki indeks yeniden normalleşiyor', () => {
    /* Telefon yan çevrilince tek sayfadan iki sayfaya geçiliyor ve
       elde tek sayılı bir indeks kalabiliyor. */
    const d = durumKur(10, 1)
    d.aktifSayfa = 5
    expect(d.aktifSayfa).toBe(5)
    d.sayfaBasi = 2
    expect(d.aktifSayfa).toBe(4)
    expect(d.gorunenSayfalar).toEqual([4, 5])
  })

  it('tek sayfalı kipte görünen tek sayfa', () => {
    const d = durumKur(10, 1)
    d.aktifSayfa = 5
    expect(d.gorunenSayfalar).toEqual([5])
  })

  it('son serim yarım kalabiliyor — 7 sayfada 6 tek başına', () => {
    const d = durumKur(7, 2)
    d.aktifSayfa = 6
    expect(d.gorunenSayfalar).toEqual([6])
  })
})
