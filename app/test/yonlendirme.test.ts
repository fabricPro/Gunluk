import { describe, expect, it } from 'vitest'
import { HAVUZ, ILK_HAFTA, ILK_HAFTA_GUN } from '../src/cekirdek/sorular.js'
import {
  BASLANGIC,
  gununSorusu,
  havuzdanSor,
  havuzuIlerlet,
  ilkHaftaBitti,
  kayitYazildi,
} from '../src/cekirdek/yonlendirme.js'

describe('ilk hafta — yazılan güne göre sayılır', () => {
  it('hiç yazmamış kullanıcı ilk soruyu görür', () => {
    expect(gununSorusu(BASLANGIC, '2026-01-01')).toBe(ILK_HAFTA[0])
  })

  it('aynı güne ikinci kayıt sayacı ilerletmez', () => {
    let d = kayitYazildi(BASLANGIC, '2026-01-01')
    d = kayitYazildi(d, '2026-01-01')
    expect(d.gun).toBe(1)
  })

  it('yazdıktan sonra o gün başka soru gelmez', () => {
    const d = kayitYazildi(BASLANGIC, '2026-01-01')
    expect(gununSorusu(d, '2026-01-01')).toBeNull()
  })

  it('ertesi yazma gününde sıradaki soru gelir', () => {
    const d = kayitYazildi(BASLANGIC, '2026-01-01')
    expect(gununSorusu(d, '2026-01-02')).toBe(ILK_HAFTA[1])
  })

  it('araya giren boşluk soruları atlatmaz — takvim değil, yazılan gün sayılır', () => {
    let d = BASLANGIC
    d = kayitYazildi(d, '2026-01-01')
    /* Kullanıcı üç hafta uğramıyor. */
    expect(gununSorusu(d, '2026-01-22')).toBe(ILK_HAFTA[1])
    d = kayitYazildi(d, '2026-01-22')
    expect(gununSorusu(d, '2026-03-10')).toBe(ILK_HAFTA[2])
  })

  it('yedi yazma günü sonunda sorular susar', () => {
    let d = BASLANGIC
    const gorulen: string[] = []
    for (let i = 1; i <= ILK_HAFTA_GUN; i++) {
      const tarih = `2026-01-${String(i).padStart(2, '0')}`
      const s = gununSorusu(d, tarih)
      expect(s).not.toBeNull()
      gorulen.push(s!)
      d = kayitYazildi(d, tarih)
    }
    expect(gorulen).toEqual([...ILK_HAFTA])
    expect(ilkHaftaBitti(d)).toBe(true)
    expect(gununSorusu(d, '2026-01-08')).toBeNull()
  })
})

describe('kriz — uygulama susar (ilke 2.1)', () => {
  it('kriz işaretliyken günün sorusu gelmez', () => {
    expect(gununSorusu(BASLANGIC, '2026-01-01', true)).toBeNull()
  })
  it('kriz işaretliyken havuzdan da soru gelmez', () => {
    expect(havuzdanSor(BASLANGIC, true)).toBeNull()
  })
})

describe('havuz — yalnızca kullanıcı istediğinde', () => {
  it('sırayla ilerler', () => {
    let d = BASLANGIC
    expect(havuzdanSor(d)).toBe(HAVUZ[0])
    d = havuzuIlerlet(d)
    expect(havuzdanSor(d)).toBe(HAVUZ[1])
  })

  it('sonuna gelince başa döner, tükenmiş olmaz', () => {
    let d = { ...BASLANGIC, havuzIndeks: HAVUZ.length - 1 }
    expect(havuzdanSor(d)).toBe(HAVUZ[HAVUZ.length - 1])
    d = havuzuIlerlet(d)
    expect(havuzdanSor(d)).toBe(HAVUZ[0])
  })
})

describe('soruların kendisi', () => {
  it('ilk hafta yedi soru', () => {
    expect(ILK_HAFTA).toHaveLength(7)
  })

  it('hepsi soru sorar', () => {
    /* Yumuşatan bir cümleyle bitebilir ("Küçük olabilir."), ama soru olmalı. */
    for (const s of [...ILK_HAFTA, ...HAVUZ]) expect(s).toContain('?')
  })

  it('destekleyici-AI diline kaçmaz', () => {
    /* PROJE.md §5: yorum yapan, avutan, ölçen dil bu üründe yok. */
    const yasak = /minnettar|şükran|kendine iyi bak|harikasın|güçlüsün|puan|skor|değerlendir/i
    for (const s of [...ILK_HAFTA, ...HAVUZ]) expect(s).not.toMatch(yasak)
  })

  it('tekrar eden soru yok', () => {
    const hepsi = [...ILK_HAFTA, ...HAVUZ]
    expect(new Set(hepsi).size).toBe(hepsi.length)
  })
})

/**
 * İki dil, aynı yapı.
 *
 * `havuzIndeks` ve `gun` ayarlarda saklanıyor ve dil değiştirilince
 * TAŞINIYOR. Listeler farklı uzunlukta olsaydı dil değiştiren kullanıcı
 * ya soruları atlar ya baştan başlardı (KARARLAR.md · K-035).
 */
describe('soru listeleri iki dilde de aynı uzunlukta', () => {
  it('ilk hafta yedi soru, havuz aynı sayıda', async () => {
    const { ILK_HAFTA, ILK_HAFTA_EN, HAVUZ, HAVUZ_EN } = await import('../src/cekirdek/sorular.js')
    expect(ILK_HAFTA_EN).toHaveLength(ILK_HAFTA.length)
    expect(HAVUZ_EN).toHaveLength(HAVUZ.length)
  })

  it('İngilizce soru geliyor ve Türkçesiyle aynı sırada', async () => {
    const { gununSorusu, havuzdanSor, BASLANGIC } = await import('../src/cekirdek/yonlendirme.js')
    const { ILK_HAFTA_EN, HAVUZ_EN } = await import('../src/cekirdek/sorular.js')
    expect(gununSorusu(BASLANGIC, '2026-01-01', false, 'en')).toBe(ILK_HAFTA_EN[0])
    expect(havuzdanSor({ ...BASLANGIC, havuzIndeks: 3 }, false, 'en')).toBe(HAVUZ_EN[3])
  })

  it('kriz iki dilde de susturuyor', async () => {
    const { gununSorusu, havuzdanSor, BASLANGIC } = await import('../src/cekirdek/yonlendirme.js')
    expect(gununSorusu(BASLANGIC, '2026-01-01', true, 'en')).toBeNull()
    expect(havuzdanSor(BASLANGIC, true, 'en')).toBeNull()
  })
})
