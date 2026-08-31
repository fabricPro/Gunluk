import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * İlke 2.3'ün gömü tarafındaki karşılığı: METİN CİHAZDAN ÇIKMAZ.
 *
 * Gömü worker'ı ağa çıkan tek yer ve oradaki çağrılar model ile çalışma
 * zamanını GETİRİR, metni GÖTÜRMEZ. Bu test kaynağı tarayarak o sınırı
 * sabitliyor — `test/yakma.test.ts`'in import taramasıyla aynı refleks.
 *
 * Tarayıcıda da doğrulandı: özellik açılırken yalnızca tek bir GET çıkıyor
 * ve gövdesi yok (KARARLAR.md · K-029).
 */
const kaynak = (yol: string): string => readFileSync(new URL(yol, import.meta.url), 'utf8')

/** Yorumları düşürür — tarama kodu görmeli, prozayı değil. */
const kodu = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

describe('gömü · metin dışarı çıkmıyor', () => {
  const isci = kodu(kaynak('../src/veri/gomu-isci.ts'))

  it('worker gövdeli istek atmıyor', () => {
    expect(isci).not.toMatch(/\bfetch\s*\(/)
    expect(isci).not.toMatch(/XMLHttpRequest/)
    expect(isci).not.toMatch(/sendBeacon/)
    expect(isci).not.toMatch(/WebSocket/)
    expect(isci).not.toMatch(/method:\s*['"]POST/i)
  })

  it('yalnızca paket CDN adresleri var', () => {
    const adresler = [...isci.matchAll(/https?:\/\/[^'"`\s]+/g)].map((m) => m[0])
    expect(adresler.length).toBeGreaterThan(0)
    for (const a of adresler) expect(a).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\//)
  })

  it('kullanıcı metni bir adrese değil yalnızca modele giriyor', () => {
    const satirlar = isci
      .split('\n')
      .filter((l) => l.includes('metinler') && !l.trim().startsWith('*'))
    expect(satirlar.length).toBeGreaterThan(0)
    for (const l of satirlar) expect(l).not.toMatch(/http|url|URL|fetch/)
  })

  it('sarmalayıcı ağa hiç çıkmıyor', () => {
    const sarma = kodu(kaynak('../src/ekran/gomucuIsci.ts'))
    expect(sarma).not.toMatch(/\bfetch\s*\(/)
    expect(sarma).not.toMatch(/https?:\/\//)
  })
})
