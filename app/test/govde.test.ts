import { describe, expect, it } from 'vitest'
import { MIN_UZUNLUK, govdeler, ortakGovde, sozcukler } from '../src/cekirdek/govde.js'

const eslesir = (a: string, b: string): boolean =>
  ortakGovde(govdeler(a), govdeler(b))

/* Her satır bir iddia: bu iki sözcük aramada buluşmalı. */
const BULUSMALI: [string, string][] = [
  /* ek düşürme */
  ['kötüydüm', 'kötü'],
  ['günler', 'gün'],
  ['günlerde', 'gün'],
  ['evimde', 'evim'],
  ['kereme', 'kerem'],
  ['keremin', 'kerem'],
  /* fiil — yol haritasının örneği */
  ['hissettiğim', 'hissetmedim'],
  ['hissettiğim', 'hissettim'],
  ['gittiğimde', 'gitti'],
  ['yazmışım', 'yazma'],
  ['bekliyorum', 'bekle'],
  /* ünsüz yumuşaması */
  ['kitabı', 'kitap'],
  ['ağacın', 'ağaç'],
  ['rengi', 'renk'],
  ['ilacı', 'ilaç'],
  /* ünlü düşmesi — istisna tablosu */
  ['burnu', 'burun'],
  ['aklımda', 'akıl'],
  ['şehrin', 'şehir'],
]

/* Bu ikisi buluşMAmalı — gövdeleyici her şeyi birbirine bağlamasın. */
const BULUSMAMALI: [string, string][] = [
  ['kerem', 'kerim'],
  ['araba', 'ara'],
  ['annem', 'annen'],
  ['mülakat', 'mülteci'],
  ['yürüyüş', 'yüzme'],
]

describe('gövdeleme', () => {
  for (const [a, b] of BULUSMALI)
    it(`"${a}" ile "${b}" buluşuyor`, () => {
      expect(eslesir(a, b)).toBe(true)
    })

  for (const [a, b] of BULUSMAMALI)
    it(`"${a}" ile "${b}" buluşMUYOR`, () => {
      expect(eslesir(a, b)).toBe(false)
    })

  it('simetrik — hangi taraftan bakılırsa bakılsın aynı', () => {
    for (const [a, b] of [...BULUSMALI, ...BULUSMAMALI])
      expect(eslesir(a, b)).toBe(eslesir(b, a))
  })

  it('sözcüğün kendisi her zaman aday kümede', () => {
    for (const s of ['kerem', 'hissettiğim', 'kitabı', 'x'])
      expect(govdeler(s).has(s)).toBe(true)
  })

  it('gövde asla en küçük uzunluğun altına inmiyor', () => {
    for (const s of ['evimde', 'kötüydüm', 'aldım', 'geldi', 'bende', 'sende'])
      for (const g of govdeler(s)) expect(g.length).toBeGreaterThanOrEqual(Math.min(MIN_UZUNLUK, s.length))
  })

  it('boş ve noktalamalı girdide çökmüyor', () => {
    expect(govdeler('').size).toBe(0)
    expect(govdeler('...').size).toBe(0)
    expect([...govdeler('«kerem»')][0]).toBe('kerem')
  })

  it('sözcüklere ayırma noktalamayı düşürüyor', () => {
    expect(sozcukler('Kerem aradı. Konuştuk!')).toEqual(['kerem', 'aradı', 'konuştuk'])
    expect(sozcukler('  ')).toEqual([])
  })
})
