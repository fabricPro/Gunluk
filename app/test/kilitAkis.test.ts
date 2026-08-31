import { beforeEach, describe, expect, it } from 'vitest'
import { Kilit } from '../src/kilitAkis.js'
import type { KilitKaydi } from '../src/veri/kilit.js'
import type { KilitDepo } from '../src/veri/kilitDepo.js'

/** Bellekte duran sahte depo — cihaz eklentisi olmadan akışı sınar. */
function sahteDepo(biyometriVar = true): KilitDepo & { kayit: KilitKaydi | null; bio: string | null } {
  const d = {
    kayit: null as KilitKaydi | null,
    bio: null as string | null,
    async oku() { return d.kayit },
    async yaz(k: KilitKaydi) { d.kayit = k },
    async sil() { d.kayit = null; d.bio = null },
    async biyometriVarMi() { return biyometriVar },
    async biyometriKur(av: string) { d.bio = av },
    async biyometriIleAc() { return d.bio },
    async biyometriKaldir() { d.bio = null },
  }
  return d
}

let depo: ReturnType<typeof sahteDepo>
let kilit: Kilit

beforeEach(() => {
  depo = sahteDepo()
  kilit = new Kilit(depo)
})

describe('durumlar', () => {
  it('kilit kurulu değilse kurulusuz başlar', async () => {
    expect(await kilit.yukle()).toBe('kurulusuz')
    expect(kilit.anaAnahtar).toBeNull()
  })

  it('kayıt varsa KİLİTLİ başlar — anahtar bellekte değil', async () => {
    await kilit.kur('123456')
    const yeni = new Kilit(depo)
    expect(await yeni.yukle()).toBe('kilitli')
    expect(yeni.anaAnahtar).toBeNull()
  })

  it('kilitleyince anahtar bellekten siliniyor', async () => {
    await kilit.kur('123456')
    expect(kilit.anaAnahtar).not.toBeNull()
    kilit.kilitle()
    expect(kilit.durum).toBe('kilitli')
    expect(kilit.anaAnahtar).toBeNull()
  })
})

describe('açma', () => {
  it('doğru PIN açar ve aynı anahtarı verir', async () => {
    const av = await kilit.kur('123456')
    kilit.kilitle()
    const s = await kilit.pinIle('123456')
    expect(s.oldu).toBe(true)
    expect(s.anaAnahtar).toBe(av)
    expect(kilit.anaAnahtar).toBe(av)
  })

  it('yanlış PIN açmaz ve anahtarı sızdırmaz', async () => {
    await kilit.kur('123456')
    kilit.kilitle()
    const s = await kilit.pinIle('000000')
    expect(s.oldu).toBe(false)
    expect(s.sebep).toBe('yanlis')
    expect(s.anaAnahtar).toBeUndefined()
    expect(kilit.anaAnahtar).toBeNull()
    expect(kilit.durum).toBe('kilitli')
  })

  it('yanlış denemeler kalıcı sayılıyor — uygulamayı kapatmak sayacı sıfırlamaz', async () => {
    await kilit.kur('123456')
    kilit.kilitle()
    for (let i = 0; i < 5; i++) await kilit.pinIle('000000')

    const yeniOturum = new Kilit(depo)
    await yeniOturum.yukle()
    const s = await yeniOturum.pinIle('123456')
    expect(s.oldu).toBe(false)
    expect(s.sebep).toBe('bekleme')
    expect(s.kalan).toBeGreaterThan(0)
  })

  it('bekleme dolunca doğru PIN yine açıyor', async () => {
    const av = await kilit.kur('123456')
    kilit.kilitle()
    const t = 1_000_000
    for (let i = 0; i < 5; i++) await kilit.pinIle('000000', t)
    const s = await kilit.pinIle('123456', t + 31_000)
    expect(s.oldu).toBe(true)
    expect(s.anaAnahtar).toBe(av)
  })

  it('doğru PIN sonrası sayaç sıfırlanıyor', async () => {
    await kilit.kur('123456')
    kilit.kilitle()
    await kilit.pinIle('000000')
    await kilit.pinIle('123456')
    expect(depo.kayit?.hata).toBe(0)
  })
})

describe('biyometri', () => {
  it('kurulunca aynı anahtarı açıyor', async () => {
    const av = await kilit.kur('123456')
    expect(await kilit.biyometriKur()).toBe(true)
    kilit.kilitle()
    const s = await kilit.biyometriIle()
    expect(s.oldu).toBe(true)
    expect(s.anaAnahtar).toBe(av)
  })

  it('kurulu değilse açmaz', async () => {
    await kilit.kur('123456')
    kilit.kilitle()
    expect((await kilit.biyometriIle()).oldu).toBe(false)
  })

  it('kaldırılınca artık açmıyor ama PIN çalışıyor', async () => {
    const av = await kilit.kur('123456')
    await kilit.biyometriKur()
    await kilit.biyometriKaldir()
    kilit.kilitle()
    expect((await kilit.biyometriIle()).oldu).toBe(false)
    expect((await kilit.pinIle('123456')).anaAnahtar).toBe(av)
  })

  it('cihazda biyometri yoksa kurulamaz', async () => {
    const k = new Kilit(sahteDepo(false))
    await k.kur('123456')
    expect(await k.biyometriKur()).toBe(false)
  })
})

describe('yönetim', () => {
  it('var olan defterin anahtarı korunuyor — kilit sonradan kurulabilir', async () => {
    const mevcut = 'a'.repeat(64)
    const av = await kilit.kur('123456', mevcut)
    expect(av).toBe(mevcut)
  })

  it('PIN değişince anahtar aynı kalıyor, defter yeniden şifrelenmiyor', async () => {
    const av = await kilit.kur('123456')
    expect(await kilit.pinDegistir('123456', '654321')).toBe(true)
    kilit.kilitle()
    expect((await kilit.pinIle('654321')).anaAnahtar).toBe(av)
    expect((await kilit.pinIle('123456')).oldu).toBe(false)
  })

  it('yanlış eski PIN ile değiştirilemiyor', async () => {
    await kilit.kur('123456')
    expect(await kilit.pinDegistir('000000', '654321')).toBe(false)
    kilit.kilitle()
    expect((await kilit.pinIle('123456')).oldu).toBe(true)
  })

  it('PIN değişimi biyometri ayarını koruyor', async () => {
    await kilit.kur('123456')
    await kilit.biyometriKur()
    await kilit.pinDegistir('123456', '654321')
    expect(kilit.biyometriAcik).toBe(true)
  })

  it('kilit kaldırılınca kayıt da biyometri kopyası da siliniyor', async () => {
    await kilit.kur('123456')
    await kilit.biyometriKur()
    await kilit.kaldir()
    expect(kilit.durum).toBe('kurulusuz')
    expect(depo.kayit).toBeNull()
    expect(depo.bio).toBeNull()
  })
})

/**
 * K-036 · Kilit kurulunca cihazdaki veritabanı açılabilir kalmalı.
 *
 * Cihazda defter, Keychain'deki rastgele bir anahtarla SQLCipher altında
 * duruyor. Kilit kurmak o anahtarı PIN'le SARMALAMAK demek; yerine
 * yenisini koymak değil. Kodda hiçbir yerde rekey yok, dolayısıyla yeni
 * bir anahtar üretilirse defter bir daha açılmaz.
 *
 * Hata tam olarak buradaydı: `ana.ts` sarmalanacak anahtarı
 * `kilit.anaAnahtar`dan okuyordu ve kilit 'kurulusuz' iken o her zaman
 * null. Bir sonraki açılışta doğru PIN'le bile defter açılmıyordu.
 */
describe('kilit kurulumu var olan anahtarı sarmalıyor', () => {
  const CIHAZ_ANAHTARI = 'a'.repeat(64)

  it('verilen anahtar korunuyor — PIN sonradan aynı anahtarı açıyor', async () => {
    await kilit.kur('123456', CIHAZ_ANAHTARI)
    expect(kilit.anaAnahtar).toBe(CIHAZ_ANAHTARI)

    /* Yeni oturum: kilitli açılıyor, PIN ile çözülüyor. */
    const yeni = new Kilit(depo)
    expect(await yeni.yukle()).toBe('kilitli')
    const s = await yeni.pinIle('123456')
    expect(s.oldu).toBe(true)
    expect(yeni.anaAnahtar).toBe(CIHAZ_ANAHTARI)
  })

  it('anahtar verilmezse BAŞKA bir anahtar üretiliyor — hatanın kendisi bu', () => {
    /*
     * Bu davranışı sabitliyoruz ki çağrı yerinin neden anahtarı geçirmek
     * zorunda olduğu görünsün. `kur(pin)` tek başına yanlış değil (ilk
     * kurulumda gereken tam da bu); yanlış olan, şifreli bir defterin
     * üstünde onu anahtarsız çağırmak.
     */
    return kilit.kur('123456').then((av) => expect(av).not.toBe(CIHAZ_ANAHTARI))
  })

  it('PIN değişince ana anahtar aynı kalıyor', async () => {
    await kilit.kur('123456', CIHAZ_ANAHTARI)
    expect(await kilit.pinDegistir('123456', '654321')).toBe(true)
    const yeni = new Kilit(depo)
    await yeni.yukle()
    await yeni.pinIle('654321')
    expect(yeni.anaAnahtar).toBe(CIHAZ_ANAHTARI)
  })

  it('biyometri yolu da aynı anahtarı veriyor', async () => {
    await kilit.kur('123456', CIHAZ_ANAHTARI)
    await kilit.biyometriKur()
    const yeni = new Kilit(depo)
    await yeni.yukle()
    expect((await yeni.biyometriIle()).oldu).toBe(true)
    expect(yeni.anaAnahtar).toBe(CIHAZ_ANAHTARI)
  })
})
