/**
 * Mağaza ekran görüntülerini üretir.
 *
 * Elle çekilen görüntü bir daha üretilemez; bu betik üretilebilir olmasını
 * sağlıyor. Arayüz değişince yeniden koşturulur ve görüntüler tazelenir.
 *
 *   npm run onizle          (ayrı bir kabukta, 4173'te)
 *   node arac/ekranGoruntusu.mjs
 *
 * Not: tohum verisiyle koşuyor — gerçek bir defter kullanılmıyor.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const ADRES = process.env.DEFTER_ADRES ?? 'http://localhost:4173'
const CIKTI = new URL('../../yayin/gorsel/', import.meta.url).pathname
const KROM = process.env.CHROMIUM ?? undefined

/** App Store 6.9" iPhone ve 13" iPad; Play Store telefon. */
const OLCULER = [
  { ad: 'iphone', en: 1320, boy: 2868, olcek: 3 },
  { ad: 'ipad', en: 2064, boy: 2752, olcek: 2 },
]

const SAHNELER = [
  {
    ad: '1-defter',
    kur: async (p) => {
      await p.click('nav button[data-ekran="defter"]')
      await p.waitForTimeout(400)
    },
  },
  {
    ad: '2-arsiv',
    kur: async (p) => {
      await p.click('nav button[data-ekran="arsiv"]')
      await p.fill('#soruKutu', 'kerem')
      await p.click('#sorBtn')
      await p.waitForTimeout(700)
    },
  },
  {
    ad: '3-yakilan-sayfa',
    kur: async (p) => {
      await p.click('nav button[data-ekran="defter"]')
      await p.click('#yakBtn')
      await p.waitForTimeout(300)
      await p.fill('#yakYazi', 'Kimseye söyleyemediğim şey.')
      await p.click('#yakBas')
      await p.waitForTimeout(750)
    },
  },
  {
    ad: '4-kapsul',
    kur: async (p) => {
      await p.click('nav button[data-ekran="kapsul"]')
      await p.waitForTimeout(500)
    },
  },
  {
    ad: '5-fihrist',
    kur: async (p) => {
      await p.click('nav button[data-ekran="defter"]')
      await p.click('#fihristBtn')
      await p.waitForTimeout(500)
    },
  },
]

mkdirSync(CIKTI, { recursive: true })
const tarayici = await chromium.launch(KROM ? { executablePath: KROM } : {})

for (const o of OLCULER) {
  for (const s of SAHNELER) {
    const baglam = await tarayici.newContext({
      viewport: { width: Math.round(o.en / o.olcek), height: Math.round(o.boy / o.olcek) },
      deviceScaleFactor: o.olcek,
    })
    const p = await baglam.newPage()
    await p.goto(`${ADRES}/?tohum`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(900)
    await s.kur(p)
    const yol = `${CIKTI}${o.ad}-${s.ad}.png`
    await p.screenshot({ path: yol })
    console.log(yol)
    await baglam.close()
  }
}
await tarayici.close()
