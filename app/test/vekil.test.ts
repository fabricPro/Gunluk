import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { sunucuAyari } from '../src/veri/senkronDepo.js'

/**
 * VEKİLİN MUHAFIZI.
 *
 * Tarayıcıda senkron kendi kaynağımızdaki `/auth` ve `/rest`e konuşuyor;
 * o iki yol Neon'a `app/vercel.json` (üretim) ve `app/vite.config.ts`
 * (geliştirme) üzerinden taşınıyor. Üç yer de aynı öneki bilmek zorunda:
 * biri değişip diğerleri kalırsa senkron sessizce ölür — kullanıcı
 * "Sunucu şu an cevap vermiyor" görür ve sebebi hiçbir yerde yazmaz.
 *
 * Bu dosya o üç yeri birbirine bağlıyor (KARARLAR.md · K-037).
 */

const oku = (ad: string): string => readFileSync(new URL(`../${ad}`, import.meta.url), 'utf8')

const vercel = JSON.parse(oku('vercel.json')) as {
  ignoreCommand: string
  rewrites: { source: string; destination: string }[]
}

const ortam = Object.fromEntries(
  oku('.env')
    .split('\n')
    .filter((s) => s.includes('=') && !s.trimStart().startsWith('#'))
    .map((s) => {
      const i = s.indexOf('=')
      return [s.slice(0, i).trim(), s.slice(i + 1).trim()]
    }),
) as Record<string, string>

describe('tarayıcıda senkron kendi kaynağımıza konuşuyor', () => {
  it('cihaz dışı ortamda göreli adres veriyor', () => {
    /* Test ortamı yerel (Capacitor native değil) — tarayıcı yolu. */
    expect(sunucuAyari()).toEqual({ auth: '/auth', api: '/rest' })
  })

  it('göreli adres çapraz site DEĞİL — mutlak adres sızmıyor', () => {
    for (const v of Object.values(sunucuAyari())) expect(v.startsWith('/')).toBe(true)
  })
})

describe('vercel.json kodun istediği yolları taşıyor', () => {
  const kaynaklar = vercel.rewrites.map((r) => r.source)

  it('her iki önek için yönlendirme var', () => {
    for (const onek of Object.values(sunucuAyari()))
      expect(
        kaynaklar.some((k) => k.startsWith(onek + '/')),
        `${onek} için yönlendirme yok: ${kaynaklar.join(', ')}`,
      ).toBe(true)
  })

  it('yönlendirmeler .env ile aynı Neon adresine gidiyor', () => {
    /* İki kopya kayarsa cihaz bir sunucuya, tarayıcı başkasına konuşurdu. */
    const hedef = (onek: string): string =>
      vercel.rewrites.find((r) => r.source.startsWith(onek + '/'))!.destination
    expect(hedef('/auth').startsWith(ortam.VITE_DEFTER_AUTH!)).toBe(true)
    expect(hedef('/rest').startsWith(ortam.VITE_DEFTER_API!)).toBe(true)
  })

  it('env adresleri hâlâ Neon ve hâlâ HTTPS', () => {
    for (const a of [ortam.VITE_DEFTER_AUTH!, ortam.VITE_DEFTER_API!]) {
      expect(a.startsWith('https://')).toBe(true)
      expect(a).toContain('.neon.tech')
    }
  })

  it('yalnızca üretim dalı yayınlanıyor', () => {
    /*
     * Hobby planında önizleme dağıtımları HERKESE AÇIK ve her biri ayrı
     * bir kaynak: ne OPFS verisi ne çerez taşınır, Neon güvenilir alan
     * listesi de tutmaz. Yeni bir dal açılınca sessizce açık bir defter
     * yayınlanmasın.
     */
    expect(vercel.ignoreCommand).toContain('VERCEL_ENV')
    expect(vercel.ignoreCommand).toContain('production')
  })
})

describe('geliştirme sunucusu üretimle aynı yolları taşıyor', () => {
  const yapilandirma = oku('vite.config.ts')

  it('vite.config aynı önekleri yönlendiriyor', () => {
    for (const onek of Object.values(sunucuAyari()))
      expect(yapilandirma, `vite.config.ts içinde ${onek} yok`).toContain(`'${onek}'`)
  })

  it('adresleri env dosyasından okuyor, kopyalamıyor', () => {
    expect(yapilandirma).toContain('loadEnv')
    expect(yapilandirma).not.toContain('https://ep-')
  })
})
