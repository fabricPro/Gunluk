import { describe, expect, it } from 'vitest'
import {
  KOD_UZUNLUK,
  bicimle,
  kurtarmaCoz,
  kurtarmaGecerli,
  kurtarmaUret,
  normalize,
} from '../src/cekirdek/kurtarma.js'

describe('kurtarma kodu', () => {
  it('üretilen kod çözülebiliyor', () => {
    for (let i = 0; i < 50; i++) {
      const kod = kurtarmaUret()
      expect(kurtarmaCoz(kod)).not.toBeNull()
      expect(kurtarmaCoz(kod)).toHaveLength(16)
    }
  })

  it('her kod farklı', () => {
    const s = new Set(Array.from({ length: 200 }, () => kurtarmaUret()))
    expect(s.size).toBe(200)
  })

  it('okunur biçimde: dörtlü öbekler', () => {
    const kod = kurtarmaUret()
    expect(kod).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{2,4}){6}$/)
    expect(normalize(kod)).toHaveLength(KOD_UZUNLUK)
  })

  it('karışan harfler sessizce düzeltiliyor: I ve L → 1, O → 0', () => {
    const kod = kurtarmaUret()
    const bozuk = kod.replace(/1/g, 'I').replace(/0/g, 'O')
    expect(kurtarmaCoz(bozuk)).toEqual(kurtarmaCoz(kod))
    const bozuk2 = kod.replace(/1/g, 'l')
    expect(kurtarmaCoz(bozuk2)).toEqual(kurtarmaCoz(kod))
  })

  it('küçük harf, boşluk ve farklı ayraçlar sorun değil', () => {
    const kod = kurtarmaUret()
    expect(kurtarmaCoz(kod.toLowerCase())).toEqual(kurtarmaCoz(kod))
    expect(kurtarmaCoz(kod.replace(/-/g, ' '))).toEqual(kurtarmaCoz(kod))
    expect(kurtarmaCoz(kod.replace(/-/g, ''))).toEqual(kurtarmaCoz(kod))
    expect(kurtarmaCoz('  ' + kod + '  ')).toEqual(kurtarmaCoz(kod))
  })

  it('tek karakter yanlışsa sağlamaya takılıyor', () => {
    let yakalanan = 0
    let denenen = 0
    for (let n = 0; n < 60; n++) {
      const kod = normalize(kurtarmaUret())
      for (let i = 0; i < 3; i++) {
        const yer = Math.floor(Math.random() * kod.length)
        const yeni = kod[yer] === '2' ? '3' : '2'
        const bozuk = kod.slice(0, yer) + yeni + kod.slice(yer + 1)
        if (bozuk === kod) continue
        denenen++
        if (kurtarmaCoz(bozuk) === null) yakalanan++
      }
    }
    /* Sağlama 10 bit: hataların en az %99'u yakalanmalı. */
    expect(yakalanan / denenen).toBeGreaterThan(0.99)
  })

  it('eksik ya da fazla karakter reddediliyor', () => {
    const kod = normalize(kurtarmaUret())
    expect(kurtarmaCoz(kod.slice(0, -1))).toBeNull()
    expect(kurtarmaCoz(kod + '7')).toBeNull()
    expect(kurtarmaCoz('')).toBeNull()
  })

  it('alfabede olmayan harfler kod uzunluğunu bozuyor, kabul edilmiyor', () => {
    expect(kurtarmaGecerli('UUUU-UUUU-UUUU-UUUU-UUUU-UUUU-UUUU')).toBe(false)
  })

  it('bicimle boş girdiyle çökmüyor', () => {
    expect(bicimle('')).toBe('')
  })
})
