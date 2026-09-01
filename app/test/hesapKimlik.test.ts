import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ac, kapat, rastgele } from '../src/cekirdek/gizle.js'
import { kurtarmaCoz, kurtarmaUret, kurtarmaYaz } from '../src/cekirdek/kurtarma.js'
import {
  EN_AZ_AD,
  EN_AZ_SIFRE,
  adiNormalize,
  hesapBicimi,
  hesapKimligiTuret,
} from '../src/cekirdek/hesapKimlik.js'

/**
 * HESAP KİMLİĞİ — "her cihazdan ulaşırım" sözünün taşıyıcı direği.
 *
 * Söz şu: aynı ad ve şifre, hangi cihazda yazılırsa yazılsın, AYNI
 * hesabı veriyor; ve ne ad ne şifre sunucuya gidiyor
 * (KARARLAR.md · K-039).
 */

const HIZLI = { t: 1, m: 1024, p: 1 }
const AD = 'furkan'
const SIFRE = 'bu-uzun-bir-hesap-sifresi'
const turet = (a: string, s: string) => hesapKimligiTuret(a, s, HIZLI)

describe('türetme kararlı', () => {
  it('aynı ad ve şifre hep aynı kimliği veriyor', async () => {
    const a = (await turet(AD, SIFRE))!
    const b = (await turet(AD, SIFRE))!
    expect(a.kimlik).toBe(b.kimlik)
    expect(a.parola).toBe(b.parola)
  })

  it('ad değişince kimlik değişiyor', async () => {
    const a = (await turet(AD, SIFRE))!
    const b = (await turet('baskaad', SIFRE))!
    expect(a.kimlik).not.toBe(b.kimlik)
  })

  it('şifre değişince kimlik değişiyor — aynı ad BAŞKA hesap', async () => {
    /*
     * Kimlik ikisinden birden türüyor. Bunun iki sonucu var: ad
     * benzersizliği diye bir sorun yok, ve yanlış şifre "yanlış şifre"
     * değil "böyle bir hesap yok" demek.
     */
    const a = (await turet(AD, SIFRE))!
    const b = (await turet(AD, SIFRE + 'x'))!
    expect(a.kimlik).not.toBe(b.kimlik)
  })

  it('e-posta hiçbir yere ulaşmayan alan adında', async () => {
    const k = (await turet(AD, SIFRE))!
    expect(k.eposta).toBe(`${k.kimlik}@defter.invalid`)
  })
})

describe('ad normalizasyonu — cihazlar arası tuzak', () => {
  it('boşluk ve büyük harf aynı hesaba çıkıyor', async () => {
    const a = (await turet('  Furkan  ', SIFRE))!
    const b = (await turet('furkan', SIFRE))!
    expect(a.kimlik).toBe(b.kimlik)
  })

  it('Türkçe yerel kimliği DEĞİŞTİRMİYOR', async () => {
    /*
     * Asıl tuzak bu. `toLocaleLowerCase` Türkçe yerelde "ALI" → "alı",
     * İngilizcede "ali" verirdi; aynı kullanıcı iki cihazda iki ayrı
     * hesaba düşerdi ve defterini bulamazdı. `toLowerCase` yerelden
     * bağımsız.
     */
    expect(adiNormalize('ALI')).toBe('ali')
    expect(adiNormalize('ALI')).not.toBe('alı')
    expect('ALI'.toLocaleLowerCase('tr')).toBe('alı')
  })

  it('kaynakta toLocaleLowerCase yok', () => {
    /*
     * Yukarıdaki davranışı KODUN koruduğunu sabitliyor.
     *
     * Yorumlar atılıyor: `hesapKimlik.ts`in yorumu tam da kullanılmayan
     * o çağrıyı ANLATIYOR ve tarama ona takılırdı. Aynı hata bu projede
     * `vekil.test.ts`te de yapılmıştı.
     */
    const kaynak = readFileSync(
      new URL('../src/cekirdek/hesapKimlik.ts', import.meta.url),
      'utf8',
    )
    const kod = kaynak.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
    expect(kod).not.toContain('toLocaleLowerCase')
    expect(kod).toContain("normalize('NFKC')")
  })

  it('farklı kodlanmış aynı ad tek biçime iniyor', () => {
    /* Birleşik ve ayrık aksan: görsel olarak aynı, baytça değil. */
    expect(adiNormalize('ömer')).toBe(adiNormalize('o\u0308mer'))
  })
})

describe('kabul edilmeyen girdiler', () => {
  it('kısa şifre null', async () => {
    expect(await turet(AD, 'a'.repeat(EN_AZ_SIFRE - 1))).toBeNull()
  })

  it('kısa ad null', async () => {
    expect(await turet('a'.repeat(EN_AZ_AD - 1), SIFRE)).toBeNull()
  })

  it('yalnızca boşluktan oluşan ad null', async () => {
    expect(await turet('    ', SIFRE)).toBeNull()
  })

  it('biçim denetimi türetmeyle aynı şeyi söylüyor', async () => {
    for (const [a, s] of [
      [AD, SIFRE],
      ['', SIFRE],
      [AD, 'kisa'],
    ] as [string, string][])
      expect(hesapBicimi(a, s)).toBe((await turet(a, s)) !== null)
  })
})

describe('sunucuya giden şey', () => {
  it('kimlikte ne ad ne şifre geçiyor', async () => {
    const k = (await turet(AD, SIFRE))!
    const hepsi = `${k.kimlik} ${k.eposta} ${k.parola}`
    expect(hepsi).not.toContain(AD)
    for (const parca of ['uzun', 'hesap', 'sifresi']) expect(hepsi).not.toContain(parca)
  })

  it('kimlik ve şifre alanı aynı değer değil', async () => {
    const k = (await turet(AD, SIFRE))!
    expect(k.kimlik).not.toBe(k.parola)
  })
})

describe('kasanın içi — kod gidip geliyor', () => {
  it('hesap anahtarıyla sarmalanan Defter Kimliği aynen dönüyor', async () => {
    const kod = kurtarmaUret()
    const k = (await turet(AD, SIFRE))!
    const kapali = await kapat(kurtarmaCoz(kod)!, k.sifre)
    const geri = await ac(kapali, (await turet(AD, SIFRE))!.sifre)
    expect(kurtarmaYaz(geri)).toBe(kod)
  })

  it('başka şifre kasayı açmıyor', async () => {
    const kapali = await kapat(rastgele(16), (await turet(AD, SIFRE))!.sifre)
    await expect(ac(kapali, (await turet(AD, SIFRE + 'x'))!.sifre)).rejects.toThrow()
  })

  it('başka ad kasayı açmıyor', async () => {
    const kapali = await kapat(rastgele(16), (await turet(AD, SIFRE))!.sifre)
    await expect(ac(kapali, (await turet('baskaad', SIFRE))!.sifre)).rejects.toThrow()
  })
})
