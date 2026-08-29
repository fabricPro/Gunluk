import { beforeEach, describe, expect, it } from 'vitest'
import { Depo } from '../src/veri/depo.js'
import { defteriAc } from '../src/veri/db.js'
import type { SqlSurucu } from '../src/veri/db.js'
import { VARSAYILAN_OLCU, ekMaliyeti, sayfalariKur } from '../src/cekirdek/sayfa.js'
import type { Ek, EkBilgi, Gun, KenarNotu } from '../src/cekirdek/tipler.js'
import { markdownAktar } from '../src/cekirdek/disaAktar.js'
import { testSurucusu } from './surucu.js'

let db: SqlSurucu
let depo: Depo

beforeEach(async () => {
  db = await defteriAc(testSurucusu())
  depo = new Depo(db)
})

/* Küçük ama gerçek bir base64 gövde. */
const GOVDE = '/9j/4AAQSkZJRgABAQEASABIAAD' + 'A'.repeat(200)
const ornekEk = (kayitId: string, en = 1200, boy = 900): Ek => ({
  kayitId,
  tur: 'image/jpeg',
  veri: GOVDE,
  en,
  boy,
  bayt: Math.round(GOVDE.length * 0.75),
})

describe('ek · depo', () => {
  it('yazar ve gövdesiyle geri okur', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-08-28', saat: '14:50', metin: 'bilet' })
    await depo.ekYaz(ornekEk(k.id))
    const geri = await depo.ekVeri(k.id)
    expect(geri?.veri).toBe(GOVDE)
    expect(geri?.en).toBe(1200)
    expect(geri?.boy).toBe(900)
  })

  it('kayıt başına tek ek — ikincisi birincinin yerine geçer', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-08-28', saat: '14:50', metin: 'bilet' })
    await depo.ekYaz(ornekEk(k.id))
    await depo.ekYaz({ ...ornekEk(k.id, 800, 800), veri: 'ZZZZ' })
    expect((await db.tek<{ n: number }>('SELECT count(*) AS n FROM ek'))?.n).toBe(1)
    expect((await depo.ekVeri(k.id))?.veri).toBe('ZZZZ')
  })

  it('üstveri okuması base64 gövdeyi getirmiyor', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-08-28', saat: '14:50', metin: 'bilet' })
    await depo.ekYaz(ornekEk(k.id))
    const bilgi = (await depo.ekler()).get(k.id)!
    expect(bilgi.en).toBe(1200)
    /* Asıl mesele bu: on yıllık defterin fotoğrafları belleğe çekilmiyor. */
    expect(Object.keys(bilgi)).not.toContain('veri')
  })

  it('kayıt silinince ek de gider', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-08-28', saat: '14:50', metin: 'bilet' })
    await depo.ekYaz(ornekEk(k.id))
    await depo.kayitSil(k.id)
    expect((await db.tek<{ n: number }>('SELECT count(*) AS n FROM ek'))?.n).toBe(0)
  })

  it('başka defterin ekini getirmiyor', async () => {
    const a = await depo.defterAc('A', 'kahve')
    const b = await depo.defterAc('B', 'kahve')
    depo.defteriSec(a.id)
    const k = await depo.kayitEkle({ tarih: '2026-08-28', saat: '14:50', metin: 'bilet' })
    await depo.ekYaz(ornekEk(k.id))
    depo.defteriSec(b.id)
    expect((await depo.ekler()).size).toBe(0)
    depo.defteriSec(a.id)
    expect((await depo.ekler()).size).toBe(1)
  })
})

/* ── sayfa akışı ───────────────────────────────────────────── */

const gun = (metin: string, id = 'k1'): Gun[] => [
  { tarih: '2026-08-28', ad: 'cuma', kayitlar: [
    { id, tarih: '2026-08-28', saat: '14:50', metin, temalar: [], duzenlendi: false, soru: null },
  ] },
]
const bilgi = (en: number, boy: number): EkBilgi =>
  ({ kayitId: 'k1', tur: 'image/jpeg', en, boy, bayt: 1000 })

describe('ek · sayfa akışı', () => {
  it('dikey ek yatay ekten fazla yer kaplıyor', () => {
    const yatay = ekMaliyeti(bilgi(1600, 900), VARSAYILAN_OLCU)
    const dikey = ekMaliyeti(bilgi(900, 1600), VARSAYILAN_OLCU)
    expect(dikey).toBeGreaterThan(yatay)
  })

  it('çok uzun görselin maliyeti tavanda duruyor', () => {
    const uzun = ekMaliyeti(bilgi(1000, 100000), VARSAYILAN_OLCU)
    expect(uzun).toBe(VARSAYILAN_OLCU.ekSabit + VARSAYILAN_OLCU.ekTavan)
  })

  /* Tavan CSS'le aynı sayı olmalı: maliyet kırpılıp görsel kırpılmayınca
     sayfa sessizce taşıyordu. */
  it('tavan sayfanın yarısını geçmiyor', () => {
    const enBuyuk = ekMaliyeti(bilgi(1, 10000), VARSAYILAN_OLCU)
    expect(enBuyuk).toBeLessThan(VARSAYILAN_OLCU.hacim / 2)
  })

  it('ek sayfa bütçesinden pay alıyor', () => {
    const metin = 'a '.repeat(200)
    const eksiz = sayfalariKur({ gunler: gun(metin), kenarlar: new Map() })
    const ekli = sayfalariKur({
      gunler: gun(metin),
      kenarlar: new Map(),
      ekler: new Map([['k1', bilgi(900, 1600)]]),
    })
    expect(ekli.sayfalar[0]!.hacim).toBeGreaterThan(eksiz.sayfalar[0]!.hacim)
  })

  it('ek kaydın SON parçasıyla geliyor', () => {
    /* Tek sayfaya sığmayacak kadar uzun bir kayıt: bölünecek. */
    const akis = sayfalariKur({
      gunler: gun('kelime '.repeat(400)),
      kenarlar: new Map(),
      ekler: new Map([['k1', bilgi(1200, 900)]]),
    })
    const ekliSayfa = akis.sayfalar.findIndex((s) => s.ogeler.some((o) => o.tip === 'ek'))
    expect(ekliSayfa).toBe(akis.sayfalar.length - 1)
    const son = akis.sayfalar[ekliSayfa]!
    const kayitOge = son.ogeler.filter((o) => o.tip === 'kayit').at(-1)!
    expect(kayitOge.tip === 'kayit' && kayitOge.sonParca).toBe(true)
  })

  it('hiçbir sayfa taşmıyor', () => {
    const akis = sayfalariKur({
      gunler: gun('kelime '.repeat(400)),
      kenarlar: new Map(),
      ekler: new Map([['k1', bilgi(900, 1600)]]),
    })
    for (const s of akis.sayfalar) expect(s.hacim).toBeLessThanOrEqual(VARSAYILAN_OLCU.hacim)
  })

  it('eksiz akış bugünküyle birebir aynı — regresyon', () => {
    const metin = 'kelime '.repeat(300)
    const a = sayfalariKur({ gunler: gun(metin), kenarlar: new Map() })
    const b = sayfalariKur({ gunler: gun(metin), kenarlar: new Map(), ekler: new Map() })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  /*
   * Kuyruk tavanı olmasaydı akış burada sonsuza kadar dönüyordu: kenar
   * notunun maliyeti bölünen metinden düşülmediği için 1. koşul hiçbir
   * zaman tutmuyor, 2. koşul da atlanıyordu. Ek gelmeden önce de vardı,
   * yalnızca kenar notu arayüzü olmadığı için tetiklenmemişti.
   */
  it('sayfadan uzun kenar notu akışı kilitlemiyor', () => {
    const kenarlar = new Map<string, KenarNotu>([
      ['k1', { id: 'n1', kayitId: 'k1', metin: 'x'.repeat(5000), tarih: '28 ağustos' }],
    ])
    const akis = sayfalariKur({ gunler: gun('kısa bir gün'), kenarlar })
    expect(akis.sayfalar.length).toBeGreaterThan(0)
    expect(akis.sayfalar.length).toBeLessThan(20)
  })
})

describe('ek · dışa aktarma', () => {
  it('markdown içine data: URI olarak gömülüyor', () => {
    const md = markdownAktar([
      {
        defter: {
          id: 'd1', ad: 'Defter', cilt: 1, kapak: 'kahve', raf: 0, sira: 0,
          sayfaSiniri: 45, kapandi: false, kapanma: null, kayitSayisi: 1,
        },
        gunler: gun('bilet'),
        kenarlar: new Map(),
        basliklar: new Map(),
        ekler: new Map([['k1', ornekEk('k1')]]),
      },
    ])
    expect(md).toContain('![ek](data:image/jpeg;base64,')
    expect(md).toContain(GOVDE)
  })
})
