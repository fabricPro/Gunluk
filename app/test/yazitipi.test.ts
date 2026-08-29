import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const kok = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Yorumları at — tarama koda baksın, kodu anlatan cümlelere değil. */
const yorumsuz = (k: string): string => k.replace(/\/\*[\s\S]*?\*\//g, ' ')
const html = readFileSync(join(kok, 'index.html'), 'utf8')
const yaziTipiCss = readFileSync(join(kok, 'src/stil/yazitipi.css'), 'utf8')
const stilDizin = join(kok, 'src/stil')
const tumStil = readdirSync(stilDizin)
  .filter((a) => a.endsWith('.css'))
  .map((a) => readFileSync(join(stilDizin, a), 'utf8'))
  .join('\n')

/**
 * Yazı tipleri pakete gömülü (KARARLAR.md · K-011). Bu testler CDN'e
 * sessiz dönüşü engelliyor: uygulama çevrimdışı açıldığında da tipografi
 * yerinde olmalı ve her açılışta dışarıya istek gitmemeli.
 */

describe('dış yazı tipi bağımlılığı yok', () => {
  it('index.html hiçbir yazı tipi CDNine bağlanmıyor', () => {
    for (const yasak of ['fonts.googleapis.com', 'fonts.gstatic.com', 'use.typekit', 'fontsource'])
      expect(html).not.toContain(yasak)
  })

  it('hiçbir stil dosyası dışarıdan yazı tipi çekmiyor', () => {
    expect(tumStil).not.toMatch(/@import\s+url\(\s*['"]?https?:/i)
    for (const yasak of ['fonts.googleapis.com', 'fonts.gstatic.com'])
      expect(tumStil).not.toContain(yasak)
  })

  it('yazı tipi kaynakları göreli ve yerel', () => {
    const kaynaklar = [...yaziTipiCss.matchAll(/url\(\s*'([^']+)'/g)].map((m) => m[1]!)
    expect(kaynaklar.length).toBeGreaterThan(0)
    for (const k of kaynaklar) expect(k).toMatch(/^\.\.\/yazitipi\//)
  })
})

describe('@font-face tanımları', () => {
  const kaynaklar = [...yaziTipiCss.matchAll(/url\(\s*'([^']+)'/g)].map((m) => m[1]!)

  it('gösterdiği her dosya gerçekten var', () => {
    for (const k of kaynaklar)
      expect(existsSync(join(stilDizin, k)), `eksik dosya: ${k}`).toBe(true)
  })

  it('gereken yüzlerin hepsi tanımlı', () => {
    const ad = kaynaklar.map((k) => k.split('/').pop()!)
    expect(ad).toContain('newsreader-latin-wght-normal.woff2')
    expect(ad).toContain('newsreader-latin-ext-wght-normal.woff2')
    expect(ad).toContain('newsreader-latin-wght-italic.woff2')
    expect(ad).toContain('newsreader-latin-ext-wght-italic.woff2')
    expect(ad).toContain('instrument-sans-latin-wght-normal.woff2')
    expect(ad).toContain('instrument-sans-latin-ext-wght-normal.woff2')
  })

  it('aile adları belirtec.cssteki değişkenlerle uyuşuyor', () => {
    const belirtec = readFileSync(join(stilDizin, 'belirtec.css'), 'utf8')
    for (const aile of ['Newsreader', 'Instrument Sans']) {
      expect(yaziTipiCss).toContain(`font-family: '${aile}'`)
      expect(belirtec).toContain(`'${aile}'`)
    }
  })

  it('Türkçe için latin-ext kesimi bağlı — ğ ı ş İ oradan geliyor', () => {
    /* ğ U+011F, ş U+015F, İ U+0130 -> U+0100-02BA aralığında */
    const extKurallari = yaziTipiCss
      .split('@font-face')
      .filter((k) => k.includes('latin-ext'))
    expect(extKurallari).toHaveLength(3)
    for (const k of extKurallari) expect(k).toContain('U+0100-02BA')
  })

  it('CSSte kullanılan her ağırlık tanımlı aralıkta', () => {
    const kullanilan = [...yorumsuz(tumStil).matchAll(/font-weight:\s*(\d{3})/g)].map((m) => Number(m[1]))
    expect(kullanilan.length).toBeGreaterThan(0)
    /* Newsreader 200–800, Instrument Sans 400–700; kesişim 400–700 */
    for (const a of kullanilan) expect(a).toBeGreaterThanOrEqual(200)
    for (const a of kullanilan) expect(a).toBeLessThanOrEqual(800)
  })

  it('font-display block — yerel dosyada yedek yazı tipine sıçrama olmasın', () => {
    const sayi = [...yorumsuz(yaziTipiCss).matchAll(/font-display:\s*block/g)].length
    expect(sayi).toBe(kaynaklar.length)
  })
})

describe('lisans', () => {
  it('OFL metinleri yazı tiplerinin yanında duruyor', () => {
    const dizin = join(kok, 'src/yazitipi')
    const dosyalar = readdirSync(dizin)
    expect(dosyalar).toContain('OFL-Newsreader.txt')
    expect(dosyalar).toContain('OFL-InstrumentSans.txt')
    for (const d of dosyalar.filter((x) => x.startsWith('OFL')))
      expect(readFileSync(join(dizin, d), 'utf8')).toContain('SIL Open Font License')
  })

  it('depoda kullanılmayan woff2 birikmiyor', () => {
    const diskte = readdirSync(join(kok, 'src/yazitipi')).filter((a) => a.endsWith('.woff2'))
    const kullanilan = [...yaziTipiCss.matchAll(/url\(\s*'[^']*\/([^/']+\.woff2)'/g)].map(
      (m) => m[1]!,
    )
    expect(diskte.sort()).toEqual([...kullanilan].sort())
  })
})
