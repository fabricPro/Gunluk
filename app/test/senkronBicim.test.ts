import { describe, expect, it } from 'vitest'
import { kurtarmaUret } from '../src/cekirdek/kurtarma.js'
import { kimlikTuret, type SenkronKimlik } from '../src/cekirdek/senkronKimlik.js'
import {
  SENKRONSUZ,
  VARLIKLAR,
  catismaKarari,
  mezarTasi,
  zarfiAc,
  zarfla,
  type YerelSatir,
} from '../src/cekirdek/senkronBicim.js'

/**
 * Senkron zarfı — cihazdan çıkan baytların tamamı buradan geçiyor.
 *
 * Bu dosyanın testi ilke 2.3'ün senkron tarafındaki karşılığı:
 * *ham metin cihazdan çıkmaz.* Çıkan şey şifreli bir blob.
 */

const HIZLI = { t: 1, m: 1024, p: 1 }

const kayit = (metin: string, guncelleme = 100): YerelSatir => ({
  varlik: 'kayit',
  id: 'kayit-1',
  guncelleme,
  alanlar: {
    id: 'kayit-1',
    defter_id: 'defter-1',
    tarih: '2026-05-04',
    saat: '22:15',
    metin,
    guncelleme,
  },
})

let k: SenkronKimlik
const kimlik = async (): Promise<SenkronKimlik> =>
  (k ??= (await kimlikTuret(kurtarmaUret(), HIZLI))!)

describe('zarf · gidiş-dönüş', () => {
  it('şifrele → çöz aynı satırı veriyor', async () => {
    const s = kayit('Kerem yine yazmadı.')
    const geri = await zarfiAc(await zarfla(s, await kimlik()), await kimlik())
    expect(geri).toEqual(s)
  })

  it('bütün varlık tipleri gidip geliyor', async () => {
    for (const v of VARLIKLAR) {
      const s: YerelSatir = { varlik: v, id: 'x', guncelleme: 1, alanlar: { a: 1 } }
      expect((await zarfiAc(await zarfla(s, await kimlik()), await kimlik()))?.varlik).toBe(v)
    }
  })
})

describe('zarf · sunucuya giden şey', () => {
  it('kullanıcı metni zarfın hiçbir açık alanında geçmiyor', async () => {
    /*
     * İşaretler bilerek uzun ve ayırt edici. Kısa dizeler (örn. "kayit")
     * base64 gövdede rastlantı eseri belirebilir ve test yılda bir kez
     * düşerdi — titrek bir gizlilik testi hiç testi olmamasından beter
     * (K-033'ün dersi).
     */
    const METIN = 'KIMSEYE-SOYLEMEDIGIM-SEY-8f2c1d4b-BU-DISARI-CIKMAMALI'
    const KAYIT_ID = 'kayit-kimligi-3e9a77c1-DISARI-CIKMAMALI'
    const DEFTER_ID = 'defter-kimligi-b5d02f48-DISARI-CIKMAMALI'
    const z = await zarfla(
      {
        varlik: 'kayit',
        id: KAYIT_ID,
        guncelleme: 100,
        alanlar: { id: KAYIT_ID, defter_id: DEFTER_ID, tarih: '2026-05-04', metin: METIN },
      },
      await kimlik(),
    )
    /* Zarfın tamamı — sunucuya giden JSON'un aynısı. */
    const hepsi = JSON.stringify(z)
    for (const isaret of [METIN, KAYIT_ID, DEFTER_ID]) expect(hepsi).not.toContain(isaret)
  })

  it('varlık tipi açık alanlarda görünmüyor', async () => {
    const z = await zarfla(kayit('x'), await kimlik())
    /* Yalnızca ÜSTVERİ alanlarına bakılıyor; şifreli gövde hariç,
       çünkü orada her bayt dizisi rastlantı eseri geçebilir. */
    expect(z.satir).not.toContain('kayit')
    expect(z.iv).not.toContain('kayit')
    expect(z.satir).toMatch(/^[0-9a-f]{64}$/)
  })

  it('zarfın alanları yalnızca dört tane — fazladan üstveri yok', async () => {
    const z = await zarfla(kayit('bir şey'), await kimlik())
    expect(Object.keys(z).sort()).toEqual(['govde', 'iv', 'satir', 'silindi'])
  })

  it('aynı satır iki kez zarflanınca gövde farklı — IV yeniden kullanılmıyor', async () => {
    const s = kayit('aynı metin')
    const a = await zarfla(s, await kimlik())
    const b = await zarfla(s, await kimlik())
    expect(a.satir).toBe(b.satir)
    expect(a.iv).not.toBe(b.iv)
    expect(a.govde).not.toBe(b.govde)
  })
})

describe('zarf · yanlış anahtar', () => {
  it('başka hesabın anahtarı çözemiyor — null, çökme değil', async () => {
    const baskasi = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    const z = await zarfla(kayit('gizli'), await kimlik())
    expect(await zarfiAc(z, baskasi)).toBeNull()
  })

  it('oynanmış gövde çözülmüyor', async () => {
    const z = await zarfla(kayit('gizli'), await kimlik())
    const bozuk = { ...z, govde: 'A' + z.govde!.slice(1) }
    expect(await zarfiAc(bozuk, await kimlik())).toBeNull()
  })
})

describe('mezar taşı', () => {
  it('içerik taşımıyor', async () => {
    const m = await mezarTasi('kayit', 'kayit-1', await kimlik())
    expect(m.silindi).toBe(true)
    expect(m.govde).toBeNull()
    expect(m.iv).toBeNull()
  })

  it('silinen satırın kimliği canlıyken kullanılanla aynı', async () => {
    const canli = await zarfla(kayit('x'), await kimlik())
    const olu = await mezarTasi('kayit', 'kayit-1', await kimlik())
    expect(olu.satir).toBe(canli.satir)
  })

  it('mezar taşı açılmaya çalışılırsa null', async () => {
    expect(await zarfiAc(await mezarTasi('kayit', 'a', await kimlik()), await kimlik())).toBeNull()
  })
})

describe('çakışma · metin asla sessizce kaybolmuyor', () => {
  it('yerel yoksa uzak alınıyor', () => {
    expect(catismaKarari(null, kayit('uzak', 5))).toEqual({ tur: 'uzak' })
  })

  it('uzak eskiyse yerel duruyor', () => {
    expect(catismaKarari(kayit('yerel', 10), kayit('uzak', 5))).toEqual({ tur: 'yerel' })
  })

  it('eşit damgada yerel duruyor — gereksiz yazma yok', () => {
    expect(catismaKarari(kayit('a', 10), kayit('b', 10))).toEqual({ tur: 'yerel' })
  })

  it('uzak yeniyse ve metin farklıysa yerel metin kurtarılıyor', () => {
    const karar = catismaKarari(kayit('telefonda yazdığım', 5), kayit('bilgisayarda yazdığım', 9))
    expect(karar.tur).toBe('uzak')
    expect((karar as { kurtarilacakMetin: string }).kurtarilacakMetin).toBe('telefonda yazdığım')
  })

  it('metin aynıysa kurtaracak bir şey yok', () => {
    expect(catismaKarari(kayit('aynı', 5), kayit('aynı', 9))).toEqual({ tur: 'uzak' })
  })

  it('metin taşımayan varlıkta kurtarma yok', () => {
    const y: YerelSatir = { varlik: 'defter', id: 'd', guncelleme: 5, alanlar: { ad: 'Eski' } }
    const u: YerelSatir = { varlik: 'defter', id: 'd', guncelleme: 9, alanlar: { ad: 'Yeni' } }
    expect(catismaKarari(y, u)).toEqual({ tur: 'uzak' })
  })
})

describe('kapsam', () => {
  it('türetilmiş tablolar senkronlanmıyor', () => {
    for (const t of SENKRONSUZ) expect(VARLIKLAR).not.toContain(t)
  })

  it('gömü vektörleri senkronlanmıyor — 145 MB modelin çıktısı taşınmaz', () => {
    expect(SENKRONSUZ).toContain('gomu')
  })

  it('cihaza özgü ayarlar senkronlanmıyor', () => {
    expect(SENKRONSUZ).toContain('ayar')
  })
})
