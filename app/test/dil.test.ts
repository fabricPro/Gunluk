import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { cihazDili, DILLER } from '../src/cekirdek/dil.js'
import { METIN } from '../src/cekirdek/metin.js'

/**
 * Yerelleştirmenin muhafızları.
 *
 * Yarım bir yerelleştirme, arayüzü çevirip altındaki dil makinelerini
 * Türkçe bırakmaktır. Bu testler bunu makine düzeyinde engelliyor: eksik
 * anahtar, çevrilmemiş dize, katalog dışında kalmış HTML metni
 * (KARARLAR.md · K-035).
 */

const kok = new URL('../src/', import.meta.url).pathname

const dosyalar = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? dosyalar(join(d, e.name)) : e.name.endsWith('.ts') ? [join(d, e.name)] : [],
  )

const TURKCE = /[şçğıöüŞÇĞİÖÜ]/

describe('katalog · iki dil aynı anahtarları taşıyor', () => {
  it('hiçbir dilde eksik anahtar yok', () => {
    expect(Object.keys(METIN.en).sort()).toEqual(Object.keys(METIN.tr).sort())
  })

  it('hiçbir değer boş değil', () => {
    for (const d of DILLER)
      for (const [k, v] of Object.entries(METIN[d])) expect(v.trim(), `${d}:${k}`).not.toBe('')
  })

  it('İngilizce değerler Türkçeden kopyalanmamış', () => {
    /*
     * Birkaç dize iki dilde de aynı olabilir (marka adı, "Kraft"), ama
     * çoğunluk aynıysa çeviri yapılmamış demektir.
     */
    const anahtarlar = Object.keys(METIN.tr)
    const ayni = anahtarlar.filter((k) => METIN.tr[k] === METIN.en[k])
    expect(ayni.length / anahtarlar.length).toBeLessThan(0.06)
  })

  it('İngilizce değerlerde Türkçe harf kalmadı', () => {
    const kacak = Object.entries(METIN.en)
      .filter(([k, v]) => TURKCE.test(v) && k !== 'ust.marka' && k !== 'kilit.marka')
      .map(([k]) => k)
    expect(kacak, kacak.join(', ')).toEqual([])
  })

  it('yer tutucular iki dilde de aynı', () => {
    const tutucular = (s: string): string[] =>
      [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort()
    for (const k of Object.keys(METIN.tr))
      expect(tutucular(METIN.en[k]!), k).toEqual(tutucular(METIN.tr[k]!))
  })
})

describe('HTML · görünen her metin katalogdan geliyor', () => {
  const ham = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

  it('en az elli dize işaretlenmiş', () => {
    const kullanilan = [...ham.matchAll(/data-m(?:-h|-y|-b)?="([^"]+)"/g)]
    expect(kullanilan.length).toBeGreaterThan(50)
  })

  it('kullanılan her anahtar katalogda var', () => {
    for (const m of ham.matchAll(/data-m(?:-h|-y|-b)?="([^"]+)"/g))
      expect(METIN.tr[m[1]!], m[1]!).toBeDefined()
  })

  it('işaretsiz Türkçe metin kalmadı', () => {
    /*
     * `data-m` taşıyan öğeler açılışta katalogdan doluyor; onları
     * çıkarınca geriye kalan metin çevrilmemiş demektir.
     */
    const d = new JSDOM(ham).window.document
    for (const e of d.querySelectorAll('[data-m],[data-m-h]')) e.remove()
    const kalan = (d.body.textContent ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => TURKCE.test(l))
    expect(kalan, `çevrilmemiş: ${kalan.join(' | ')}`).toEqual([])
  })

  it('yer tutucu ve başlık öznitelikleri de işaretli', () => {
    const d = new JSDOM(ham).window.document
    const kacak: string[] = []
    for (const e of d.querySelectorAll('[placeholder],[title]')) {
      const p = e.getAttribute('placeholder')
      const t = e.getAttribute('title')
      if (p && TURKCE.test(p) && !e.hasAttribute('data-m-y')) kacak.push(`placeholder: ${p}`)
      if (t && TURKCE.test(t) && !e.hasAttribute('data-m-b')) kacak.push(`title: ${t}`)
    }
    expect(kacak, kacak.join(' | ')).toEqual([])
  })
})

describe('kod · kullanıcıya görünen sabit Türkçe dize kalmadı', () => {
  const yorumsuz = (k: string): string =>
    k.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')

  /*
   * İstisnalar dar ve gerekçeli:
   *  - kapaklar.ts: yalnızca veritabanı anahtarları, çevrilmiyor
   *  - ayarlar.ts: dil adları kendi dillerinde yazılır (Türkçe / English)
   *  - defter.ts: Türkçe ek uyumu (dahiEki) dile göre dallanan tek yer
   *  - gomucuIsci.ts: konsola giden worker hatası, kullanıcı görmüyor
   */
  const IZINLI = new Set([
    'kapaklar.ts', // yalnızca veritabanı anahtarları
    'ayarlar.ts', // DIL_ADI: dil adları kendi dillerinde yazılır
    'defter.ts', // Türkçe ek uyumu (dahiEki) dile göre dallanan tek yer
    'gomucuIsci.ts', // konsola giden worker hatası
    'tohum.ts', // demo verisi; iki dilde de kendi metinlerini taşıyor
    'kripto.ts', // yalnızca konsol uyarısı
    'surucu.ts', // yalnızca konsol uyarısı
    'sifirla.ts', // geliştirme aracı
  ])

  /*
   * `veri/` de taranıyor: `model.ts` ve `senkronDepo.ts` kullanıcıya
   * gösterilecek hata cümlesi kuruyor ve o cümleler de çevrilmek
   * zorunda. Açık tam oradaydı — senkron eklenirken ham "Failed to
   * fetch" arayüze düşüyordu (KARARLAR.md · K-036).
   */
  for (const katman of ['ekran', 'veri'])
    it(`${katman}/ altında yalnızca bilinen istisnalar var`, () => {
      const bulunan: string[] = []
      const dizin = join(kok, katman)
      for (const f of dosyalar(dizin)) {
        const ad = f.slice(dizin.length + 1)
        if (IZINLI.has(ad)) continue
        const kod = yorumsuz(readFileSync(f, 'utf8'))
        for (const m of kod.matchAll(/'([^'\n]*[şçğıöüŞÇĞİÖÜ][^'\n]*)'/g))
          if (!m[1]!.startsWith('[defter]')) bulunan.push(`${katman}/${ad}: ${m[1]!}`)
      }
      expect(bulunan, bulunan.join('\n')).toEqual([])
    })
})

describe('cihaz dili', () => {
  it('tr ve türevleri Türkçe', () => {
    expect(cihazDili(['tr'])).toBe('tr')
    expect(cihazDili(['tr-TR'])).toBe('tr')
  })
  it('en ve türevleri İngilizce', () => {
    expect(cihazDili(['en-GB', 'en'])).toBe('en')
    expect(cihazDili(['en-US'])).toBe('en')
  })
  it('tanımadığı dilde Türkçe', () => {
    expect(cihazDili(['de-DE', 'fr'])).toBe('tr')
    expect(cihazDili([])).toBe('tr')
  })
  it('sıra önemli — ilk tanınan kazanıyor', () => {
    expect(cihazDili(['de', 'en', 'tr'])).toBe('en')
  })
})
