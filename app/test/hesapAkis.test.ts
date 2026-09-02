import { describe, expect, it } from 'vitest'
import { kurtarmaCoz } from '../src/cekirdek/kurtarma.js'
import type { HesapKimlik } from '../src/cekirdek/hesapKimlik.js'
import type { KasaSatir } from '../src/veri/senkronDepo.js'
import {
  girisYap,
  hesapAc,
  hesapTasi,
  type KasaSonuc,
  type KasaSunucu,
} from '../src/hesapAkis.js'

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
    oku: async () => {
      const satir = this.satirlar.get(kimlik.kimlik)
      if (satir) return { durum: 'var' as const, satir }
      /* Hesap var ama satır yok ile hesap hiç yok AYRI şeyler. */
      return this.hesaplar.has(kimlik.kimlik)
        ? { durum: 'satirYok' as const }
        : { durum: 'hesapYok' as const }
    },
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

/**
 * Base64 gövdenin ilk karakterini KESİN olarak değiştirir.
 *
 * "A ile başlat" demek 64'te bir işlemsiz kalıyordu ve deneme ara sıra
 * boşa geçiyordu; harf iki seçenek arasından, mevcut olmayanı seçiyor
 * (KARARLAR.md · K-039'daki aynı hata).
 */
const bozGovde = (g: string): string => (g[0] === 'A' ? 'B' : 'A') + g.slice(1)

/** Başarılı sonucun kodunu verir; başarısızsa testi düşürür. */
const kodu = (s: KasaSonuc): string => {
  expect(s.durum).toBe('tamam')
  return s.durum === 'tamam' ? s.kod : ''
}

describe('açılamayan kasanın üstüne YAZILMIYOR', () => {
  /**
   * Bu dosyadaki en pahalı muhafız.
   *
   * `hesapAc` eskiden kasayı okuyup açamazsa YENİ bir Defter Kimliği
   * üretip üstüne yazıyordu. Sunucudaki defteri açan tek anahtar o eski
   * koddu: üstüne yazmak yıllık bir defteri, kullanıcı yalnızca "hesap
   * aç"a bastı diye, sessizce ve KALICI olarak okunamaz hâle getirirdi
   * (KARARLAR.md · K-042).
   *
   * Kasa bozulunca kurgulanıyor, çünkü ad+şifre kimliği de anahtarı da
   * birlikte belirliyor: yanlış şifre BAŞKA bir hesaba bakmak demek,
   * "açılamayan kasa" demek değil.
   */
  it('kasa açılamıyorsa yeni kod üretilmiyor ve satır DEĞİŞMİYOR', async () => {
    const s = new SahteKasa()
    const kod = kodu(await hesapAc(AD, SIFRE, s.yapici, HIZLI))

    const [anahtar, once] = [...s.satirlar.entries()][0]!
    /* Gövdeyi boz: GCM etiketi artık tutmayacak. */
    s.satirlar.set(anahtar, { ...once, govde: bozGovde(once.govde) })
    const bozuk = s.satirlar.get(anahtar)!

    const sonuc = await hesapAc(AD, SIFRE, s.yapici, HIZLI)
    expect(sonuc.durum).toBe('cozulemedi')
    /* ASIL İDDİA: satır olduğu gibi duruyor. */
    expect(s.satirlar.get(anahtar)).toEqual(bozuk)
    expect(s.satirlar.size).toBe(1)

    /* Giriş de aynı şeyi söylüyor — "hesap yok" değil. */
    expect((await girisYap(AD, SIFRE, s.yapici, HIZLI)).durum).toBe('cozulemedi')

    /* Kasa düzelince eski kod geri geliyor: üstüne yazılmadığının kanıtı. */
    s.satirlar.set(anahtar, once)
    expect(kodu(await girisYap(AD, SIFRE, s.yapici, HIZLI))).toBe(kod)
  })

  it('hesap var ama satır yoksa bu "hesap yok" ile karıştırılmıyor', async () => {
    const s = new SahteKasa()
    await hesapAc(AD, SIFRE, s.yapici, HIZLI)
    s.satirlar.clear()
    expect((await girisYap(AD, SIFRE, s.yapici, HIZLI)).durum).toBe('satirYok')
  })
})

describe('hesap aç → giriş yap', () => {
  it('açılan hesaba aynı ad ve şifreyle girilince aynı kod geliyor', async () => {
    const s = new SahteKasa()
    const kod = kodu(await hesapAc(AD, SIFRE, s.yapici, HIZLI))
    expect(kurtarmaCoz(kod)).not.toBeNull()
    expect(kodu(await girisYap(AD, SIFRE, s.yapici, HIZLI))).toBe(kod)
  })

  it('kod her hesapta rastgele — şifreden türemiyor', async () => {
    /* Defterin şifrelemesi insan parolasına inmiyor; şifre yalnızca
       rastgele kodu sarmalıyor. */
    const a = kodu(await hesapAc(AD, SIFRE, new SahteKasa().yapici, HIZLI))
    const b = kodu(await hesapAc(AD, SIFRE, new SahteKasa().yapici, HIZLI))
    expect(a).not.toBe(b)
  })

  it('var olan hesapta "hesap aç" YENİ kod üretmiyor', async () => {
    /*
     * "Hesap aç" ile "giriş yap" karıştırılırsa defterin üstüne
     * yazılırdı — veri kaybının en sessiz yolu. Mevcut kasa okunuyor.
     */
    const s = new SahteKasa()
    const kod = kodu(await hesapAc(AD, SIFRE, s.yapici, HIZLI))
    expect(kodu(await hesapAc(AD, SIFRE, s.yapici, HIZLI))).toBe(kod)
    expect(s.satirlar.size).toBe(1)
  })
})

describe('giriş hesap YARATMIYOR', () => {
  it('hiç hesap yokken giriş null ve ortada hesap yok', async () => {
    const s = new SahteKasa()
    expect((await girisYap(AD, SIFRE, s.yapici, HIZLI)).durum).toBe('yok')
    expect(s.hesaplar.size).toBe(0)
    expect(s.satirlar.size).toBe(0)
  })

  it('yanlış şifreyle giriş null ve YENİ hesap açılmıyor', async () => {
    const s = new SahteKasa()
    await hesapAc(AD, SIFRE, s.yapici, HIZLI)
    expect((await girisYap(AD, BASKA, s.yapici, HIZLI)).durum).toBe('yok')
    /* Tek hesap kalmalı: yanlış şifre ikinci bir hesap açmamalı. */
    expect(s.hesaplar.size).toBe(1)
  })

  it('yanlış kullanıcı adıyla giriş null', async () => {
    const s = new SahteKasa()
    await hesapAc(AD, SIFRE, s.yapici, HIZLI)
    expect((await girisYap('baskaad', SIFRE, s.yapici, HIZLI)).durum).toBe('yok')
    expect(s.hesaplar.size).toBe(1)
  })

  it('kısa ad ve şifre null — ağa hiç gidilmiyor', async () => {
    const s = new SahteKasa()
    expect((await girisYap('a', SIFRE, s.yapici, HIZLI)).durum).toBe('gecersiz')
    expect((await girisYap(AD, 'kisa', s.yapici, HIZLI)).durum).toBe('gecersiz')
    expect((await hesapAc('a', SIFRE, s.yapici, HIZLI)).durum).toBe('gecersiz')
    expect(s.satirlar.size).toBe(0)
  })
})

describe('aynı ad + farklı şifre = başka hesap', () => {
  it('iki ayrı defter yan yana duruyor, biri diğerini ezmiyor', async () => {
    const s = new SahteKasa()
    const a = kodu(await hesapAc(AD, SIFRE, s.yapici, HIZLI))
    const b = kodu(await hesapAc(AD, BASKA, s.yapici, HIZLI))
    expect(a).not.toBe(b)
    expect(s.satirlar.size).toBe(2)
    expect(kodu(await girisYap(AD, SIFRE, s.yapici, HIZLI))).toBe(a)
    expect(kodu(await girisYap(AD, BASKA, s.yapici, HIZLI))).toBe(b)
  })
})

describe('sunucuda duran şey', () => {
  it('kasa satırında ne kod ne şifre ne ad geçiyor', async () => {
    const s = new SahteKasa()
    const kod = kodu(await hesapAc(AD, SIFRE, s.yapici, HIZLI))
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
    const kod = kodu(await hesapAc(AD, SIFRE, s.yapici, HIZLI))
    expect(await hesapTasi(AD, SIFRE, 'yeniad', BASKA, kod, s.yapici, HIZLI)).toBe(true)
    expect(kodu(await girisYap('yeniad', BASKA, s.yapici, HIZLI))).toBe(kod)
    expect((await girisYap(AD, SIFRE, s.yapici, HIZLI)).durum).toBe('yok')
    expect(s.satirlar.size).toBe(1)
  })

  it('yeni şifre kısaysa ESKİ hesaba dokunulmuyor', async () => {
    /* Sıra bağlayıcı: önce yaz, sonra sil. */
    const s = new SahteKasa()
    const kod = kodu(await hesapAc(AD, SIFRE, s.yapici, HIZLI))
    expect(await hesapTasi(AD, SIFRE, AD, 'kisa', kod, s.yapici, HIZLI)).toBe(false)
    expect(kodu(await girisYap(AD, SIFRE, s.yapici, HIZLI))).toBe(kod)
  })

  it('aynı ad ve şifreye taşımak kasayı silmiyor', async () => {
    const s = new SahteKasa()
    const kod = kodu(await hesapAc(AD, SIFRE, s.yapici, HIZLI))
    expect(await hesapTasi(AD, SIFRE, AD, SIFRE, kod, s.yapici, HIZLI)).toBe(true)
    expect(kodu(await girisYap(AD, SIFRE, s.yapici, HIZLI))).toBe(kod)
  })
})
