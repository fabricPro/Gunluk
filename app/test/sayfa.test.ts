import { describe, expect, it } from 'vitest'
import {
  CILT_SAYFA, SABIT_OLCU, SAYFA_HACIM, ciltleriKur, sayfaBul, sayfalariKur, sozcuktenKes,
} from '../src/cekirdek/sayfa.js'
import type { Gun, KenarNotu, Sayfa } from '../src/cekirdek/tipler.js'

/**
 * Demodaki sayfalariKur()'un referans kopyası — bir düzeltmeyle.
 *
 * Demo, gün başlığı sayfa sınırında yeniden yazıldığında onun 44 karakterlik
 * maliyetini saymıyordu: maliyet sayfa kırılmadan ÖNCE hesaplanıyor, kırılma
 * sonrası yeni başlık ekleniyor ama hacme eklenmiyordu. Sonuç, sayfanın
 * sessizce taşması. Üretimde bu düzeltildi (başlık maliyeti kırılmadan sonra
 * yeniden hesaplanıyor), bu referans da düzeltilmiş hâli izliyor.
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
      const govde =
        k.metin.length +
        SABIT_OLCU.kayitSabit +
        (kn ? kn.metin.length + SABIT_OLCU.kenarSabit : 0)
      if (
        s.hacim + govde + (basYok ? SABIT_OLCU.gunBasligi : 0) > SABIT_OLCU.hacim &&
        s.ogeler.length
      ) {
        SAYFALAR.push(s)
        s = { ogeler: [], hacim: 0 }
        basYok = true
      }
      const maliyet = govde + (basYok ? SABIT_OLCU.gunBasligi : 0)
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
        soru: null,
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
    /* Sondaki boş yazma sayfası karşılaştırmaya girmez. */
    expect(sayfalar.map(kayitlariAl).filter((k) => k.length)).toEqual(demoAkisi(ham, {}))
  })

  it('kenar notlarıyla da demoyla birebir aynı sayfaları üretir', () => {
    const { gunler, ham } = ornekVeri(90)
    const kenarlar = new Map<string, KenarNotu[]>()
    const demoKenar: Record<string, { metin: string }> = {}
    gunler.forEach((g, i) => {
      if (i % 5) return
      const k = g.kayitlar[1]
      if (!k) return
      const metin = 'kenar notu ' + 'y'.repeat(i % 40)
      kenarlar.set(k.id, [{ id: 'kn' + i, kayitId: k.id, metin, tarih: g.tarih, olusturma: 0 }])
      demoKenar[g.tarih + '|1'] = { metin }
    })
    const { sayfalar } = sayfalariKur({ gunler, kenarlar })
    expect(sayfalar.map(kayitlariAl).filter((k) => k.length)).toEqual(demoAkisi(ham, demoKenar))
  })

  /**
   * Sabitler artık demonun değil, REFERANS CİHAZIN ölçüsü (K-051).
   *
   * Bir kez ölçülüp donduruldular; buradaki sayılar o dondurmayı
   * sabitliyor. Değişirlerse var olan defterlerin sayfa numaraları kayar,
   * yani bu bir "kolayca güncellenecek" test değil — değiştirmek bilinçli
   * bir karar olmak zorunda.
   */
  it('sayfa ölçüsü dondurulmuş değerlerde', () => {
    expect(SAYFA_HACIM).toBe(444)
    expect(SABIT_OLCU.hacim).toBe(SAYFA_HACIM)
    expect(CILT_SAYFA).toBe(45)
    /* Bir ek sayfanın yarısından fazlasını yiyemez. */
    expect(SABIT_OLCU.ekSabit + SABIT_OLCU.ekTavan).toBeLessThan(SABIT_OLCU.hacim / 2)
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

  it('hiçbir sayfa hacmi aşmaz — kağıdın dışına taşan metin olmaz', () => {
    const { gunler } = ornekVeri(200)
    const { sayfalar } = sayfalariKur({ gunler, kenarlar: new Map() })
    for (const s of sayfalar) expect(s.hacim).toBeLessThanOrEqual(SAYFA_HACIM)
  })

  it('sayfa başlığı anahtarı, sayfada BAŞLAYAN ilk kaydın kimliği (K-005)', () => {
    const { gunler } = ornekVeri(30)
    const { sayfalar } = sayfalariKur({ gunler, kenarlar: new Map() })
    for (const s of sayfalar) {
      const ilkBaslangic = s.ogeler.find((o) => o.tip === 'kayit' && o.parcaNo === 0)
      expect(s.anahtar).toBe(
        ilkBaslangic && ilkBaslangic.tip === 'kayit' ? ilkBaslangic.kayitId : null,
      )
    }
  })

  it('yeni sayfaya taşan gün, gün başlığını tekrar yazar', () => {
    const { gunler } = ornekVeri(20)
    const { sayfalar } = sayfalariKur({ gunler, kenarlar: new Map() })
    for (const s of sayfalar.filter((x) => x.ogeler.length)) expect(s.ogeler[0]!.tip).toBe('gun')
  })

  it('son sayfada yazma alanına yer kalır', () => {
    for (const gun of [1, 7, 30, 120]) {
      const { gunler } = ornekVeri(gun)
      const { sayfalar } = sayfalariKur({ gunler, kenarlar: new Map() })
      const son = sayfalar[sayfalar.length - 1]!
      expect(son.hacim + 90).toBeLessThanOrEqual(SAYFA_HACIM)
    }
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
    const baslayanlar = sayfalar.flatMap((s) =>
      s.ogeler.flatMap((o) => (o.tip === 'kayit' && o.parcaNo === 0 ? [o.kayitId] : [])),
    )
    expect(new Set(baslayanlar).size).toBe(baslayanlar.length)
    expect(baslayanlar.length).toBe(gunler.reduce((n, g) => n + g.kayitlar.length, 0))
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

describe('K-014 — uzun kayıt sayfalara bölünür', () => {
  const uzunMetin = (n: number): string => {
    const s: string[] = []
    for (let i = 0; s.join(' ').length < n; i++) s.push(`sözcük${i}`)
    return s.join(' ')
  }

  const kayitYap = (id: string, metin: string) => ({
    id,
    tarih: '2026-01-01',
    saat: '09:00',
    metin,
    temalar: [] as string[],
    duzenlendi: false,
    soru: null,
  })

  const tekGun = (...metinler: string[]): Gun[] => [
    {
      tarih: '2026-01-01',
      ad: 'perşembe',
      kayitlar: metinler.map((m, i) => kayitYap('k' + i, m)),
    },
  ]

  const parcalar = (sayfalar: Sayfa[], id: string) =>
    sayfalar.flatMap((s) => s.ogeler.filter((o) => o.tip === 'kayit' && o.kayitId === id))

  it('5000 karakterlik tek kayıt birden çok sayfaya yayılır', () => {
    const metin = uzunMetin(5000)
    const { sayfalar } = sayfalariKur({ gunler: tekGun(metin), kenarlar: new Map() })
    expect(sayfalar.length).toBeGreaterThan(5)
    for (const s of sayfalar) expect(s.hacim).toBeLessThanOrEqual(SAYFA_HACIM)
  })

  it('parçalar birleşince özgün metin BİREBİR geri gelir', () => {
    for (const uzunluk of [700, 1538, 5000, 20000]) {
      const metin = uzunMetin(uzunluk)
      const { sayfalar } = sayfalariKur({ gunler: tekGun(metin), kenarlar: new Map() })
      const birlesik = parcalar(sayfalar, 'k0')
        .map((o) => (o.tip === 'kayit' ? o.metin : ''))
        .join('')
      expect(birlesik).toBe(metin)
    }
  })

  it('satır başları ve paragraflar korunur', () => {
    const metin = ['Birinci paragraf.', 'İkinci paragraf.', uzunMetin(2000)].join('\n\n')
    const { sayfalar } = sayfalariKur({ gunler: tekGun(metin), kenarlar: new Map() })
    const birlesik = parcalar(sayfalar, 'k0')
      .map((o) => (o.tip === 'kayit' ? o.metin : ''))
      .join('')
    expect(birlesik).toBe(metin)
  })

  it('sözcük ortasından kesilmez', () => {
    const metin = uzunMetin(4000)
    const { sayfalar } = sayfalariKur({ gunler: tekGun(metin), kenarlar: new Map() })
    const p = parcalar(sayfalar, 'k0')
    for (let i = 0; i < p.length - 1; i++) {
      const o = p[i]!
      if (o.tip !== 'kayit') continue
      /* Her parça bir boşlukla bitmeli — kesim sözcük sınırından. */
      expect(o.metin).toMatch(/[\s]$/)
    }
  })

  it('kırılamayan tek uzun dizi yine de bölünür, döngüye girmez', () => {
    const metin = 'z'.repeat(4000)
    const { sayfalar } = sayfalariKur({ gunler: tekGun(metin), kenarlar: new Map() })
    expect(sayfalar.length).toBeGreaterThan(4)
    const birlesik = parcalar(sayfalar, 'k0')
      .map((o) => (o.tip === 'kayit' ? o.metin : ''))
      .join('')
    expect(birlesik).toBe(metin)
  })

  it('saat damgası yalnızca ilk parçada, kenar notu yalnızca son parçada', () => {
    const metin = uzunMetin(3000)
    const kenarlar = new Map([
      ['k0', [{ id: 'kn', kayitId: 'k0', metin: 'sonradan düşülen not', tarih: '2026-01-02', olusturma: 0 }]],
    ])
    const { sayfalar } = sayfalariKur({ gunler: tekGun(metin), kenarlar })
    const p = parcalar(sayfalar, 'k0').filter((o) => o.tip === 'kayit')
    expect(p.filter((o) => o.tip === 'kayit' && o.parcaNo === 0)).toHaveLength(1)
    expect(p.filter((o) => o.tip === 'kayit' && o.sonParca)).toHaveLength(1)
    /* kenar notu son parçanın sayfasında olmalı */
    const kenarSayfa = sayfalar.findIndex((s) => s.ogeler.some((o) => o.tip === 'kenar'))
    const sonParcaSayfa = sayfalar.findIndex((s) =>
      s.ogeler.some((o) => o.tip === 'kayit' && o.kayitId === 'k0' && o.sonParca),
    )
    expect(kenarSayfa).toBe(sonParcaSayfa)
  })

  it('kısa kayıt bölünmez — bütün hâlde sonraki sayfaya taşınır', () => {
    /* İlk kayıt sayfayı neredeyse doldurur, ikincisi sığmaz ama kısadır. */
    const { sayfalar } = sayfalariKur({
      gunler: tekGun(uzunMetin(520), 'Bu kısa kayıt bölünmemeli, bütün hâlde taşınmalı.'),
      kenarlar: new Map(),
    })
    const ikinci = parcalar(sayfalar, 'k1')
    expect(ikinci).toHaveLength(1)
    expect(ikinci[0]!.tip === 'kayit' && ikinci[0]!.parcaNo).toBe(0)
  })

  it('devam sayfasına başlık verilemez — anahtar null', () => {
    const { sayfalar } = sayfalariKur({ gunler: tekGun(uzunMetin(3000)), kenarlar: new Map() })
    expect(sayfalar[0]!.anahtar).toBe('k0')
    expect(sayfalar[1]!.anahtar).toBeNull()
  })

  it('sayfaBul kaydın BAŞINI bulur, ortasını değil', () => {
    const { sayfalar } = sayfalariKur({
      gunler: tekGun('kısa bir kayıt', uzunMetin(3000)),
      kenarlar: new Map(),
    })
    const s = sayfaBul(sayfalar, 'k1')
    expect(s).not.toBeNull()
    const o = s!.ogeler.find((x) => x.tip === 'kayit' && x.kayitId === 'k1')
    expect(o && o.tip === 'kayit' && o.parcaNo).toBe(0)
  })
})

describe('sozcuktenKes', () => {
  it('birleştirince özgün metni verir', () => {
    const m = 'bir iki üç dört beş altı yedi sekiz'
    for (const sinir of [1, 5, 10, 20, 100]) {
      const [a, b] = sozcuktenKes(m, sinir)
      expect(a + b).toBe(m)
    }
  })
  it('sınır metinden büyükse hepsini verir', () => {
    expect(sozcuktenKes('kısa', 100)).toEqual(['kısa', ''])
  })
  it('boşluk yoksa karakterden keser', () => {
    const [a, b] = sozcuktenKes('zzzzzzzzzz', 4)
    expect(a).toBe('zzzz')
    expect(b).toBe('zzzzzz')
  })
  it('satır başından da keser', () => {
    const [a, b] = sozcuktenKes('birinci satır\nikinci satır', 15)
    expect(a + b).toBe('birinci satır\nikinci satır')
    expect(a.endsWith('\n')).toBe(true)
  })
})
