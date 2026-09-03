/**
 * UYGULAMA İKONLARINI ÜRETİR.
 *
 * Elle çizilen bir PNG bir daha üretilemez; kaynağı burada duruyor ve
 * `public/` altındaki dosyalar bundan çıkıyor. Renk paleti değişirse
 * yeniden koşturulur (`arac/ekranGoruntusu.mjs` ile aynı disiplin).
 *
 *   node arac/ikonUret.mjs
 *
 * Yeni bir bağımlılık YOK: raster işini zaten elimizde olan Chromium
 * yapıyor. Bir ikon kütüphanesi eklemek, tek seferlik bir iş için
 * paketi kalıcı olarak büyütürdü.
 *
 * Motif tarayıcı sekmesindeki favicon'un aynısı — kimlik bölünmesin:
 * koyu masa, üstünde parşömen bir sayfa, satırlardan biri altın
 * (başlıklı sayfa, PROJE.md §3).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const CIKTI = new URL('../public/', import.meta.url).pathname
const KROM = process.env.CHROMIUM ?? undefined

/* Paletin kendisi — `src/stil/belirtec.css` ile aynı olmak zorunda. */
const MASA = '#18140E'
const KAGIT = '#E0D4BA'
const MUREKKEP = '#2C2118'
const ALTIN = '#96661D'

/**
 * Tek bir SVG, iki yerleşim.
 *
 * `dolgu` sayfanın tuvale oranı. Maskelenebilir ikonda platform kenardan
 * kırpıyor: içerik ortadaki %80'lik dairede kalmalı, yoksa Android'in
 * yuvarlak maskesi sayfanın köşelerini kesiyor.
 */
const svg = (dolgu, yuvarlak) => {
  const b = 512
  const en = b * dolgu
  const boy = en * 1.25
  const x = (b - en) / 2
  const y = (b - boy) / 2
  const satir = (i) => y + boy * (0.26 + i * 0.13)
  const sx1 = x + en * 0.16
  const sx2 = x + en * 0.84
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${b}" height="${b}" viewBox="0 0 ${b} ${b}">
  <rect width="${b}" height="${b}" rx="${yuvarlak}" fill="${MASA}"/>
  <rect x="${x}" y="${y}" width="${en}" height="${boy}" rx="${en * 0.05}" fill="${KAGIT}"/>
  <rect x="${x}" y="${y}" width="${en * 0.055}" height="${boy}" rx="${en * 0.02}" fill="${MUREKKEP}" opacity=".14"/>
  ${[0, 1, 2, 3]
    .map(
      (i) =>
        `<path d="M${sx1} ${satir(i)}H${i === 3 ? x + en * 0.58 : sx2}" stroke="${
          i === 1 ? ALTIN : MUREKKEP
        }" stroke-width="${en * 0.045}" stroke-linecap="round" opacity="${i === 1 ? '.85' : '.5'}"/>`,
    )
    .join('\n  ')}
</svg>`
}

/* Köşe yarıçapı: normal ikonda yumuşak kare, maskelenebilirde YOK —
   maskeyi platform kendisi uyguluyor, bizimki üstüne binerdi. */
const ISLER = [
  { ad: 'ikon-192.png', boy: 192, svg: svg(0.56, 84) },
  { ad: 'ikon-512.png', boy: 512, svg: svg(0.56, 84) },
  { ad: 'ikon-maskeli-512.png', boy: 512, svg: svg(0.42, 0) },
  /* iOS ana ekran ikonu: SVG kabul etmiyor, maskeyi kendi uyguluyor. */
  { ad: 'apple-touch-icon.png', boy: 180, svg: svg(0.56, 0) },
]

const tarayici = await chromium.launch({ executablePath: KROM })
const sayfa = await tarayici.newPage()
mkdirSync(CIKTI, { recursive: true })

for (const is of ISLER) {
  await sayfa.setViewportSize({ width: is.boy, height: is.boy })
  await sayfa.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}
     svg{display:block;width:${is.boy}px;height:${is.boy}px}</style>${is.svg}`,
  )
  writeFileSync(CIKTI + is.ad, await sayfa.screenshot({ omitBackground: true }))
  console.log(`  ${is.ad} (${is.boy}×${is.boy})`)
}

await tarayici.close()
console.log('ikonlar üretildi.')
