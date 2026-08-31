import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EN_COK_KAYIT, SISTEM, anlatimKur, kullaniciMetni } from '../src/cekirdek/anlatim.js'
import { soruCoz } from '../src/cekirdek/sorgu.js'
import type { Bulgu } from '../src/cekirdek/sorgu.js'
import type { Gun, Kayit } from '../src/cekirdek/tipler.js'

/**
 * İlke 2.3'ün model tarafı: CİHAZDAN NE ÇIKIYOR.
 *
 * `anlatim.ts` bu sorunun tek cevabı. Buradaki testler onun sınırlarını
 * sabitliyor; gevşetilirlerse gevşeyen şey ilkenin kendisidir.
 */

const kayit = (id: string, metin: string, tarih = '2026-03-04', saat = '21:10'): Kayit => ({
  id,
  tarih,
  saat,
  metin,
  temalar: [],
  duzenlendi: false,
  soru: null,
})

const bulgu = (k: Kayit, kenarlar: Bulgu['kenarlar'] = []): Bulgu => ({
  puan: 2,
  kayit: k,
  gunAd: 'Çarşamba',
  kenarlar,
})

describe('anlatım · ne gidiyor', () => {
  it('boş soru ya da boş bulgu hiç istek kurmuyor', () => {
    expect(anlatimKur('', [bulgu(kayit('a', 'bir şey'))])).toBeNull()
    expect(anlatimKur('   ', [bulgu(kayit('a', 'bir şey'))])).toBeNull()
    expect(anlatimKur('kerem', [])).toBeNull()
  })

  it(`en fazla ${EN_COK_KAYIT} kayıt gidiyor — defterin tamamı asla`, () => {
    const cok = Array.from({ length: 40 }, (_, i) => bulgu(kayit(`k${i}`, `kayıt ${i}`)))
    const a = anlatimKur('ne yazmışım', cok)!
    expect(a.kayitlar).toHaveLength(EN_COK_KAYIT)
    const metin = kullaniciMetni(a)
    expect(metin).toContain('kayıt 0')
    expect(metin).not.toContain('kayıt 9')
    expect(metin).not.toContain('kayıt 39')
  })

  it('numaralar 1den başlıyor ve kayıt kimliğine bağlı', () => {
    const a = anlatimKur('x', [bulgu(kayit('aa', 'bir')), bulgu(kayit('bb', 'iki'))])!
    expect(a.kayitlar.map((k) => k.no)).toEqual([1, 2])
    expect(a.kayitlar.map((k) => k.kayitId)).toEqual(['aa', 'bb'])
    expect(kullaniciMetni(a)).toContain('[2]')
  })

  it('kenar notu kaydıyla birlikte gidiyor', () => {
    const a = anlatimKur('x', [
      bulgu(kayit('aa', 'gövde'), [{ id: 'n1', kayitId: 'aa', metin: 'sonradan not', tarih: '2027-01-01', olusturma: 0 }]),
    ])!
    expect(kullaniciMetni(a)).toContain('kenar notu: sonradan not')
  })

  it('kayıt metninin dışında hiçbir defter alanı gitmiyor', () => {
    const a = anlatimKur('x', [bulgu(kayit('gizli-kimlik', 'yağmur yağdı'))])!
    const metin = kullaniciMetni(a)
    expect(metin).toContain('yağmur yağdı')
    /* Kimlikler, tema kimlikleri, defter adı — hiçbiri dışarı çıkmıyor. */
    expect(metin).not.toContain('gizli-kimlik')
  })
})

describe('anlatım · kriz kaydı hiçbir koşulda gitmiyor', () => {
  /* Birinci savunma: soruCoz zaten eliyor. */
  it('soruCoz kriz kaydını bulguya koymuyor', () => {
    const gunler: Gun[] = [
      {
        tarih: '2026-03-04',
        ad: 'Çarşamba',
        kayitlar: [
          kayit('n', 'ablamla kavga ettik yine'),
          kayit('k', 'ablamla kavga ettik, kendimi öldürmek istiyorum'),
        ],
      },
    ]
    const c = soruCoz('ablamla kavga', gunler, [])
    expect(c.kullanilan.map((b) => b.kayit.id)).toEqual(['n'])
  })

  /* İkinci savunma: retrieval değişse bile burada eleniyor. */
  it('bulguya elle konsa bile anlatıma girmiyor', () => {
    const a = anlatimKur('x', [
      bulgu(kayit('k', 'artık yaşamak istemiyorum')),
      bulgu(kayit('n', 'bugün yürüyüşe çıktım')),
    ])!
    expect(a.kayitlar.map((k) => k.kayitId)).toEqual(['n'])
    expect(kullaniciMetni(a)).not.toContain('yaşamak istemiyorum')
  })

  it('yalnızca kriz kaydı varsa hiç istek kurulmuyor', () => {
    expect(anlatimKur('x', [bulgu(kayit('k', 'kendime zarar verdim'))])).toBeNull()
  })
})

describe('sistem yönergesi · uydurma yasağı yazılı', () => {
  it('kaynak dışına çıkma yasağı ve atıf zorunluluğu geçiyor', () => {
    expect(SISTEM).toMatch(/yalnızca sana verilen kayıtlardan/i)
    expect(SISTEM).toMatch(/\[1\], \[2\]/)
    expect(SISTEM).toMatch(/uydurma/i)
  })

  it('teşhis ve öğüt yasağı geçiyor — PROJE.md §5', () => {
    expect(SISTEM).toMatch(/teşhis koyma/i)
    expect(SISTEM).toMatch(/öğüt verme/i)
  })
})

/**
 * Ağ sınırının kaynak taraması: uygulamada Anthropic'e çıkan tek dosya
 * `veri/model.ts`. Yeni bir yerde SDK belirirse bu test kırılır ve
 * "metnim nereye gidiyor" sorusunun cevabı tek dosya olmaktan çıkar.
 */
describe('model çağrısı tek bir dosyada', () => {
  const kok = new URL('../src/', import.meta.url).pathname

  const dosyalar = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? dosyalar(join(d, e.name))
        : e.name.endsWith('.ts')
          ? [join(d, e.name)]
          : [],
    )

  it('@anthropic-ai/sdk yalnızca veri/model.ts içinde geçiyor', () => {
    const bulunan = dosyalar(kok).filter((f) =>
      readFileSync(f, 'utf8').includes('@anthropic-ai/sdk'),
    )
    expect(bulunan.map((f) => f.slice(kok.length))).toEqual(['veri/model.ts'])
  })

  it('anlatım çekirdeği ağa ve veri katmanına hiç dokunmuyor', () => {
    const ham = readFileSync(join(kok, 'cekirdek/anlatim.ts'), 'utf8')
    const importlar = [...ham.matchAll(/^import[^']*'([^']+)'/gm)].map((m) => m[1]!)
    for (const i of importlar) expect(i.startsWith('./')).toBe(true)
    const kod = ham.replace(/\/\*[\s\S]*?\*\//g, ' ')
    for (const yasak of ['fetch(', 'XMLHttpRequest', 'localStorage', 'apiKey', 'anthropic'])
      expect(kod.toLowerCase()).not.toContain(yasak.toLowerCase())
  })

  it('yakma modülü model çağrısına da bulaşmıyor — ilke 2.2', () => {
    const yak = readFileSync(join(kok, 'ekran/yak.ts'), 'utf8')
    expect(yak).not.toContain('anlatim')
    expect(yak).not.toContain('model')
  })
})
