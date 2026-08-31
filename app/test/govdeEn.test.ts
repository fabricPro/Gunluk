import { describe, expect, it } from 'vitest'
import { govdeler, metinGovdeleri, ortakGovde, sozcukler } from '../src/cekirdek/govde.js'

/**
 * İngilizce gövdeleme — K-027'nin karşılığı.
 *
 * Türkçedeki gibi: tam çözümleme yok, ADAY KÜMESİ var. İki sözcük
 * kümeleri kesişiyorsa eşleşiyor. Simetrik aşırı gövdeleme zararsız,
 * asimetrik olan zararlı.
 */

const eslesir = (a: string, b: string): boolean =>
  ortakGovde(govdeler(a, 'en'), govdeler(b, 'en'))

describe('ingilizce gövdeleme · eşleşmeli', () => {
  const cift: [string, string][] = [
    ['waiting', 'wait'],
    ['waited', 'wait'],
    ['waits', 'wait'],
    ['running', 'run'],
    ['stopped', 'stop'],
    ['writing', 'write'],
    ['wrote', 'wrote'],
    ['studies', 'study'],
    ['studied', 'study'],
    ['happier', 'happy'],
    ['happiest', 'happy'],
    ['loneliness', 'lonely'],
    ['quietly', 'quiet'],
    ['moments', 'moment'],
    ['disappointment', 'disappoint'],
    ['calling', 'called'],
    ['feelings', 'feeling'],
  ]
  for (const [a, b] of cift)
    it(`${a} ↔ ${b}`, () => expect(eslesir(a, b)).toBe(true))

  it('simetrik: hangi taraftan arandığı fark etmiyor', () => {
    expect(eslesir('waiting', 'waited')).toBe(true)
    expect(eslesir('waited', 'waiting')).toBe(true)
  })
})

describe('ingilizce gövdeleme · eşleşmemeli', () => {
  const cift: [string, string][] = [
    ['waiting', 'walking'],
    ['mother', 'brother'],
    ['letter', 'better'],
    ['morning', 'mourning'],
  ]
  for (const [a, b] of cift)
    it(`${a} ↮ ${b}`, () => expect(eslesir(a, b)).toBe(false))
})

describe('ingilizce gövdeleme · metin içinde', () => {
  it('kayıt metninde çekimli biçim bulunuyor', () => {
    const kayit = metinGovdeleri('I kept waiting for him to call.', 'en')
    expect(ortakGovde(govdeler('wait', 'en'), kayit)).toBe(true)
    expect(ortakGovde(govdeler('calls', 'en'), kayit)).toBe(true)
    expect(ortakGovde(govdeler('sleep', 'en'), kayit)).toBe(false)
  })

  it('sözcüklere ayırma noktalamayı düşürüyor', () => {
    expect(sozcukler("It didn't help, at all.", 'en')).toEqual([
      'it', 'didn', 't', 'help', 'at', 'all',
    ])
  })
})

describe('diller karışmıyor', () => {
  it('varsayılan Türkçe — mevcut davranış değişmedi', () => {
    expect(ortakGovde(govdeler('kitabı'), govdeler('kitap'))).toBe(true)
    expect(ortakGovde(govdeler('hissettiğim'), govdeler('hissetmedim'))).toBe(true)
  })

  it('aynı harf dizisi iki dilde ayrı önbelleklenmiş', () => {
    /* "ada" Türkçede kendi başına bir sözcük; İngilizce gövdeleyici
       farklı bir küme üretiyor. Karışsalardı biri diğerini gölgelerdi. */
    expect(govdeler('sings', 'en').has('sing')).toBe(true)
    expect(govdeler('sings', 'tr').has('sing')).toBe(false)
  })
})
