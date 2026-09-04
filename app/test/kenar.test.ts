import { beforeEach, describe, expect, it } from 'vitest'
import { Depo } from '../src/veri/depo.js'
import { defteriAc } from '../src/veri/db.js'
import type { SqlSurucu } from '../src/veri/db.js'
import { SABIT_OLCU, sayfalariKur } from '../src/cekirdek/sayfa.js'
import type { Gun, KenarNotu } from '../src/cekirdek/tipler.js'
import { markdownAktar } from '../src/cekirdek/disaAktar.js'
import { testSurucusu } from './surucu.js'

let db: SqlSurucu
let depo: Depo

beforeEach(async () => {
  db = await defteriAc(testSurucusu())
  depo = new Depo(db)
})

const kayitAc = () =>
  depo.kayitEkle({ tarih: '2026-03-12', saat: '03:00', metin: 'dibi gördüm' })

describe('kenar notu · depo', () => {
  /*
   * Bugünkü hatanın regresyonu: kenarEkle iki satır açıyordu ama okuma
   * yolu Map'e tek not koyduğu için ikincisi sessizce kayboluyordu.
   */
  it('aynı kayda üç not yazılıyor, üçü de sırayla geri geliyor', async () => {
    const k = await kayitAc()
    await depo.kenarEkle(k.id, 'birinci', '2026-06-14')
    await depo.kenarEkle(k.id, 'ikinci', '2027-06-14')
    await depo.kenarEkle(k.id, 'üçüncü', '2028-06-14')
    const notlar = (await depo.kenarlar()).get(k.id)!
    expect(notlar.map((n) => n.metin)).toEqual(['birinci', 'ikinci', 'üçüncü'])
  })

  it('tarihi ve zaman damgasını depo koyuyor', async () => {
    const k = await kayitAc()
    const n = await depo.kenarEkle(k.id, 'bugünden')
    expect(n.tarih).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(n.olusturma).toBeGreaterThan(0)
    expect((await depo.kenarlar()).get(k.id)![0]!.olusturma).toBe(n.olusturma)
  })

  it('silme yalnızca o notu götürüyor', async () => {
    const k = await kayitAc()
    const a = await depo.kenarEkle(k.id, 'kalacak')
    const b = await depo.kenarEkle(k.id, 'gidecek')
    await depo.kenarSil(b.id)
    const notlar = (await depo.kenarlar()).get(k.id)!
    expect(notlar.map((n) => n.metin)).toEqual(['kalacak'])
    expect(notlar[0]!.id).toBe(a.id)
  })

  it('kayıt silinince notların hepsi gidiyor', async () => {
    const k = await kayitAc()
    await depo.kenarEkle(k.id, 'bir')
    await depo.kenarEkle(k.id, 'iki')
    await depo.kayitSil(k.id)
    expect((await depo.kenarlar()).size).toBe(0)
  })
})

/* ── sayfa akışı ───────────────────────────────────────────── */

const gun = (metin: string): Gun[] => [
  { tarih: '2026-03-12', ad: 'perşembe', kayitlar: [
    { id: 'k1', tarih: '2026-03-12', saat: '03:00', metin, temalar: [], duzenlendi: false, soru: null },
  ] },
]
const not = (i: number, uzunluk = 280): KenarNotu => ({
  id: 'n' + i,
  kayitId: 'k1',
  metin: 'n'.repeat(uzunluk),
  tarih: '2026-06-14',
  olusturma: 0,
})

describe('kenar notu · sayfa akışı', () => {
  it('notlar yazılma sırasıyla, kaydın ardından basılıyor', () => {
    const kenarlar = new Map([['k1', [not(1, 20), not(2, 20), not(3, 20)]]])
    const { sayfalar } = sayfalariKur({ gunler: gun('kısa gün'), kenarlar })
    const kenarOgeleri = sayfalar.flatMap((s) => s.ogeler).filter((o) => o.tip === 'kenar')
    expect(kenarOgeleri.map((o) => o.tip === 'kenar' && o.id)).toEqual(['n1', 'n2', 'n3'])
  })

  /*
   * Ek işinde öğrendiğimiz tuzağın kenar notu hâli: maliyeti kırpıp
   * basımı kırpmamak sayfayı sessizce taşırır. Kuyruk artık sonraki
   * sayfaya dökülüyor.
   */
  it('sayfaya sığmayan notlar sonraki sayfaya dökülüyor, hiçbir sayfa taşmıyor', () => {
    const kenarlar = new Map([['k1', [not(1), not(2), not(3), not(4), not(5), not(6)]]])
    const { sayfalar } = sayfalariKur({ gunler: gun('kısa bir gün'), kenarlar })
    expect(sayfalar.length).toBeGreaterThan(1)
    for (const s of sayfalar) expect(s.hacim).toBeLessThanOrEqual(SABIT_OLCU.hacim)
    /* Hiçbir not düşmemiş olmalı. */
    const basilan = sayfalar.flatMap((s) => s.ogeler).filter((o) => o.tip === 'kenar')
    expect(basilan).toHaveLength(6)
  })

  it('notsuz akış bugünküyle birebir aynı — regresyon', () => {
    const metin = 'kelime '.repeat(300)
    const a = sayfalariKur({ gunler: gun(metin), kenarlar: new Map() })
    const b = sayfalariKur({ gunler: gun(metin), kenarlar: new Map([['k1', []]]) })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('kenar notu · dışa aktarma', () => {
  it('bütün notlar markdown çıktısında', () => {
    const md = markdownAktar([
      {
        defter: {
          id: 'd1', ad: 'Defter', cilt: 1, kapak: 'kahve', raf: 0, sira: 0,
          sayfaSiniri: 45, kapandi: false, kapanma: null, kayitSayisi: 1,
        },
        gunler: gun('dibi gördüm'),
        kenarlar: new Map([['k1', [
          { ...not(1, 5), metin: 'birinci not' },
          { ...not(2, 5), metin: 'ikinci not' },
        ]]]),
        basliklar: new Map(),
      },
    ])
    expect(md).toContain('birinci not')
    expect(md).toContain('ikinci not')
  })
})
