import { describe, expect, it } from 'vitest'
import { kurtarmaUret } from '../src/cekirdek/kurtarma.js'
import { kimlikTuret, type SenkronKimlik } from '../src/cekirdek/senkronKimlik.js'
import {
  SENKRONSUZ,
  VARLIKLAR,
  catismaKarari,
  zarfiAc,
  zarfla,
  type Cozulmus,
} from '../src/cekirdek/senkronBicim.js'

/**
 * Senkron zarfı — cihazdan çıkan baytların tamamı buradan geçiyor.
 *
 * Bu dosyanın testi ilke 2.3'ün senkron tarafındaki karşılığı:
 * *ham metin cihazdan çıkmaz.* Çıkan şey şifreli bir blob.
 */

const HIZLI = { t: 1, m: 1024, p: 1 }

const kayit = (metin: string, guncelleme = 100): Cozulmus => ({
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
      const s: Cozulmus = { varlik: v, id: 'x', guncelleme: 1, alanlar: { a: 1 } }
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

  it('zarfın alanları yalnızca üç tane — fazladan üstveri yok', async () => {
    const z = await zarfla(kayit('bir şey'), await kimlik())
    expect(Object.keys(z).sort()).toEqual(['govde', 'iv', 'satir'])
  })

  it('silme ile normal satır sunucudan bakınca ayırt edilemiyor', async () => {
    /* Mezar taşında `silindi` diye bir bayrak YOK: sunucu hangi satırın
       silindiğini bilmiyor. Silme bilgisi şifreli gövdenin içinde. */
    const canli = await zarfla(kayit('x'), await kimlik())
    const olu = await zarfla(
      { varlik: 'kayit', id: 'kayit-1', guncelleme: 101, alanlar: null },
      await kimlik(),
    )
    expect(Object.keys(olu).sort()).toEqual(Object.keys(canli).sort())
    expect(olu.govde.length).toBeGreaterThan(0)
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
    const bozuk = { ...z, govde: 'A' + z.govde.slice(1) }
    expect(await zarfiAc(bozuk, await kimlik())).toBeNull()
  })
})

describe('mezar taşı', () => {
  const mezar = (guncelleme = 200) =>
    zarfla({ varlik: 'kayit' as const, id: 'kayit-1', guncelleme, alanlar: null }, k)

  it('silinen satırın kimliği canlıyken kullanılanla aynı', async () => {
    const canli = await zarfla(kayit('x'), await kimlik())
    expect((await mezar()).satir).toBe(canli.satir)
  })

  it('açılınca "silinmiş" diye çözülüyor ve SÜRÜM taşıyor', async () => {
    const c = (await zarfiAc(await mezar(200), await kimlik()))!
    expect(c.alanlar).toBeNull()
    expect(c.guncelleme).toBe(200)
    expect(c.id).toBe('kayit-1')
  })

  it('kullanıcı metni taşımıyor', async () => {
    const m = await mezar()
    expect(JSON.stringify(m)).not.toContain('kayit-1')
  })
})

describe('çakışma · metin asla sessizce kaybolmuyor', () => {
  const yerelDurum = (metin: string | null, sira: number) => ({
    sira,
    alanlar: metin === null ? null : kayit(metin, sira).alanlar,
  })

  it('yerel yoksa uzak alınıyor', () => {
    expect(catismaKarari(null, kayit('uzak', 5))).toEqual({ tur: 'uzak' })
  })

  it('uzak eskiyse yerel duruyor', () => {
    expect(catismaKarari(yerelDurum('yerel', 10), kayit('uzak', 5))).toEqual({ tur: 'yerel' })
  })

  it('içerik aynıysa hiçbir şey yapılmıyor', () => {
    expect(catismaKarari(yerelDurum('aynı', 5), kayit('aynı', 5))).toEqual({ tur: 'yerel' })
  })

  it('uzak yeniyse ve metin farklıysa yerel metin kurtarılıyor', () => {
    const karar = catismaKarari(
      yerelDurum('telefonda yazdığım', 5),
      kayit('bilgisayarda yazdığım', 9),
    )
    expect(karar).toEqual({ tur: 'uzak', kurtarilacakMetin: 'telefonda yazdığım' })
  })

  it('metin taşımayan varlıkta kurtarma yok', () => {
    const y = { sira: 5, alanlar: { ad: 'Eski' } }
    const u: Cozulmus = { varlik: 'defter', id: 'd', guncelleme: 9, alanlar: { ad: 'Yeni' } }
    expect(catismaKarari(y, u)).toEqual({ tur: 'uzak' })
  })
})

describe('çakışma · silme dirilmiyor', () => {
  it('yerelde silinmiş, uzakta eski canlı sürüm varsa silme kalıyor', () => {
    /*
     * Hatanın kendisi buydu: A bir kaydı siliyor, sonra kendi daha önce
     * gönderdiği canlı satırı geri çekiyor ve kayıt diriliyordu.
     */
    const silinmis = { sira: 10, alanlar: null }
    expect(catismaKarari(silinmis, kayit('eski canlı', 4))).toEqual({ tur: 'yerel' })
  })

  it('uzaktan gelen silme yerel eskiyse uygulanıyor', () => {
    const yerel = { sira: 4, alanlar: kayit('duruyor', 4).alanlar }
    const uzakSilme: Cozulmus = { varlik: 'kayit', id: 'kayit-1', guncelleme: 9, alanlar: null }
    const karar = catismaKarari(yerel, uzakSilme)
    expect(karar).toEqual({ tur: 'uzak', kurtarilacakMetin: 'duruyor' })
  })
})

describe('çakışma · iki cihaz aynı sonuca varıyor', () => {
  it('beraberlikte iki taraf da aynı kazananı seçiyor', () => {
    /*
     * Aynı Lamport değerinde farklı yazılar: "yerel kazanır" deseydik
     * her cihaz kendininkinde kalır ve defter ikiye ayrılırdı. Beraberlik
     * içerikle bozuluyor, o yüzden ikisi de aynı yere varıyor.
     */
    const A = 'telefonda yazdığım'
    const B = 'bilgisayarda yazdığım'
    const aKarari = catismaKarari({ sira: 7, alanlar: kayit(A, 7).alanlar }, kayit(B, 7))
    const bKarari = catismaKarari({ sira: 7, alanlar: kayit(B, 7).alanlar }, kayit(A, 7))
    /* Tam olarak biri değişiyor — ikisi de değil, hiçbiri de değil. */
    expect([aKarari.tur, bKarari.tur].filter((t) => t === 'uzak')).toHaveLength(1)
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
