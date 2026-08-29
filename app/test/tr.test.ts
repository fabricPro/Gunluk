import { describe, expect, it } from 'vitest'
import {
  ayEk, bas, belirtme, bulunma, dahiEki, gunAdi, sayiEk, sonSozcuk, tamTarih, tamlayan,
} from '../src/cekirdek/tr.js'

describe('sonSozcuk', () => {
  it('sayının okunuşundaki son sözcüğü verir', () => {
    expect(sonSozcuk(2026)).toBe('altı')
    expect(sonSozcuk(2030)).toBe('otuz')
    expect(sonSozcuk(2020)).toBe('yirmi')
    expect(sonSozcuk(2000)).toBe('bin')
    expect(sonSozcuk(100)).toBe('yüz')
    expect(sonSozcuk(0)).toBe('sıfır')
  })
})

describe('ayEk', () => {
  it('yılın okunuşuna göre bulunma eki alır', () => {
    expect(ayEk('2026-03')).toBe("mart 2026'da")
    expect(ayEk('2025-02')).toBe("şubat 2025'te")
    expect(ayEk('2020-08')).toBe("ağustos 2020'de")
  })
  it('son rakama bakan tablonun hata yaptığı yılları doğru yazar', () => {
    /* son rakam 0: 2020 "yirmi" -> de, 2030 "otuz" -> da */
    expect(ayEk('2030-01')).toBe("ocak 2030'da")
    expect(ayEk('2040-01')).toBe("ocak 2040'ta")
  })
})

describe('sayiEk', () => {
  it('belirtme/iyelik ekini okunuşa göre seçer', () => {
    expect(sayiEk(1)).toBe("1'i")
    expect(sayiEk(3)).toBe("3'ü")
    expect(sayiEk(6)).toBe("6'sı")
    expect(sayiEk(12)).toBe("12'si")
    expect(sayiEk(10)).toBe("10'u")
    expect(sayiEk(45)).toBe("45'i")
  })
})

describe('hâl ekleri', () => {
  it('bulunma', () => {
    expect(bulunma('mart')).toBe('martta')
    expect(bulunma('haziran')).toBe('haziranda')
    expect(bulunma('ev')).toBe('evde')
  })
  it('belirtme', () => {
    expect(belirtme('kerem')).toBe('keremi')
    expect(belirtme('ece')).toBe('ecey' + 'i')
  })
  it('tamlayan — PROJE.md §7de eksik olduğu not edilen ilgi hâli', () => {
    expect(tamlayan('kerem')).toBe('keremin')
    expect(tamlayan('kerem', true)).toBe("kerem'in")
    expect(tamlayan('ece', true)).toBe("ece'nin")
    expect(tamlayan('annem')).toBe('annemin')
    expect(tamlayan('uyku')).toBe('uykunun')
  })
})

describe('tarih', () => {
  it('okunur biçim', () => {
    expect(tamTarih('2026-08-28')).toBe('28 ağustos 2026')
    expect(gunAdi('2026-08-28')).toBe('cuma')
  })
  it('bas Türkçe büyük harf kuralına uyar', () => {
    expect(bas('istanbul')).toBe('İstanbul')
    expect(bas('ağustos')).toBe('Ağustos')
  })
})

describe('bağlaç "de/da"', () => {
  it('ünlü uyumuna uyuyor', () => {
    expect(dahiEki('1 kenar notu')).toBe('da')
    expect(dahiEki('bir ek')).toBe('de')
    expect(dahiEki('kitap')).toBe('da')
    expect(dahiEki('defter')).toBe('de')
  })

  /* Bağlaç sertleşmez: "kitap ta" değil "kitap da". */
  it('sert ünsüzden sonra bile d ile başlıyor', () => {
    expect(dahiEki('mülakat')).toBe('da')
    expect(dahiEki('süt')).toBe('de')
  })
})
