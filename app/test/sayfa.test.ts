import { describe, expect, it } from 'vitest'
import { CILT_SAYFA, SAYFA_HACIM, ciltleriKur, sayfaBul, sayfalariKur } from '../src/cekirdek/sayfa.js'
import type { Gun, KenarNotu, Sayfa } from '../src/cekirdek/tipler.js'

/**
 * Demodaki özgün sayfalariKur() — birebir kopya, referans olarak duruyor.
 * Yeni uygulama bununla aynı bölünmeyi üretmek zorunda.
 */
function demoAkisi(
  gunler: { tarih: string; ad: string; kayitlar: { metin: string }[] }[],
  kenar: Record<string, { metin: string }>,
): string[][] {
  const SAYFALAR: { ogeler: string[]; hacim: number }[] = []
  let s: { ogeler: string[]; hacim: number } = { ogeler: [], hacim: 0 }
  gunler.forEach((g) => {
    let basYok = true
    g.kayitlar.forEach((k, ki) => {
      const kn = kenar[g.tarih + '|' + ki]
      const maliyet = k.metin.length + 22 + (basYok ? 44 : 0) + (kn ? kn.metin.length + 20 : 0)
      if (s.hacim + maliyet > 620 && s.ogeler.length) {
        SAYFALAR.push(s)
        s = { ogeler: [], hacim: 0 }
        basYok = true
      }
      if (basYok) basYok = false
      s.ogeler.push(g.tarih + '|' + ki)
      s.hacim += maliyet
    })
  })
  if (s.ogeler.length) SAYFALAR.push(s)
  return SAYFALAR.map((x) => x.ogeler)
}

/* Belirlenimci örnek veri — rastgelelik yok, test her koşuda aynı. */
function ornekVeri(gunSayisi: number, kayitSayisi = 3) {
  const gunler: Gun[] = []
  const ham: { tarih: string; ad: string; kayitlar: { metin: string }[] }[] = []
  for (let i = 0; i < gunSayisi; i++) {
    const d = new Date(2025, 5, 1 + i)
    const tarih = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const kayitlar = []
    const hamK = []
    for (let j = 0; j < kayitSayisi; j++) {
      /* uzunluk gün ve sıraya göre değişsin ki sayfa sınırları çeşitlensin */
      const metin = 'x'.repeat(60 + ((i * 7 + j * 31) % 190))
      kayitlar.push({
        id: `${tarih}|${j}`,
        tarih,
        saat: `${String(8 + j).padStart(2, '0')}:00`,
        metin,
        temalar: [],
        duzenlendi: false,
      })
      hamK.push({ metin })
    }
    gunler.push({ tarih, ad: 'gün', kayitlar })
    ham.push({ tarih, ad: 'gün', kayitlar: hamK })
  }
  return { gunler, ham }
}

const kayitlariAl = (s: Sayfa): string[] =>
  s.ogeler.filter((o) => o.tip === 'kayit').map((o) => (o.tip === 'kayit' ? o.kayitId : ''))

describe('sayfalariKur — demoyla aynı bölünme', () => {
  it('kenar notu olmadan demoyla birebir aynı sayfaları üretir', () => {
    const { gunler, ham } = ornekVeri(120)
    const { sayfalar } = sayfalariKur({ gunler, kenarlar: new Map() })
    expect(sayfalar.map(kayitlariAl)).toEqual(demoAkisi(ham, {}))
  })

  it('kenar notlarıyla da demoyla birebir aynı sayfaları üretir', () => {
    const { gunler, ham } = ornekVeri(90)
    const kenarlar = new Map<string, KenarNotu>()
    const demoKenar: Record<string, { metin: string }> = {}
    gunler.forEach((g, i) => {
      if (i % 5) return
      const k = g.kayitlar[1]
      if (!k) return
      const metin = 'kenar notu ' + 'y'.repeat(i % 40)
      kenarlar.set(k.id, { id: 'kn' + i, kayitId: k.id, metin, tarih: g.tarih })
      demoKenar[g.tarih + '|1'] = { metin }
    })
    const { sayfalar } = sayfalariKur({ gunler, kenarlar })
    expect(sayfalar.map(kayitlariAl)).toEqual(demoAkisi(ham, demoKenar))
  })

  it('sabitler demodan değişmedi', () => {
    expect(SAYFA_HACIM).toBe(620)
    expect(CILT_SAYFA).toBe(45)
  })
})

describe('sayfalariKur — sınır durumları', () => {
  it('sıfır kayıtla çökmez, boş akış döner', () => {
    const { sayfalar, ciltler } = sayfalariKur({ gunler: [], kenarlar: new Map() })
    expect(sayfalar).toEqual([])
    expect(ciltler).toEqual([])
  })

  it('tek kayıt tek sayfa, tek cilt', () => {
    const { gunler } = ornekVeri(1, 1)
    const { sayfalar, ciltler } = sayfalariKur({ gunler, kenarlar: new Map() })
    expect(sayfalar).toHaveLength(1)
    expect(sayfalar[0]!.no).toBe(1)
    expect(sayfalar[0]!.cilt).toBe(1)
    expect(sayfalar[0]!.ciltSayfa).toBe(1)
    expect(ciltler).toHaveLength(1)
    expect(ciltler[0]!.kapali).toBe(false)
  })

  it('bir sayfaya sığmayan tek kayıt yine de kendi sayfasına yazılır', () => {
    const uzun = 'z'.repeat(SAYFA_HACIM * 3)
    const gunler: Gun[] = [
      {
        tarih: '2026-01-01',
        ad: 'perşembe',
        kayitlar: [
          { id: 'a', tarih: '2026-01-01', saat: '09:00', metin: uzun, temalar: [], duzenlendi: false },
          { id: 'b', tarih: '2026-01-01', saat: '10:00', metin: 'kısa', temalar: [], duzenlendi: false },
        ],
      },
    ]
    const { sayfalar } = sayfalariKur({ gunler, kenarlar: new Map() })
    expect(kayitlariAl(sayfalar[0]!)).toEqual(['a'])
    expect(kayitlariAl(sayfalar[1]!)).toEqual(['b'])
  })

  it('sayfa başlığı anahtarı ilk kaydın kimliği (K-005)', () => {
    const { gunler } = ornekVeri(30)
    const { sayfalar } = sayfalariKur({ gunler, kenarlar: new Map() })
    for (const s of sayfalar) expect(s.anahtar).toBe(kayitlariAl(s)[0])
  })

  it('yeni sayfaya taşan gün, gün başlığını tekrar yazar', () => {
    const { gunler } = ornekVeri(20)
    const { sayfalar } = sayfalariKur({ gunler, kenarlar: new Map() })
    for (const s of sayfalar) expect(s.ogeler[0]!.tip).toBe('gun')
  })

  it('cilt 45 sayfada dolar ve öncekiler kapalı işaretlenir', () => {
    const { gunler } = ornekVeri(400)
    const { sayfalar, ciltler } = sayfalariKur({ gunler, kenarlar: new Map() })
    expect(sayfalar.length).toBeGreaterThan(CILT_SAYFA)
    expect(ciltler.length).toBe(Math.ceil(sayfalar.length / CILT_SAYFA))
    expect(ciltler[0]!.sayfa).toBe(CILT_SAYFA)
    expect(ciltler[0]!.kapali).toBe(true)
    expect(ciltler[ciltler.length - 1]!.kapali).toBe(false)
  })
})

describe('K-006 — kapanan cilt donuyor', () => {
  it('eski kayıt uzayınca donmuş sayfaların içeriği değişmez', () => {
    const { gunler } = ornekVeri(200)
    const ilk = sayfalariKur({ gunler, kenarlar: new Map() })
    const donmus = ilk.sayfalar.filter((s) => s.cilt === 1)
    const oncekiIcerik = donmus.map(kayitlariAl)

    /* Birinci cilde düşen eski bir kayıt uzatılıyor. */
    gunler[2]!.kayitlar[0]!.metin += 'q'.repeat(900)

    const donmadan = sayfalariKur({ gunler, kenarlar: new Map() })
    expect(donmadan.sayfalar.filter((s) => s.cilt === 1).map(kayitlariAl)).not.toEqual(oncekiIcerik)

    const dondurulmus = sayfalariKur({ gunler, kenarlar: new Map(), donmusSayfalar: donmus })
    expect(dondurulmus.sayfalar.filter((s) => s.cilt === 1).map(kayitlariAl)).toEqual(oncekiIcerik)
  })

  it('donmuş sayfalardaki kayıtlar ikinci kez akıtılmaz', () => {
    const { gunler } = ornekVeri(150)
    const ilk = sayfalariKur({ gunler, kenarlar: new Map() })
    const donmus = ilk.sayfalar.filter((s) => s.cilt === 1)
    const { sayfalar } = sayfalariKur({ gunler, kenarlar: new Map(), donmusSayfalar: donmus })
    const hepsi = sayfalar.flatMap(kayitlariAl)
    expect(new Set(hepsi).size).toBe(hepsi.length)
    expect(hepsi.length).toBe(gunler.reduce((n, g) => n + g.kayitlar.length, 0))
  })
})

describe('yardımcılar', () => {
  it('sayfaBul kaydın sayfasını bulur', () => {
    const { gunler } = ornekVeri(50)
    const { sayfalar } = sayfalariKur({ gunler, kenarlar: new Map() })
    const hedef = gunler[30]!.kayitlar[1]!
    const s = sayfaBul(sayfalar, hedef.id)
    expect(s).not.toBeNull()
    expect(kayitlariAl(s!)).toContain(hedef.id)
    expect(sayfaBul(sayfalar, 'olmayan-kayit')).toBeNull()
  })

  it('ciltleriKur adları bağlar', () => {
    const { gunler } = ornekVeri(100)
    const { sayfalar } = sayfalariKur({ gunler, kenarlar: new Map() })
    const ciltler = ciltleriKur(sayfalar, new Map([[1, 'Son yıl']]))
    expect(ciltler[0]!.ad).toBe('Son yıl')
    expect(ciltler[1]?.ad ?? null).toBeNull()
  })
})
