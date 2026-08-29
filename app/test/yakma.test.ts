import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Depo } from '../src/veri/depo.js'
import { defteriAc } from '../src/veri/db.js'
import { testSurucusu } from './surucu.js'

const kok = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Yorumları at — tarama koda baksın, kodu anlatan cümlelere değil. */
const yorumsuz = (k: string): string =>
  k.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')

/**
 * İlke 2.2 — yakılan sayfa gerçekten yanar.
 * Bu testler o sözün tek makine kanıtı. Kırılırlarsa özellik değil, ürünün
 * güvenilirliği kırılmış demektir.
 */

describe('yakma modülü veri katmanına dokunmaz', () => {
  const kaynak = readFileSync(join(kok, 'src/ekran/yak.ts'), 'utf8')
  const kod = yorumsuz(kaynak)

  it('hiçbir veri/ modülünü import etmez', () => {
    const importlar = [...kaynak.matchAll(/^import[^']*'([^']+)'/gm)].map((m) => m[1]!)
    expect(importlar).toEqual(['./ortak.js'])
  })

  it("kalıcı depolama API'lerini kullanmaz", () => {
    for (const yasak of [
      'localStorage', 'sessionStorage', 'indexedDB', 'Depo', 'depo.',
      'kayitEkle', 'ayarYaz', 'fetch(', 'navigator.clipboard',
    ])
      expect(kod).not.toContain(yasak)
  })

  it('sayaç tutmaz — "kaç kez yaktın" bilgisi bile yok', () => {
    expect(kod).not.toMatch(/sayac|sayaç|count|kez\s*\+\+/i)
  })

  it('klavyenin öğrenmesini engelleyen öznitelikler işaretlide', () => {
    const html = readFileSync(join(kok, 'index.html'), 'utf8')
    const alan = html.slice(html.indexOf('id="yakYazi"'), html.indexOf('id="yakYazi"') + 400)
    expect(alan).toContain('autocomplete="off"')
    expect(alan).toContain('autocorrect="off"')
    expect(alan).toContain('spellcheck="false"')
  })
})

/**
 * Bayt taraması: yakma akışında yazılan işaret metni, normal defter
 * kullanımıyla birlikte çalıştıktan sonra veritabanı dosyasında, WAL'da
 * veya uygulama dizinindeki herhangi bir dosyada bulunmamalı.
 */
const ISARET = 'YAKILAN-ISARET-8f2c1d4b-BU-METIN-HICBIR-YERE-YAZILMAMALI'

async function yakmayiKostur(): Promise<{ pencere: JSDOM; gorunenMetin: () => string }> {
    const html = readFileSync(join(kok, 'index.html'), 'utf8')
    const pencere = new JSDOM(html, { runScripts: 'outside-only' })
    const g = globalThis as Record<string, unknown>
    g.document = pencere.window.document
    g.window = pencere.window
    g.HTMLElement = pencere.window.HTMLElement

    const { yakmayiBagla } = await import('../src/ekran/yak.js')
    yakmayiBagla()

    const d = pencere.window.document
    d.querySelector<HTMLButtonElement>('#yakBtn')!.click()
    const alan = d.querySelector<HTMLTextAreaElement>('#yakYazi')!
    alan.value = ISARET
    d.querySelector<HTMLButtonElement>('#yakBas')!.click()
  return { pencere, gorunenMetin: () => d.body.textContent ?? '' }
}

describe('yakma akışı — gerçek modül, gerçek DOM', () => {
  it('yakma sonrası tampon boş, metin DOMda yok', async () => {
    vi.useFakeTimers()
    try {
      const { pencere, gorunenMetin } = await yakmayiKostur()
      const d = pencere.window.document
      /* Yanarken harfler hâlâ ekranda — kül olma animasyonu sürüyor. */
      expect(d.querySelector<HTMLTextAreaElement>('#yakYazi')!.value).toBe('')
      vi.advanceTimersByTime(8000)
      expect(gorunenMetin()).not.toContain(ISARET)
      expect(d.querySelector<HTMLTextAreaElement>('#yakYazi')!.value).toBe('')
      expect(d.querySelector('#yakGoster')!.innerHTML).toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('vazgeçmek de tamponu siler', async () => {
    vi.useFakeTimers()
    try {
      const html = readFileSync(join(kok, 'index.html'), 'utf8')
      const pencere = new JSDOM(html, { runScripts: 'outside-only' })
      const g = globalThis as Record<string, unknown>
      g.document = pencere.window.document
      g.window = pencere.window
      const { yakmayiBagla } = await import('../src/ekran/yak.js')
      yakmayiBagla()
      const d = pencere.window.document
      d.querySelector<HTMLButtonElement>('#yakBtn')!.click()
      d.querySelector<HTMLTextAreaElement>('#yakYazi')!.value = ISARET
      d.querySelector<HTMLButtonElement>('#yakVaz')!.click()
      expect(d.querySelector<HTMLTextAreaElement>('#yakYazi')!.value).toBe('')
      expect(d.body.textContent).not.toContain(ISARET)
      vi.advanceTimersByTime(500)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('yakma sızıntı taraması', () => {
  const dizinler: string[] = []
  afterEach(() => {
    for (const d of dizinler.splice(0)) rmSync(d, { recursive: true, force: true })
  })

  it('yakma akışı koşturulduktan sonra metin hiçbir dosyada yok', async () => {
    const dizin = mkdtempSync(join(tmpdir(), 'defter-yak-'))
    dizinler.push(dizin)
    const db = testSurucusu(join(dizin, 'defter.db'))
    const depo = new Depo(await defteriAc(db))

    /* Defter açık ve kullanılıyor. */
    await depo.kayitEkle({ tarih: '2026-08-29', saat: '09:00', metin: 'sabah kaydı' })

    /* Aynı oturumda yakma akışı baştan sona koşuyor. */
    vi.useFakeTimers()
    try {
      const { pencere } = await yakmayiKostur()
      vi.advanceTimersByTime(8000)
      void pencere
    } finally {
      vi.useRealTimers()
    }

    /* Yakmadan sonra defter kullanılmaya devam ediyor — yazma sürüyor. */
    await depo.kayitEkle({ tarih: '2026-08-29', saat: '21:00', metin: 'akşam kaydı' })
    await depo.ayarYaz('sonAcilis', '2026-08-29')
    await db.calistir('PRAGMA wal_checkpoint(TRUNCATE)')
    await db.kapat()

    const iz = Buffer.from(ISARET)
    const bulunanlar = readdirSync(dizin).filter((ad) =>
      readFileSync(join(dizin, ad)).includes(iz),
    )
    expect(bulunanlar).toEqual([])
  })
})
