import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { aesAnahtar, ac, ayristir, kapat, rastgele } from '../src/cekirdek/gizle.js'
import { kurtarmaCoz, kurtarmaUret, kurtarmaYaz } from '../src/cekirdek/kurtarma.js'
import { EN_AZ_PAROLA, kasaKimligiTuret } from '../src/cekirdek/kasaKimlik.js'
import { kimlikTuret } from '../src/cekirdek/senkronKimlik.js'

/**
 * KASA KİMLİĞİ — kurtarmanın taşıyıcı direği.
 *
 * Buradaki söz şu: yalnızca parolayla, kod hiç elde yokken, kasaya
 * ulaşılabiliyor; ve parolanın kendisi hiçbir çıktıdan geri gelmiyor
 * (KARARLAR.md · K-038).
 */

/* Testte Argon2id gerçek parametrelerle koşarsa takım dakikalar sürer.
   Sınanan şey parametre değeri değil, TÜRETMENİN YAPISI. */
const HIZLI = { t: 1, m: 1024, p: 1 }
const PAROLA = 'bu-uzun-bir-kurtarma-parolasi'
const OTEKI = 'bambaska-bir-kurtarma-parolasi'

const turet = (p: string) => kasaKimligiTuret(p, HIZLI)

describe('türetme kararlı', () => {
  it('aynı parola hep aynı kimliği veriyor', async () => {
    const a = (await turet(PAROLA))!
    const b = (await turet(PAROLA))!
    expect(a.kimlik).toBe(b.kimlik)
    expect(a.eposta).toBe(b.eposta)
    expect(a.parola).toBe(b.parola)
  })

  it('farklı parola farklı kimlik veriyor', async () => {
    const a = (await turet(PAROLA))!
    const b = (await turet(OTEKI))!
    expect(a.kimlik).not.toBe(b.kimlik)
    expect(a.parola).not.toBe(b.parola)
  })

  it('tek karakterlik fark bile her şeyi değiştiriyor', async () => {
    const a = (await turet(PAROLA))!
    const b = (await turet(PAROLA + 'x'))!
    expect(a.kimlik).not.toBe(b.kimlik)
  })

  it('e-posta hiçbir yere ulaşmayan alan adında', async () => {
    const k = (await turet(PAROLA))!
    expect(k.eposta.endsWith('@defter.invalid')).toBe(true)
    expect(k.eposta.startsWith(k.kimlik)).toBe(true)
  })
})

describe('kısa parola kabul edilmiyor', () => {
  it('alt sınırın altı null', async () => {
    expect(await turet('a'.repeat(EN_AZ_PAROLA - 1))).toBeNull()
  })

  it('tam sınır kabul ediliyor', async () => {
    expect(await turet('a'.repeat(EN_AZ_PAROLA))).not.toBeNull()
  })

  it('alt sınır kilidin eski sınırından yüksek', () => {
    /* Kasa sunucuda duruyor: blob'a erişmek için kimseye fiziksel erişim
       gerekmiyor. Eski 8 yalnızca yerel diski koruyorken yeterliydi. */
    expect(EN_AZ_PAROLA).toBeGreaterThan(8)
  })
})

describe('çıktılar birbirinden bağımsız', () => {
  it('kimlik, parola ve şifre aynı değer değil', async () => {
    const k = (await turet(PAROLA))!
    const ham = await crypto.subtle.exportKey('raw', k.sifre).catch(() => null)
    /* Anahtar dışa aktarılamaz olarak içe alındı; bu zaten istenen. */
    expect(ham).toBeNull()
    expect(k.kimlik).not.toBe(k.parola)
  })

  it('sunucunun gördüğü kimlikten parolaya gidilemiyor', async () => {
    const k = (await turet(PAROLA))!
    /* Kimlik HKDF'in ayrı bir dalı; parolanın hiçbir parçasını taşımıyor. */
    expect(k.kimlik).not.toContain('parola')
    for (const parca of ['bu-uzun', 'kurtarma', 'parolasi'])
      expect(k.kimlik).not.toContain(parca)
  })
})

describe('kasa kimliği senkron kimliğinden ayrı', () => {
  /*
   * Bu blok bir kez BOŞA yazıldı ve dersi burada duruyor.
   *
   * Önce yalnızca şu vardı: aynı dizeyi hem koda hem parolaya verip
   * kimliklerin farklı çıktığına bakmak. Etiketler ve tuz KASITLI olarak
   * `defter/senkron/...` yapılıp koşturulunca test yine geçti — çünkü
   * `kimlikTuret` koddan ÇÖZÜLMÜŞ 16 baytı, `kasaKimligiTuret` ise kod
   * DİZESİNİ Argon2id'ye veriyor. Girdiler zaten farklı olduğu için
   * etiketlerin ayrılığını hiç sınamıyordu.
   *
   * Etiket ayrımını sınamanın tek dürüst yolu aynı kökten türetip
   * bakmak (KARARLAR.md · K-038).
   */
  const kok = new Uint8Array(32).fill(7)

  it('kasa etiketleri birbirinden farklı çıktı veriyor', async () => {
    const [a, b, c] = await Promise.all([
      ayristir(kok, 'defter/kasa/kimlik', 16),
      ayristir(kok, 'defter/kasa/parola', 32),
      ayristir(kok, 'defter/kasa/sifre', 32),
    ])
    const yaz = (u: Uint8Array) => [...u].join()
    expect(yaz(a!)).not.toBe(yaz(b!).slice(0, yaz(a!).length))
    expect(yaz(b!)).not.toBe(yaz(c!))
  })

  it('aynı kökte kasa etiketi senkron etiketinden farklı çıktı veriyor', async () => {
    /* Bu, HKDF'in kendi özelliğini gösteriyor: ayrımı etiket yapıyor.
       Kodun O etiketleri KULLANDIĞINI aşağıdaki kaynak kontrolü tutuyor;
       ikisi birlikte anlamlı, tek başına hiçbiri değil. */
    for (const ad of ['kimlik', 'parola', 'sifre']) {
      const [kasa, senkron] = await Promise.all([
        ayristir(kok, `defter/kasa/${ad}`, 32),
        ayristir(kok, `defter/senkron/${ad}`, 32),
      ])
      expect([...kasa!].join(), ad).not.toBe([...senkron!].join())
    }
  })

  it('tuz dizeleri de ayrı', async () => {
    /* Aynı parola iki sistemde aynı kökü üretmesin. */
    const kaynak = readFileSync(
      new URL('../src/cekirdek/kasaKimlik.ts', import.meta.url),
      'utf8',
    )
    expect(kaynak).toContain("'defter/kasa/tuz/v1'")
    expect(kaynak).not.toContain("'defter/senkron/tuz/v1'")
  })

  it('kod ve parola yolları farklı hesaba çıkıyor', async () => {
    const kod = kurtarmaUret()
    const senkron = (await kimlikTuret(kod, HIZLI))!
    const kasa = (await kasaKimligiTuret(kod, HIZLI))!
    expect(kasa.kimlik).not.toBe(senkron.kimlik)
  })
})

describe('kasanın içi — gizli gidip geliyor', () => {
  it('parolayla şifrelenen kod aynen geri geliyor', async () => {
    const kod = kurtarmaUret()
    const gizli = kurtarmaCoz(kod)!
    const k = (await turet(PAROLA))!

    const kapali = await kapat(gizli, k.sifre)
    const geri = await ac(kapali, (await turet(PAROLA))!.sifre)
    expect(kurtarmaYaz(geri)).toBe(kod)
  })

  it('başka parola kasayı açmıyor — atıyor, sessizce çöp vermiyor', async () => {
    const gizli = kurtarmaCoz(kurtarmaUret())!
    const kapali = await kapat(gizli, (await turet(PAROLA))!.sifre)
    await expect(ac(kapali, (await turet(OTEKI))!.sifre)).rejects.toThrow()
  })

  it('kasa gövdesinde kod açık geçmiyor', async () => {
    const kod = kurtarmaUret()
    const kapali = await kapat(kurtarmaCoz(kod)!, (await turet(PAROLA))!.sifre)
    const hepsi = JSON.stringify(kapali)
    expect(hepsi.length).toBeGreaterThan(40)
    /* Kodun hem yazıldığı hâli hem tiresiz hâli aranıyor. */
    expect(hepsi).not.toContain(kod)
    expect(hepsi).not.toContain(kod.replace(/-/g, ''))
  })

  it('aynı gizli iki kez kapatılınca gövde farklı — IV yeniden kullanılmıyor', async () => {
    const gizli = kurtarmaCoz(kurtarmaUret())!
    const k = (await turet(PAROLA))!
    const a = await kapat(gizli, k.sifre)
    const b = await kapat(gizli, k.sifre)
    expect(a.iv).not.toBe(b.iv)
    expect(a.govde).not.toBe(b.govde)
  })
})

describe('kurtarmaYaz — kurtarmaCoz\'un tersi', () => {
  it('üretilen her kod gidip geliyor', () => {
    for (let i = 0; i < 50; i++) {
      const kod = kurtarmaUret()
      expect(kurtarmaYaz(kurtarmaCoz(kod)!)).toBe(kod)
    }
  })

  it('yanlış uzunlukta bayt null — yanlış kod üretmektense hiç üretme', () => {
    expect(kurtarmaYaz(rastgele(15))).toBeNull()
    expect(kurtarmaYaz(rastgele(17))).toBeNull()
    expect(kurtarmaYaz(new Uint8Array(0))).toBeNull()
  })

  it('yazılan kod gerçekten çözülebiliyor', () => {
    const gizli = rastgele(16)
    const kod = kurtarmaYaz(gizli)!
    expect([...kurtarmaCoz(kod)!]).toEqual([...gizli])
  })
})

describe('anahtar gerçekten AES anahtarı', () => {
  it('kasa anahtarıyla şifrelenen çözülüyor', async () => {
    const k = (await turet(PAROLA))!
    const veri = rastgele(32)
    const geri = await ac(await kapat(veri, k.sifre), k.sifre)
    expect([...geri]).toEqual([...veri])
  })

  it('rastgele bir anahtar kasayı açmıyor', async () => {
    const k = (await turet(PAROLA))!
    const kapali = await kapat(rastgele(32), k.sifre)
    await expect(ac(kapali, await aesAnahtar(rastgele(32)))).rejects.toThrow()
  })
})
