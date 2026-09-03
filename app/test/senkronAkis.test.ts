import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { kurtarmaUret } from '../src/cekirdek/kurtarma.js'
import { kimlikTuret, type SenkronKimlik } from '../src/cekirdek/senkronKimlik.js'
import type { Zarf } from '../src/cekirdek/senkronBicim.js'
import { SenkronAkis } from '../src/senkronAkis.js'
import {
  OKUNAMAYAN,
  SEVIYE_HESABI,
  SU_SEVIYESI,
  TAM_CEKIM,
  bastanIndir,
  suSeviyesiniDenkle,
} from '../src/senkronKurulum.js'
import { defteriAc } from '../src/veri/db.js'
import type { SqlSurucu } from '../src/veri/db.js'
import { Depo } from '../src/veri/depo.js'
import type { Sunucu } from '../src/veri/senkronDepo.js'
import { testSurucusu } from './surucu.js'

/**
 * İKİ CİHAZ, TEK DEFTER — senkronun tam turu.
 *
 * Sunucu bellekte taklit ediliyor: gerçek Neon'a ihtiyaç duymadan
 * "A'da yaz → B'de gör" akışının tamamı koşuyor. Taklit, gerçek
 * sunucunun iki davranışını birebir uyguluyor:
 *   · `surum`u SUNUCU atıyor, kesin artan
 *   · satırlar (kullanici, satir) üstünde upsert
 *
 * Ağ katmanının kendisi (`veri/senkronDepo.ts`) burada değil; o gerçek
 * bir uç noktayla doğrulanmak zorunda ve doğrulama listesinde duruyor.
 */

/** Bellekteki sahte sunucu — birden çok hesabı da ayırıyor. */
class SahteSunucu {
  private sayac = 0
  private satirlar = new Map<string, Map<string, Zarf & { surum: number }>>()
  /** Kaç kez ağa çıkıldı — "kapalıyken istek yok" testi bunu okuyor. */
  istek = 0

  hesap(kimlik: string): Sunucu {
    const bende = (): Map<string, Zarf & { surum: number }> => {
      let m = this.satirlar.get(kimlik)
      if (!m) this.satirlar.set(kimlik, (m = new Map()))
      return m
    }
    return {
      cek: async (sonGorulen, sinir = 200) => {
        this.istek++
        return [...bende().values()]
          .filter((s) => s.surum > sonGorulen)
          .sort((a, b) => a.surum - b.surum)
          .slice(0, sinir)
          .map((s) => ({ surum: s.surum, zarf: { ...s } }))
      },
      it: async (zarflar) => {
        this.istek++
        for (const z of zarflar) bende().set(z.satir, { ...z, surum: ++this.sayac })
      },
      kullanim: async () => ({
        satir: bende().size,
        bayt: [...bende().values()].reduce((t, s) => t + (s.govde?.length ?? 0), 0),
      }),
      hepsiniSil: async () => {
        this.istek++
        bende().clear()
      },
    }
  }

  /**
   * Sunucuda duran her şey — sızıntı taraması için.
   *
   * İç Map'ler açılarak seriliyor: `JSON.stringify` bir Map'i `{}` diye
   * yazıyor ve tarama sessizce boş kalıyordu. Uzunluk kontrolü tam
   * bunun için var.
   */
  hamHepsi(): string {
    return JSON.stringify(
      [...this.satirlar.entries()].map(([k, m]) => [k, [...m.values()]]),
    )
  }
}

interface Cihaz {
  depo: Depo
  db: SqlSurucu
  akis: SenkronAkis
}

let dizin: string
let sunucu: SahteSunucu
let kimlik: SenkronKimlik
const cihazlar: Cihaz[] = []

const HIZLI = { t: 1, m: 1024, p: 1 }

async function cihazAc(): Promise<Cihaz> {
  const db = testSurucusu(join(dizin, `cihaz-${cihazlar.length}.db`))
  const depo = new Depo(await defteriAc(db))
  await depo.senkronIzleriSil()
  const c: Cihaz = { depo, db, akis: new SenkronAkis(depo, sunucu.hesap(kimlik.kimlik), kimlik) }
  cihazlar.push(c)
  return c
}

beforeEach(async () => {
  dizin = mkdtempSync(join(tmpdir(), 'defter-senkron-'))
  sunucu = new SahteSunucu()
  kimlik = (await kimlikTuret(kurtarmaUret(), HIZLI))!
})

afterEach(async () => {
  for (const c of cihazlar.splice(0)) await c.db.kapat()
  rmSync(dizin, { recursive: true, force: true })
})

const kayitlar = async (c: Cihaz): Promise<string[]> => {
  const g = await c.depo.gunler()
  return g.flatMap((x) => x.kayitlar.map((k) => k.metin)).sort()
}

describe('iki cihaz, tek defter', () => {
  it("A'da yazılan B'de görünüyor", async () => {
    const a = await cihazAc()
    const b = await cihazAc()

    await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'Kerem yine yazmadı.' })
    expect(await a.akis.calistir()).toBe(true)
    expect(await b.akis.calistir()).toBe(true)

    expect(await kayitlar(b)).toEqual(['Kerem yine yazmadı.'])
  })

  it('iki yönlü — her cihaz diğerininkini alıyor', async () => {
    const a = await cihazAc()
    const b = await cihazAc()

    await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '09:00', metin: 'sabah' })
    await a.akis.calistir()
    await b.akis.calistir()

    await b.depo.kayitEkle({ tarih: '2026-05-04', saat: '21:00', metin: 'akşam' })
    await b.akis.calistir()
    await a.akis.calistir()

    expect(await kayitlar(a)).toEqual(['akşam', 'sabah'])
    expect(await kayitlar(b)).toEqual(['akşam', 'sabah'])
  })

  it('kenar notu, başlık ve kapsül de gidiyor', async () => {
    const a = await cihazAc()
    const b = await cihazAc()
    const k = await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'gövde' })
    await a.depo.kenarEkle(k.id, 'sonradan not')
    await a.depo.baslikYaz(k.id, 'Son yaz')
    await a.depo.kapsulEkle('2026-05-04', '2027-05-04', 'sevgili ben')

    await a.akis.calistir()
    await b.akis.calistir()

    expect([...(await b.depo.kenarlar()).values()].flat().map((n) => n.metin)).toEqual([
      'sonradan not',
    ])
    expect((await b.depo.basliklar()).size).toBe(1)
    expect((await b.depo.kapsuller()).length).toBe(1)
  })

  it('silme karşı cihaza da geçiyor', async () => {
    const a = await cihazAc()
    const b = await cihazAc()
    const k = await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'gidecek' })
    await a.akis.calistir()
    await b.akis.calistir()
    expect(await kayitlar(b)).toEqual(['gidecek'])

    await a.depo.kayitSil(k.id)
    await a.akis.calistir()
    await b.akis.calistir()

    expect(await kayitlar(b)).toEqual([])
  })

  it('yankı yok — ikinci tur boş dönüyor', async () => {
    const a = await cihazAc()
    const b = await cihazAc()
    await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'tek' })
    await a.akis.calistir()
    await b.akis.calistir()

    /* B çektiğini geri göndermemeli, yoksa iki cihaz sonsuza kadar
       aynı satırı birbirine yollar. */
    expect(await b.depo.senkronBekleyenSayisi()).toBe(0)
    await b.akis.calistir()
    await a.akis.calistir()
    expect(await kayitlar(a)).toEqual(['tek'])
    expect(await kayitlar(b)).toEqual(['tek'])
  })
})

describe('çakışma — metin kaybolmuyor', () => {
  it('iki cihaz aynı kaydı düzeltince kaybeden metin kenar notu oluyor', async () => {
    const a = await cihazAc()
    const b = await cihazAc()
    const k = await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'ilk hâli' })
    await a.akis.calistir()
    await b.akis.calistir()

    /* İkisi de çevrimdışı düzeltiyor. */
    await a.depo.kayitDuzelt(k.id, 'telefonda yazdığım')
    await b.depo.kayitDuzelt(k.id, 'bilgisayarda yazdığım')

    /* Birkaç tur: ikisi de gönderiyor, ikisi de çekiyor. */
    await a.akis.calistir()
    await b.akis.calistir()
    await a.akis.calistir()
    await b.akis.calistir()

    /*
     * Asıl iddia HANGİSİNİN kazandığı değil — o, beraberlik bozucunun
     * keyfi ama kararlı bir sonucu. Asıl iddia iki tanesi:
     *   1. iki cihaz AYNI şeyi gösteriyor (ıraksama yok)
     *   2. kaybeden metin hiçbir yerde kaybolmadı
     */
    const aMetin = await kayitlar(a)
    const bMetin = await kayitlar(b)
    expect(aMetin).toEqual(bMetin)
    expect(aMetin).toHaveLength(1)

    const hepsi = (c: typeof a) =>
      c.depo
        .kenarlar()
        .then((m) => [...m.values()].flat().map((n) => n.metin))
    const aHepsi = [...aMetin, ...(await hepsi(a))]
    expect(aHepsi).toContain('telefonda yazdığım')
    expect(aHepsi).toContain('bilgisayarda yazdığım')
  })

  it('eski düzeltme yeniyi ezmiyor', async () => {
    const a = await cihazAc()
    const b = await cihazAc()
    const k = await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'ilk' })
    await a.akis.calistir()
    await b.akis.calistir()

    await b.depo.kayitDuzelt(k.id, 'yeni')
    await b.akis.calistir()
    await a.akis.calistir()
    expect(await kayitlar(a)).toEqual(['yeni'])

    /* A şimdi eski bir düzeltme gönderse bile B'deki yeni kalmalı. */
    await a.akis.calistir()
    await b.akis.calistir()
    expect(await kayitlar(b)).toEqual(['yeni'])
  })
})

describe('sunucu okuyamıyor', () => {
  it('kullanıcı metni sunucuda duran hiçbir baytta geçmiyor', async () => {
    const a = await cihazAc()
    const ISARET = 'KIMSEYE-SOYLEMEDIGIM-SEY-8f2c1d4b-SUNUCUYA-GITMEMELI'
    await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '03:12', metin: ISARET })
    await a.depo.kenarEkle(
      (await a.depo.gunler())[0]!.kayitlar[0]!.id,
      'BU-NOT-DA-GITMEMELI-3e9a77c1',
    )
    await a.akis.calistir()

    const ham = sunucu.hamHepsi()
    expect(ham.length).toBeGreaterThan(100)
    expect(ham).not.toContain(ISARET)
    expect(ham).not.toContain('BU-NOT-DA-GITMEMELI-3e9a77c1')
    /* Yazma saati de gitmiyor. */
    expect(ham).not.toContain('03:12')
    expect(ham).not.toContain('2026-05-04')
  })

  it('başka hesabın satırları görünmüyor', async () => {
    const a = await cihazAc()
    await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'benim' })
    await a.akis.calistir()

    /* Aynı sunucu, başka Defter Kimliği. */
    const baskaKimlik = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    const db = testSurucusu(join(dizin, 'yabanci.db'))
    const depo = new Depo(await defteriAc(db))
    await depo.senkronIzleriSil()
    const yabanci = new SenkronAkis(depo, sunucu.hesap(baskaKimlik.kimlik), baskaKimlik)
    await yabanci.calistir()
    expect(await depo.gunler()).toEqual([])
    await db.kapat()
  })
})

describe('dayanıklılık', () => {
  it('gönderim hatası veriyi kaybettirmiyor — bekleyende kalıyor', async () => {
    const a = await cihazAc()
    await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'gitmeli' })

    const kirik: Sunucu = {
      cek: async () => [],
      it: async () => {
        throw new Error('ağ gitti')
      },
      kullanim: async () => ({ satir: 0, bayt: 0 }),
      hepsiniSil: async () => {},
    }
    const kirikAkis = new SenkronAkis(a.depo, kirik, kimlik)
    expect(await kirikAkis.calistir()).toBe(false)
    expect(kirikAkis.durum.hata).toContain('ağ gitti')
    expect(await a.depo.senkronBekleyenSayisi()).toBe(1)

    /* Ağ dönünce aynı kayıt gidiyor. */
    expect(await a.akis.calistir()).toBe(true)
    const b = await cihazAc()
    await b.akis.calistir()
    expect(await kayitlar(b)).toEqual(['gitmeli'])
  })

  it('çözülemeyen satır turu çökertmiyor', async () => {
    const a = await cihazAc()
    await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '22:15', metin: 'sağlam' })
    await a.akis.calistir()

    /* Sunucuya bozuk bir satır düşmüş. */
    await sunucu.hesap(kimlik.kimlik).it([
      { satir: 'bozuk-satir', iv: 'aa'.repeat(12), govde: 'Y2O5cA==' },
    ])

    const b = await cihazAc()
    expect(await b.akis.calistir()).toBe(true)
    expect(await kayitlar(b)).toEqual(['sağlam'])
  })

  it('büyük defter parçalar hâlinde gidiyor', async () => {
    const a = await cihazAc()
    for (let i = 0; i < 120; i++)
      await a.depo.kayitEkle({
        tarih: '2026-05-04',
        saat: `${String(i % 24).padStart(2, '0')}:00`,
        metin: 'kayıt ' + i,
      })
    await a.akis.calistir()
    expect(await a.depo.senkronBekleyenSayisi()).toBe(0)

    const b = await cihazAc()
    await b.akis.calistir()
    expect((await kayitlar(b)).length).toBe(120)
  })
})

describe('su seviyesi — hesaba özgü ve hesap veriyor', () => {
  /**
   * BU DOSYADAKİ EN PAHALI MUHAFIZ.
   *
   * `senkron.sonGorulen`, sunucudaki `surum` akışındaki konum: "bundan
   * büyüğünü görmedim". Sunucudaki dizi BÜTÜN hesaplar için ortak
   * (`veri/sema/sunucu.sql`), yani sayı yalnızca tek bir hesabın akışında
   * anlamlı. Başka bir hesapta 6'ya çıkmış bir cihaz, satırları 2–4 olan
   * bir hesaba girince hiçbir şeyi "yeni" saymıyor.
   *
   * Canlıda tam olarak bu görüldü ve tek yönlü senkron gibi göründü:
   * cihaz yazdığını İTİYOR (itilen satır yeni, yüksek bir sürüm alıyor,
   * karşı taraf görüyor) ama hiçbir şey ÇEKMİYOR. Kullanıcının cümlesi
   * "bilgisayarda yazdıklarım telefonda görünmüyor ama telefonda
   * yazdıklarım bilgisayarda görünüyor" idi (KARARLAR.md · K-048).
   */
  it('başka hesaptan kalan seviye satırları GİZLİYOR; denkleşince geliyor', async () => {
    const a = await cihazAc()
    await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '09:00', metin: 'bilgisayarda' })
    await a.akis.calistir()

    const b = await cihazAc()
    /* B başka bir hesapta seviyesini yükseltmiş; sayı bu hesapta anlamsız. */
    await b.depo.ayarYaz(SU_SEVIYESI, '9999')
    await b.depo.ayarYaz(SEVIYE_HESABI, 'eski-hesap')
    await b.depo.ayarYaz(TAM_CEKIM, '1')

    await b.akis.calistir()
    /* ARIZANIN KENDİSİ: tur hatasız koştu ve hiçbir şey inmedi. */
    expect(await kayitlar(b)).toEqual([])

    /* Hesap değişti: seviye sıfırlanmalı. */
    expect(await suSeviyesiniDenkle(b.depo, 'yeni-hesap')).toBe(true)
    await b.akis.calistir()
    expect(await kayitlar(b)).toEqual(['bilgisayarda'])
  })

  it('aynı hesapta seviye korunuyor — her açılışta defter baştan inmiyor', async () => {
    const a = await cihazAc()
    await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '09:00', metin: 'tek sefer' })
    await a.akis.calistir()

    const b = await cihazAc()
    expect(await suSeviyesiniDenkle(b.depo, 'hesap')).toBe(true)
    await b.akis.calistir()
    const seviye = await b.depo.ayarOku(SU_SEVIYESI)
    expect(Number(seviye)).toBeGreaterThan(0)

    /* İkinci açılış: aynı hesap, damga da atılmış — dokunulmuyor. */
    expect(await suSeviyesiniDenkle(b.depo, 'hesap')).toBe(false)
    expect(await b.depo.ayarOku(SU_SEVIYESI)).toBe(seviye)
  })

  it('bir kerelik onarım: hesap AYNI olsa bile ilk kez sıfırlanıyor', async () => {
    /*
     * Arıza ateşlenmiş cihazlarda hesap değişmiyor; yalnızca hesap
     * karşılaştırması onları kurtarmazdı. Damga, düzeltmeyi ilk gören her
     * cihazda defteri bir kez baştan indiriyor.
     */
    const a = await cihazAc()
    await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '09:00', metin: 'geri gelmeli' })
    await a.akis.calistir()

    const b = await cihazAc()
    await b.depo.ayarYaz(SU_SEVIYESI, '9999')
    await b.depo.ayarYaz(SEVIYE_HESABI, 'hesap')
    /* TAM_CEKIM damgası YOK: cihaz düzeltmeyi ilk kez görüyor. */
    await b.akis.calistir()
    expect(await kayitlar(b)).toEqual([])

    expect(await suSeviyesiniDenkle(b.depo, 'hesap')).toBe(true)
    await b.akis.calistir()
    expect(await kayitlar(b)).toEqual(['geri gelmeli'])
  })

  it('"baştan indir" seviyeyi sıfırlıyor — kullanıcının elindeki yol', async () => {
    const a = await cihazAc()
    await a.depo.kayitEkle({ tarih: '2026-05-04', saat: '09:00', metin: 'eksik kalan' })
    await a.akis.calistir()

    const b = await cihazAc()
    await b.depo.ayarYaz(SU_SEVIYESI, '9999')
    await b.akis.calistir()
    expect(await kayitlar(b)).toEqual([])

    await bastanIndir(b.depo)
    await b.akis.calistir()
    expect(await kayitlar(b)).toEqual(['eksik kalan'])
  })
})

describe('açılamayan satır sessiz geçilmiyor', () => {
  /**
   * Çözülemeyen satır atlanıyor ve seviye ONUN ÜSTÜNE çıkıyor. Sunucudaki
   * `surum` bir daha değişmediği için o satır bu cihazın çekme akışından
   * KALICI olarak düşüyor — doğru koda geçilse bile geri gelmiyor.
   *
   * Seviyeyi geri tutmak çare değil: gerçekten yabancı tek bir satır
   * senkronu sonsuza kadar kilitlerdi. Doğru davranış ilerleyip SÖYLEMEK.
   */
  it('açılamayan satır sayılıyor, açılabilenler yine iniyor', async () => {
    const c = await cihazAc()
    await c.depo.kayitEkle({ tarih: '2026-05-04', saat: '09:00', metin: 'benim' })
    await c.akis.calistir()

    const d = await cihazAc()
    /* Sunucuya BAŞKA bir kimlikle şifrelenmiş bir satır düşmüş. */
    await sunucu.hesap(kimlik.kimlik).it([
      { satir: 'yabanci-satir', iv: 'aa'.repeat(12), govde: 'Y2O5cA==' },
    ])

    expect(await d.akis.calistir()).toBe(true)
    expect(d.akis.durum.okunamayan).toBe(1)
    expect(d.akis.durum.sonCekilen).toBeGreaterThan(0)
    expect(await kayitlar(d)).toEqual(['benim'])
  })

  it('hepsi açılamıyorsa tur DEĞİŞMEDİ diyor ve sayı görünüyor', async () => {
    await sunucu.hesap(kimlik.kimlik).it([
      { satir: 'yabanci-1', iv: 'aa'.repeat(12), govde: 'Y2O5cA==' },
      { satir: 'yabanci-2', iv: 'bb'.repeat(12), govde: 'Y2O5cA==' },
    ])
    const b = await cihazAc()
    expect(await b.akis.calistir()).toBe(true)
    expect(b.akis.durum.okunamayan).toBe(2)
    expect(b.akis.durum.sonCekilen).toBe(0)
    /* "Hata almadan koştu" ile "bir şey değişti" ayrı şeyler (K-044). */
    expect(b.akis.sonTurDegisti).toBe(false)
  })

  it('sayı KALICI: boş tur sıfırlamıyor, yeniden yükleme unutmuyor', async () => {
    /*
     * Bellekte tutulan sayı hiçbir işe yaramıyordu: her tur başında
     * sıfırlanıyor, boştaki defterde tur hep boş dönüyor ve ayar kağıdı
     * açıldığında ekranda 0 görünüyordu. Yani "sessizce atlama"yı
     * bitirmek için eklenen satırın kendisi sessiz kalırdı.
     */
    await sunucu.hesap(kimlik.kimlik).it([
      { satir: 'yabanci-1', iv: 'aa'.repeat(12), govde: 'Y2O5cA==' },
    ])
    const b = await cihazAc()
    await b.akis.calistir()
    expect(b.akis.durum.okunamayan).toBe(1)
    expect(await b.depo.ayarOku(OKUNAMAYAN)).toBe('1')

    /* Sunucuda yeni bir şey yok: boş tur sayıyı SİLMEMELİ. */
    await b.akis.calistir()
    expect(b.akis.durum.okunamayan).toBe(1)

    /* Yeniden yükleme taklidi: yeni akış nesnesi sayıyı depodan okuyor. */
    const yeni = new SenkronAkis(b.depo, sunucu.hesap(kimlik.kimlik), kimlik)
    await yeni.tazele()
    expect(yeni.durum.okunamayan).toBe(1)

    /* "Baştan indir" sayıyı sıfırlıyor ve satır yine açılamıyor. */
    await bastanIndir(b.depo)
    expect(await b.depo.ayarOku(OKUNAMAYAN)).toBe('0')
    await b.akis.calistir()
    expect(b.akis.durum.okunamayan).toBe(1)
  })
})
