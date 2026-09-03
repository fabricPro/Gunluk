import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * KURULABİLİR UYGULAMA — manifest ve ikonlar.
 *
 * Bu dosyanın varlık sebebi şu: kurulabilirlik SESSİZCE bozulur. Bir
 * ikonun boyutu yanlış yazılırsa, `start_url` kapsamın dışına çıkarsa ya
 * da bir dosya `public/`ten silinirse tarayıcı hata vermez — yalnızca
 * "ana ekrana ekle" görünmez olur ve kimse fark etmez
 * (KARARLAR.md · K-049).
 */

const kok = new URL('../', import.meta.url).pathname
const oku = (y: string): string => readFileSync(kok + y, 'utf8')

interface Ikon {
  src: string
  sizes: string
  type: string
  purpose: string
}
const manifest = JSON.parse(oku('public/manifest.webmanifest')) as {
  id: string
  name: string
  short_name: string
  start_url: string
  scope: string
  display: string
  background_color: string
  theme_color: string
  icons: Ikon[]
}

/**
 * PNG'nin GERÇEK boyutu — IHDR'den.
 *
 * Manifestteki `sizes` bir iddia, dosya ise gerçek. İkisi ayrışırsa
 * Chrome ikonu reddediyor ve kurulum düğmesi çıkmıyor; hiçbir yerde
 * hata görünmüyor. Bu yüzden iddia değil dosya ölçülüyor.
 */
const pngOlcu = (yol: string): { en: number; boy: number } => {
  const b = readFileSync(kok + yol)
  expect(b.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(b.subarray(12, 16).toString('ascii')).toBe('IHDR')
  return { en: b.readUInt32BE(16), boy: b.readUInt32BE(20) }
}

describe('manifest', () => {
  it('kurulabilirliğin şart koştuğu alanlar dolu', () => {
    expect(manifest.name).toBe('defter')
    expect(manifest.short_name).toBe('defter')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    /* Açılış ekranının rengi uygulamanın masasıyla aynı olmalı — beyaz
       bir çakma açılış, koyu bir deftere açılmak kötü duruyor. */
    expect(manifest.background_color).toBe('#12100C')
    expect(manifest.theme_color).toBe('#12100C')
  })

  it('192 ve 512 "any" ile bir de "maskable" var', () => {
    const boyu = (p: string, s: string) =>
      manifest.icons.find((i) => i.purpose === p && i.sizes === s)
    expect(boyu('any', '192x192')).toBeTruthy()
    expect(boyu('any', '512x512')).toBeTruthy()
    /*
     * Maskelenebilir ikon olmadan Android ikonu beyaz bir daireye
     * oturtup etrafına çerçeve çiziyor — kurulan uygulama ucuz görünüyor.
     */
    expect(boyu('maskable', '512x512')).toBeTruthy()
  })
})

describe('ikon dosyaları', () => {
  it('manifestteki her ikon VAR ve boyutu yazdığı gibi', () => {
    for (const i of manifest.icons) {
      expect(i.type).toBe('image/png')
      expect(i.src.startsWith('/')).toBe(true)
      const [en, boy] = i.sizes.split('x').map(Number)
      const gercek = pngOlcu('public' + i.src)
      expect(gercek, `${i.src} boyutu`).toEqual({ en, boy })
    }
  })

  it('iOS ikonu ayrıca var — manifest ikonlarını kullanmıyor', () => {
    expect(pngOlcu('public/apple-touch-icon.png')).toEqual({ en: 180, boy: 180 })
  })
})

describe('index.html', () => {
  const html = oku('index.html')
  it('manifesti, iOS ikonunu ve tema rengini bildiriyor', () => {
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"')
    expect(html).toContain('name="theme-color" content="#12100C"')
  })
})

describe('servis işçisi kaynağı', () => {
  const isci = oku('src/sw.js')
  it('derlemenin dolduracağı iki yer tutucu duruyor', () => {
    /*
     * Yer tutucu adı değişirse `vite.config.ts` sessizce hiçbir şeyi
     * değiştirmez ve yayına, varlık listesi olmayan bozuk bir işçi
     * çıkardı — derleme hata vermeden.
     */
    expect(isci).toContain('__DEFTER_SURUM__')
    expect(isci).toContain('__DEFTER_VARLIKLAR__')
  })

  it('kayıt cihazda YAPILMIYOR', () => {
    /* Capacitor kabuğunda varlıklar zaten pakette; araya önbellek
       koymak yalnızca sürüm uyuşmazlığı üretirdi. */
    expect(oku('src/pwa.ts')).toContain('if (nativeMi) return')
  })
})
