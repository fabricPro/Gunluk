import { describe, expect, it } from 'vitest'
import { defterOzeti } from '../src/cekirdek/ozet.js'
import { sayfalariKur } from '../src/cekirdek/sayfa.js'
import type { TemaTanim } from '../src/cekirdek/sorgu.js'
import type { Gun } from '../src/cekirdek/tipler.js'
import { gunAdi } from '../src/cekirdek/tr.js'

const TEMALAR: TemaTanim[] = [
  { id: 'kerem', ad: 'Kerem', anahtar: ['kerem'] },
  { id: 'is', ad: 'İş', anahtar: ['iş'] },
  { id: 'uyku', ad: 'Uyku', anahtar: ['uyku'] },
]

let n = 0
const k = (tarih: string, saat: string, metin: string, temalar: string[] = []) => ({
  id: `k${++n}`,
  tarih,
  saat,
  metin,
  temalar,
  duzenlendi: false,
})
const gun = (tarih: string, ...kayitlar: ReturnType<typeof k>[]): Gun => ({
  tarih,
  ad: gunAdi(tarih),
  kayitlar,
})

const VERI: Gun[] = [
  gun('2026-01-05', k('2026-01-05', '09:00', 'İlk gün, ilk cümle.', ['is'])),
  gun('2026-02-10', k('2026-02-10', '23:00', 'Kerem yazmadı.', ['kerem', 'uyku'])),
  gun(
    '2026-03-15',
    k('2026-03-15', '10:00', 'Kerem aradı.', ['kerem']),
    k('2026-03-15', '22:00', 'Son gün, son cümle.', ['kerem', 'is']),
  ),
]

const akis = () => sayfalariKur({ gunler: VERI, kenarlar: new Map() })

describe('defterOzeti', () => {
  it('tarih aralığını ve sayıları verir', () => {
    const o = defterOzeti(VERI, akis().sayfalar, new Map(), TEMALAR)
    expect(o.ilkTarih).toBe('2026-01-05')
    expect(o.sonTarih).toBe('2026-03-15')
    expect(o.yazilanGun).toBe(3)
    expect(o.kayitSayisi).toBe(4)
    expect(o.surenGun).toBe(69)
    expect(o.aralik).toBe('5 ocak 2026 — 15 mart 2026')
  })

  it('en sık geçen temaları sıralar', () => {
    const o = defterOzeti(VERI, akis().sayfalar, new Map(), TEMALAR)
    expect(o.enSik[0]).toEqual(['Kerem', 3])
    expect(o.enSik.map(([ad]) => ad)).toContain('İş')
  })

  it('ilk ve son kaydın kendisini verir', () => {
    const o = defterOzeti(VERI, akis().sayfalar, new Map(), TEMALAR)
    expect(o.ilkKayit?.metin).toBe('İlk gün, ilk cümle.')
    expect(o.sonKayit?.metin).toBe('Son gün, son cümle.')
  })

  it('başlık verilen sayfaları listeler', () => {
    const sayfalar = akis().sayfalar
    const anahtar = sayfalar[0]!.anahtar!
    const o = defterOzeti(VERI, sayfalar, new Map([[anahtar, 'Başlangıç']]), TEMALAR)
    expect(o.baslikliSayfalar).toEqual([{ baslik: 'Başlangıç', ciltSayfa: 1 }])
  })

  it('boş defterde çökmez', () => {
    const o = defterOzeti([], [], new Map(), TEMALAR)
    expect(o.kayitSayisi).toBe(0)
    expect(o.ilkKayit).toBeNull()
    expect(o.aralik).toBe('')
  })

  it('tek kayıtlı defterde ilk ve son aynı, süre sıfır', () => {
    const tek = [gun('2026-05-01', k('2026-05-01', '09:00', 'tek'))]
    const { sayfalar } = sayfalariKur({ gunler: tek, kenarlar: new Map() })
    const o = defterOzeti(tek, sayfalar, new Map(), TEMALAR)
    expect(o.surenGun).toBe(0)
    expect(o.ilkKayit?.metin).toBe('tek')
    expect(o.sonKayit?.metin).toBe('tek')
    /* Tek günde açılıp kapanan defterde aralık tek tarih. */
    expect(o.aralik).toBe('1 mayıs 2026')
  })

  it('yorum, skor veya teşhis üretmez — yalnızca olgu döner', () => {
    const o = defterOzeti(VERI, akis().sayfalar, new Map(), TEMALAR)
    expect(Object.keys(o).sort()).toEqual(
      [
        'aralik', 'baslikliSayfalar', 'enSik', 'ilkKayit', 'ilkTarih', 'kayitSayisi',
        'sayfaSayisi', 'sonKayit', 'sonTarih', 'surenGun', 'yazilanGun',
      ].sort(),
    )
  })
})
