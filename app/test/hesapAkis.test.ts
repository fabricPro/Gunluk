import { describe, expect, it } from 'vitest'
import { kurtarmaCoz } from '../src/cekirdek/kurtarma.js'
import type { HesapKimlik } from '../src/cekirdek/hesapKimlik.js'
import type { KasaSatir } from '../src/veri/senkronDepo.js'
import { girisYap, hesapAc, hesapTasi, type KasaSunucu } from '../src/hesapAkis.js'

/**
 * HESAP AKIŞI — "her cihazdan ulaşırım" sözünün tam turu, ağsız.
 *
 * En kritik muhafız burada: **yanlış şifre hesap YARATMAMALI.**
 * Yaratsaydı kullanıcıya sessizce boş bir defter açılır, "giriş başarılı"
 * denir ve defterini kaybettiğini anlamadan üstüne yazmaya başlardı
 * (KARARLAR.md · K-039).
 */

const HIZLI = { t: 1, m: 1024, p: 1 }
const AD = 'furkan'
const SIFRE = 'bu-uzun-bir-hesap-sifresi'
const BASKA = 'bambaska-bir-hesap-sifresi'

/**
 * Bellekte duran kasa sunucusu.
 *
 * `oku` hesap yoksa `null` dönüyor ve hesap AÇMIYOR — gerçek `Kasa`nın
 * `yarat = false` davranışının karşılığı. `yaz` açıyor.
 */
class SahteKasa {
  readonly satirlar = new Map<string, KasaSatir>()
  /** Yalnızca `yaz` ile açılan hesaplar; muhafızın saydığı şey bu. */
  readonly hesaplar = new Set<string>()

  yapici = (kimlik: HesapKimlik): KasaSunucu => ({
    oku: async () => this.satirlar.get(kimlik.kimlik) ?? null,
    yaz: async (s) => {
      this.hesaplar.add(kimlik.kimlik)
      this.satirlar.set(kimlik.kimlik, s)
    },
    sil: async () => {
      this.hesaplar.delete(kimlik.kimlik)
      this.satirlar.delete(kimlik.kimlik)
    },
  })
}

describe('hesap aç → giriş yap', () => {
  it('açılan hesaba aynı ad ve şifreyle girilince aynı kod geliyor', async () => {
    const s = new SahteKasa()
    const kod = (await hesapAc(AD, SIFRE, s.yapici, HIZLI))!
    expect(kurtarmaCoz(kod)).not.toBeNull()
    expect(await girisYap(AD, SIFRE, s.yapici, HIZLI)).toBe(kod)
  })

  it('kod her hesapta rastgele — şifreden türemiyor', async () => {
    /* Defterin şifrelemesi insan parolasına inmiyor; şifre yalnızca
       rastgele kodu sarmalıyor. */
    const a = await hesapAc(AD, SIFRE, new SahteKasa().yapici, HIZLI)
    const b = await hesapAc(AD, SIFRE, new SahteKasa().yapici, HIZLI)
    expect(a).not.toBe(b)
  })

  it('var olan hesapta "hesap aç" YENİ kod üretmiyor', async () => {
    /*
     * "Hesap aç" ile "giriş yap" karıştırılırsa defterin üstüne
     * yazılırdı — veri kaybının en sessiz yolu. Mevcut kasa okunuyor.
     */
    const s = new SahteKasa()
    const kod = await hesapAc(AD, SIFRE, s.yapici, HIZLI)
    expect(await hesapAc(AD, SIFRE, s.yapici, HIZLI)).toBe(kod)
    expect(s.satirlar.size).toBe(1)
  })
})

describe('giriş hesap YARATMIYOR', () => {
  it('hiç hesap yokken giriş null ve ortada hesap yok', async () => {
    const s = new SahteKasa()
    expect(await girisYap(AD, SIFRE, s.yapici, HIZLI)).toBeNull()
    expect(s.hesaplar.size).toBe(0)
    expect(s.satirlar.size).toBe(0)
  })

  it('yanlış şifreyle giriş null ve YENİ hesap açılmıyor', async () => {
    const s = new SahteKasa()
    await hesapAc(AD, SIFRE, s.yapici, HIZLI)
    expect(await girisYap(AD, BASKA, s.yapici, HIZLI)).toBeNull()
    /* Tek hesap kalmalı: yanlış şifre ikinci bir hesap açmamalı. */
    expect(s.hesaplar.size).toBe(1)
  })

  it('yanlış kullanıcı adıyla giriş null', async () => {
    const s = new SahteKasa()
    await hesapAc(AD, SIFRE, s.yapici, HIZLI)
    expect(await girisYap('baskaad', SIFRE, s.yapici, HIZLI)).toBeNull()
    expect(s.hesaplar.size).toBe(1)
  })

  it('kısa ad ve şifre null — ağa hiç gidilmiyor', async () => {
    const s = new SahteKasa()
    expect(await girisYap('a', SIFRE, s.yapici, HIZLI)).toBeNull()
    expect(await girisYap(AD, 'kisa', s.yapici, HIZLI)).toBeNull()
    expect(await hesapAc('a', SIFRE, s.yapici, HIZLI)).toBeNull()
    expect(s.satirlar.size).toBe(0)
  })
})

describe('aynı ad + farklı şifre = başka hesap', () => {
  it('iki ayrı defter yan yana duruyor, biri diğerini ezmiyor', async () => {
    const s = new SahteKasa()
    const a = await hesapAc(AD, SIFRE, s.yapici, HIZLI)
    const b = await hesapAc(AD, BASKA, s.yapici, HIZLI)
    expect(a).not.toBe(b)
    expect(s.satirlar.size).toBe(2)
    expect(await girisYap(AD, SIFRE, s.yapici, HIZLI)).toBe(a)
    expect(await girisYap(AD, BASKA, s.yapici, HIZLI)).toBe(b)
  })
})

describe('sunucuda duran şey', () => {
  it('kasa satırında ne kod ne şifre ne ad geçiyor', async () => {
    const s = new SahteKasa()
    const kod = (await hesapAc(AD, SIFRE, s.yapici, HIZLI))!
    const ham = JSON.stringify([...s.satirlar.entries()])
    expect(ham.length).toBeGreaterThan(60)
    expect(ham).not.toContain(kod)
    expect(ham).not.toContain(kod.replace(/-/g, ''))
    expect(ham).not.toContain(AD)
    expect(ham).not.toContain(SIFRE)
  })

  it('satır yalnızca iv ve gövde taşıyor', async () => {
    const s = new SahteKasa()
    await hesapAc(AD, SIFRE, s.yapici, HIZLI)
    expect(Object.keys([...s.satirlar.values()][0]!).sort()).toEqual(['govde', 'iv'])
  })
})

describe('ad ya da şifre değişimi', () => {
  it('yeni bilgilerle giriliyor, eskisiyle girilemiyor', async () => {
    const s = new SahteKasa()
    const kod = (await hesapAc(AD, SIFRE, s.yapici, HIZLI))!
    expect(await hesapTasi(AD, SIFRE, 'yeniad', BASKA, kod, s.yapici, HIZLI)).toBe(true)
    expect(await girisYap('yeniad', BASKA, s.yapici, HIZLI)).toBe(kod)
    expect(await girisYap(AD, SIFRE, s.yapici, HIZLI)).toBeNull()
    expect(s.satirlar.size).toBe(1)
  })

  it('yeni şifre kısaysa ESKİ hesaba dokunulmuyor', async () => {
    /* Sıra bağlayıcı: önce yaz, sonra sil. */
    const s = new SahteKasa()
    const kod = (await hesapAc(AD, SIFRE, s.yapici, HIZLI))!
    expect(await hesapTasi(AD, SIFRE, AD, 'kisa', kod, s.yapici, HIZLI)).toBe(false)
    expect(await girisYap(AD, SIFRE, s.yapici, HIZLI)).toBe(kod)
  })

  it('aynı ad ve şifreye taşımak kasayı silmiyor', async () => {
    const s = new SahteKasa()
    const kod = (await hesapAc(AD, SIFRE, s.yapici, HIZLI))!
    expect(await hesapTasi(AD, SIFRE, AD, SIFRE, kod, s.yapici, HIZLI)).toBe(true)
    expect(await girisYap(AD, SIFRE, s.yapici, HIZLI)).toBe(kod)
  })
})
