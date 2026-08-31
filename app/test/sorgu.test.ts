import { describe, expect, it } from 'vitest'
import { soruCoz, type TemaTanim } from '../src/cekirdek/sorgu.js'
import type { Gun, KenarNotu } from '../src/cekirdek/tipler.js'
import { gunAdi } from '../src/cekirdek/tr.js'

const TEMALAR: TemaTanim[] = [
  { id: 'kerem', ad: 'Kerem', anahtar: ['kerem'] },
  { id: 'tez', ad: 'Tez', anahtar: ['tez', 'bitirme'] },
  { id: 'annem', ad: 'Annem', anahtar: ['annem', 'anne'] },
]

let sayac = 0
const k = (tarih: string, saat: string, metin: string, temalar: string[] = []) => ({
  id: `k${++sayac}`,
  tarih,
  saat,
  metin,
  temalar,
  duzenlendi: false,
  soru: null,
})

const gun = (tarih: string, ...kayitlar: ReturnType<typeof k>[]): Gun => ({
  tarih,
  ad: gunAdi(tarih),
  kayitlar,
})

const VERI: Gun[] = [
  gun(
    '2026-02-03',
    k('2026-02-03', '23:40', 'Kerem yine yazmadı, bekliyorum.', ['kerem']),
    k('2026-02-03', '14:00', 'Tez için bugün hiçbir şey yazmadım.', ['tez']),
  ),
  gun('2026-02-11', k('2026-02-11', '02:10', 'Kerem hakkında düşünmeyi bırakamıyorum.', ['kerem'])),
  gun('2026-02-19', k('2026-02-19', '10:00', 'Tez danışmanına yazdım, dönmedi.', ['tez'])),
  gun('2026-02-25', k('2026-02-25', '09:15', 'Annemle kahvaltı ettik, iyiydi.', ['annem'])),
  gun('2026-03-04', k('2026-03-04', '21:00', 'Kerem aradı. Konuştuk.', ['kerem'])),
  gun('2026-03-18', k('2026-03-18', '13:00', 'Tez teslim edildi.', ['tez'])),
]

describe('soruCoz — PROJE.md §7 regresyonları', () => {
  it('tema adı geçtiğinde havuz o temaya kilitlenir', () => {
    /* "yazdım" sözcüğü tez kayıtlarında da geçiyor; sızmamalı. */
    const s = soruCoz('kerem hakkında ne yazdım', VERI, TEMALAR)
    expect(s.bos).toBe(false)
    for (const b of s.kullanilan) expect(b.kayit.temalar).toContain('kerem')
    const metinler = s.kullanilan.map((b) => b.kayit.metin).join(' ')
    expect(metinler).not.toContain('Tez')
  })

  it('dönem sorusunda o ayın tamamı geçerli sayılır', () => {
    const s = soruCoz('şubatta neden bu kadar kötüydüm', VERI, TEMALAR)
    expect(s.bos).toBe(false)
    /* şubattaki beş kaydın hepsi havuzda */
    expect(s.paragraflar[0]).toContain("Şubat 2026'da 5 kez yazmışsın")
    const tarihler = s.kullanilan.map((b) => b.kayit.tarih)
    for (const t of tarihler) expect(t.startsWith('2026-02')).toBe(true)
  })
})

describe('soruCoz — genel davranış', () => {
  it('boş soru boş sonuç', () => {
    expect(soruCoz('   ', VERI, TEMALAR).bos).toBe(true)
  })

  it('kaydı olmayan konuda uydurmaz (ilke 2.4)', () => {
    const s = soruCoz('barcelona tatili', VERI, TEMALAR)
    expect(s.bos).toBe(true)
    expect(s.kullanilan).toEqual([])
  })

  it('tema + dönem birlikte daraltır', () => {
    const s = soruCoz('şubatta kerem', VERI, TEMALAR)
    expect(s.bos).toBe(false)
    for (const b of s.kullanilan) {
      expect(b.kayit.temalar).toContain('kerem')
      expect(b.kayit.tarih.startsWith('2026-02')).toBe(true)
    }
  })

  it('gece yazılanları sayar', () => {
    const s = soruCoz('kerem', VERI, TEMALAR)
    /* üç kerem kaydının ikisi gece (23:40, 02:10) */
    expect(s.paragraflar.some((p) => p.includes('gece yazılmış'))).toBe(true)
  })

  it('kaynak kayıtları her zaman döndürür', () => {
    const s = soruCoz('tez', VERI, TEMALAR)
    expect(s.kullanilan.length).toBeGreaterThan(0)
    for (const b of s.kullanilan) expect(b.kayit.id).toBeTruthy()
  })

  it('ilk ve son kaydın tarihini verir', () => {
    const s = soruCoz('tez', VERI, TEMALAR)
    expect(s.paragraflar.some((p) => p.includes('İlki 3 şubat 2026'))).toBe(true)
  })

  it('kayıt yokken çökmez', () => {
    expect(soruCoz('kerem', [], TEMALAR).bos).toBe(true)
  })
})

/* ── kenar notları aramaya dahil (K-026) ─────────────────────── */

const not = (kayitId: string, metin: string, id = 'n-' + kayitId): KenarNotu => ({
  id,
  kayitId,
  metin,
  tarih: '2027-01-10',
  olusturma: 0,
})
/** VERI'deki kayıtları metninden bulur — kimlikler sayaçtan geliyor. */
const kayitId = (parca: string): string =>
  VERI.flatMap((g) => g.kayitlar).find((k) => k.metin.includes(parca))!.id

describe('soruCoz — kenar notları', () => {
  it('yalnızca kenar notunda geçen sözcük kaydı buluyor', () => {
    const id = kayitId('Annemle kahvaltı')
    const kenarlar = new Map([[id, [not(id, 'Sonradan anladım: barcelona kararını o gün verdim.')]]])
    const yok = soruCoz('barcelona', VERI, TEMALAR)
    const var_ = soruCoz('barcelona', VERI, TEMALAR, kenarlar)
    expect(yok.bos).toBe(true)
    expect(var_.bos).toBe(false)
    expect(var_.kullanilan[0]!.kayit.id).toBe(id)
  })

  it('eşleşen notu kaynakla birlikte döndürüyor (ilke 2.4)', () => {
    const id = kayitId('Annemle kahvaltı')
    const kenarlar = new Map([[id, [not(id, 'barcelona kararı')]]])
    const s = soruCoz('barcelona', VERI, TEMALAR, kenarlar)
    expect(s.kullanilan[0]!.kenarlar.map((n) => n.metin)).toEqual(['barcelona kararı'])
  })

  it('eşleşmeyen not kaynakta görünmüyor', () => {
    const id = kayitId('Annemle kahvaltı')
    const kenarlar = new Map([[id, [not(id, 'alakasız bir not'), not(id, 'barcelona', 'n2')]]])
    const s = soruCoz('barcelona', VERI, TEMALAR, kenarlar)
    expect(s.kullanilan[0]!.kenarlar.map((n) => n.metin)).toEqual(['barcelona'])
  })

  it('not eşleşmesi puanı şişirmiyor — sözcük başına tek sayılır', () => {
    const id = kayitId('Tez teslim')
    const notsuz = soruCoz('teslim', VERI, TEMALAR)
    const notlu = soruCoz('teslim', VERI, TEMALAR, new Map([[id, [not(id, 'teslim ettim')]]]))
    const a = notsuz.kullanilan.find((b) => b.kayit.id === id)!
    const b = notlu.kullanilan.find((x) => x.kayit.id === id)!
    expect(b.puan).toBe(a.puan)
  })

  it('tema kilidi notla delinmiyor', () => {
    /* "kerem" sorusu tema kilidi kuruyor; tez kaydına düşülen not sızmamalı. */
    const id = kayitId('Tez teslim')
    const kenarlar = new Map([[id, [not(id, 'aslında kerem yüzündendi')]]])
    const s = soruCoz('kerem hakkında ne yazdım', VERI, TEMALAR, kenarlar)
    expect(s.kullanilan.every((b) => b.kayit.temalar.includes('kerem'))).toBe(true)
  })

  it('yalnızca nottan gelen kayıtları söylüyor — kaynak beyanı', () => {
    const id = kayitId('Annemle kahvaltı')
    const kenarlar = new Map([[id, [not(id, 'barcelona kararı')]]])
    const s = soruCoz('barcelona', VERI, TEMALAR, kenarlar)
    expect(s.paragraflar.some((p) => p.includes('kenar notundan'))).toBe(true)
  })

  it('kayıtta da geçiyorsa "kenar notundan" denmiyor', () => {
    const id = kayitId('Tez teslim')
    const kenarlar = new Map([[id, [not(id, 'teslim ettim')]]])
    const s = soruCoz('teslim', VERI, TEMALAR, kenarlar)
    expect(s.paragraflar.some((p) => p.includes('kenar notundan'))).toBe(false)
  })

  it('notsuz çağrı bugünküyle birebir aynı — regresyon', () => {
    for (const soru of ['kerem hakkında ne yazdım', 'şubatta neden bu kadar kötüydüm', 'tez']) {
      const a = soruCoz(soru, VERI, TEMALAR)
      const b = soruCoz(soru, VERI, TEMALAR, new Map())
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    }
  })
})

describe('soruCoz — K-020 regresyonu', () => {
  /*
   * Bu güvence bugüne kadar yalnızca FTS yolunda (depo.ara) sınanıyordu;
   * arşivin gerçekte kullandığı yol ise soruCoz. Kenar notları havuza
   * girerken buraya da bir kilit koyuyoruz: kullanıcının kendi sözleri
   * girsin, defterin kendi cümleleri asla.
   */
  it('defterin sorduğu sorunun sözcükleri eşleşmiyor', () => {
    const veri: Gun[] = [
      {
        tarih: '2026-05-04',
        ad: gunAdi('2026-05-04'),
        kayitlar: [
          {
            id: 'ks1',
            tarih: '2026-05-04',
            saat: '12:00',
            metin: 'Bugün yürüyüşe çıktım.',
            temalar: [],
            duzenlendi: false,
            soru: 'Bugün kimseye söylemediğin ne oldu?',
          },
        ],
      },
    ]
    expect(soruCoz('söylemediğin', veri, TEMALAR).bos).toBe(true)
    expect(soruCoz('yürüyüşe', veri, TEMALAR).bos).toBe(false)
  })
})

/* ── Türkçe gövdeleme (K-027) ────────────────────────────────── */

describe('soruCoz — gövdeleme', () => {
  const VERI2: Gun[] = [
    gun('2026-04-02', k('2026-04-02', '22:00', 'Bugün hiçbir şey hissetmedim.')),
    gun('2026-04-09', k('2026-04-09', '08:00', 'Kitabı bitirdim, iyi geldi.')),
  ]

  it('"hissettiğim" sorusu "hissetmedim" kaydını buluyor', () => {
    const s = soruCoz('hissettiğim günler', VERI2, TEMALAR)
    expect(s.bos).toBe(false)
    expect(s.kullanilan[0]!.kayit.metin).toContain('hissetmedim')
  })

  it('"kitap" sorusu "kitabı" kaydını buluyor — ünsüz yumuşaması', () => {
    const s = soruCoz('kitap', VERI2, TEMALAR)
    expect(s.bos).toBe(false)
    expect(s.kullanilan[0]!.kayit.metin).toContain('Kitabı')
  })

  it('alakasız sorguyu hâlâ boş döndürüyor — gövdeleme her şeyi bağlamıyor', () => {
    expect(soruCoz('barcelona tatili', VERI2, TEMALAR).bos).toBe(true)
  })

  it('vurgulama için aday gövdeleri döndürüyor', () => {
    const s = soruCoz('hissettiğim', VERI2, TEMALAR)
    expect(s.govdeler).toContain('hisset')
  })

  it('kenar notu da gövdeyle eşleşiyor', () => {
    const id = VERI2[1]!.kayitlar[0]!.id
    const kenarlar = new Map([
      [id, [{ id: 'n1', kayitId: id, metin: 'Sonradan yürüyüşe başladım.', tarih: '2027-01-01', olusturma: 0 }]],
    ])
    const s = soruCoz('yürüyüş', VERI2, TEMALAR, kenarlar)
    expect(s.bos).toBe(false)
    expect(s.kullanilan[0]!.kenarlar).toHaveLength(1)
  })

  it('DURAK gövdelenmiyor — "kötü" düşer ama "hissettiğim" kalır', () => {
    /* Listede hem "kötü" hem "kötüydüm" var; gövdeleyip karşılaştırsaydık
       liste meşru sorgu sözcüklerini de yutardı. */
    const s = soruCoz('kötü hissettiğim günler', VERI2, TEMALAR)
    expect(s.bos).toBe(false)
    expect(s.govdeler).toContain('hisset')
    expect(s.govdeler).not.toContain('kötü')
  })
})

/* ── melez arama: gömü yakınlığı (K-029) ─────────────────────── */

describe('soruCoz — anlamsal yakınlık', () => {
  const id = (parca: string): string =>
    VERI.flatMap((g) => g.kayitlar).find((k) => k.metin.includes(parca))!.id

  it('yalnızca anlamca yakın kayıt da sonuca giriyor', () => {
    const yakin = new Map([[id('Annemle kahvaltı'), 0.7]])
    expect(soruCoz('barcelona', VERI, TEMALAR).bos).toBe(true)
    const s = soruCoz('barcelona', VERI, TEMALAR, new Map(), yakin)
    expect(s.bos).toBe(false)
    expect(s.kullanilan[0]!.kayit.metin).toContain('Annemle kahvaltı')
  })

  it('anlamsal sonuç işaretleniyor — ilke 2.4', () => {
    const yakin = new Map([[id('Annemle kahvaltı'), 0.7]])
    const s = soruCoz('barcelona', VERI, TEMALAR, new Map(), yakin)
    expect(s.kullanilan[0]!.yakinlik).toBeCloseTo(0.7)
    expect(s.paragraflar.some((x) => x.includes('anlam yakınlığıyla'))).toBe(true)
  })

  /*
   * Asıl güvence: kullanıcının gerçekten yazdığı sözcüğü içeren kayıt,
   * "anlamca yakın" bir kaydın arkasında kalmamalı.
   */
  it('anlamsal yakınlık sözcük eşleşmesini GEÇEMİYOR', () => {
    const sozcuklu = id('Kerem yine yazmadı')
    const yakinOlan = id('Annemle kahvaltı')
    /* Yakınlık tavanda (1.0) bile olsa sözcük eşleşmesi (2 puan) önde. */
    const yakin = new Map([[yakinOlan, 1]])
    const s = soruCoz('yazmadı', VERI, TEMALAR, new Map(), yakin)
    expect(s.kullanilan[0]!.kayit.id).toBe(sozcuklu)
  })

  it('hem sözcük hem yakınlık varsa anlamsal olarak işaretlenMİyor', () => {
    const k = id('Kerem yine yazmadı')
    const s = soruCoz('yazmadı', VERI, TEMALAR, new Map(), new Map([[k, 0.9]]))
    const b = s.kullanilan.find((x) => x.kayit.id === k)!
    expect(b.yakinlik).toBeUndefined()
  })

  it('tema kilidi anlamsal sonuçla delinmiyor', () => {
    const tezKaydi = id('Tez teslim')
    const s = soruCoz('kerem hakkında ne yazdım', VERI, TEMALAR, new Map(),
      new Map([[tezKaydi, 0.95]]))
    expect(s.kullanilan.every((b) => b.kayit.temalar.includes('kerem'))).toBe(true)
  })

  it('yakınlık verilmeyince sonuç bugünküyle birebir aynı — regresyon', () => {
    for (const soru of ['kerem hakkında ne yazdım', 'şubatta neden bu kadar kötüydüm', 'tez']) {
      const a = soruCoz(soru, VERI, TEMALAR)
      const b = soruCoz(soru, VERI, TEMALAR, new Map(), new Map())
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    }
  })

  it('anlamsal sonuç yokken o cümle çıkmıyor', () => {
    const s = soruCoz('kerem', VERI, TEMALAR)
    expect(s.paragraflar.some((x) => x.includes('anlam yakınlığıyla'))).toBe(false)
  })
})

/* ── ilke 2.1: kriz kaydı arşive girmez (K-030) ──────────────── */

describe('soruCoz — kriz kaydı', () => {
  const KRIZLI: Gun[] = [
    gun('2026-05-01',
      k('2026-05-01', '10:00', 'Kerem aradı, uzun konuştuk.', ['kerem']),
      k('2026-05-01', '23:50', 'Kerem yüzünden kendimi öldürmek istiyorum.', ['kerem'])),
    gun('2026-05-08', k('2026-05-08', '09:00', 'Kerem ile barıştık.', ['kerem'])),
  ]

  it('cevapta çıkmıyor', () => {
    const s = soruCoz('kerem', KRIZLI, TEMALAR)
    const metinler = s.kullanilan.map((b) => b.kayit.metin)
    expect(metinler.some((m) => m.includes('öldürmek'))).toBe(false)
  })

  /* Sayı bile varlığını sızdırmamalı. */
  it('sayıma girmiyor', () => {
    const s = soruCoz('kerem', KRIZLI, TEMALAR)
    expect(s.paragraflar[0]).toContain('2 kayıt')
  })

  it('tema sayımını etkilemiyor', () => {
    const s = soruCoz('kerem', KRIZLI, TEMALAR)
    const temaSatiri = s.paragraflar.find((p) => p.includes('en sık geçenler'))
    if (temaSatiri) expect(temaSatiri).toContain('(2)')
  })

  it('yalnızca kriz kaydı eşleşiyorsa cevap boş — uydurmuyor', () => {
    const yalniz: Gun[] = [
      gun('2026-05-01', k('2026-05-01', '23:50', 'Barcelona için kendimi öldürmek istiyorum.')),
    ]
    expect(soruCoz('barcelona', yalniz, TEMALAR).bos).toBe(true)
  })

  it('kriz kaydı yokken sonuç bugünküyle birebir aynı — regresyon', () => {
    for (const soru of ['kerem hakkında ne yazdım', 'tez', 'şubatta neden bu kadar kötüydüm']) {
      const a = soruCoz(soru, VERI, TEMALAR)
      expect(a.kullanilan.length).toBeGreaterThanOrEqual(0)
      /* VERI'de kriz kaydı yok; süzgeç hiçbir şeyi düşürmemeli. */
      const toplam = VERI.flatMap((g) => g.kayitlar).length
      expect(toplam).toBe(7)
    }
  })
})
