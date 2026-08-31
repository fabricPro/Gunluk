import { describe, expect, it } from 'vitest'
import { kurtarmaUret } from '../src/cekirdek/kurtarma.js'
import { ALAN_ADI, kimlikTuret, satirKimligi } from '../src/cekirdek/senkronKimlik.js'

/**
 * Defter Kimliği — senkronun kimlik ve anahtar türetmesi.
 *
 * Buradaki tek soru: sunucu ne görüyor, ve gördüğünden neye
 * gidebiliyor? Cevap "hiçbir şeye" olmak zorunda (KARARLAR.md · K-036).
 */

/* Testte Argon2'yi hafiflet; türetmenin mantığı parametreden bağımsız. */
const HIZLI = { t: 1, m: 1024, p: 1 }

describe('türetme kararlı', () => {
  it('aynı kod her zaman aynı kimliği veriyor', async () => {
    const kod = kurtarmaUret()
    const a = (await kimlikTuret(kod, HIZLI))!
    const b = (await kimlikTuret(kod, HIZLI))!
    expect(a.kimlik).toBe(b.kimlik)
    expect(a.eposta).toBe(b.eposta)
    expect(a.parola).toBe(b.parola)
  })

  it('ikinci cihaz da aynı sonuca varıyor — biçim farkı önemsiz', async () => {
    const kod = kurtarmaUret()
    /* Kullanıcı tireleri düşürüp küçük harfle yazsa da olmalı. */
    const elleYazilmis = kod.replace(/-/g, '').toLowerCase()
    const a = (await kimlikTuret(kod, HIZLI))!
    const b = (await kimlikTuret(elleYazilmis, HIZLI))!
    expect(b.kimlik).toBe(a.kimlik)
  })

  it('farklı kod farklı kimlik', async () => {
    const a = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    const b = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    expect(a.kimlik).not.toBe(b.kimlik)
  })

  it('geçersiz kod null — sağlama tutmuyorsa hiç denenmiyor', async () => {
    expect(await kimlikTuret('BOYLE-BIR-KOD-YOK', HIZLI)).toBeNull()
    expect(await kimlikTuret('', HIZLI)).toBeNull()
  })
})

describe('sunucunun gördüğü şey', () => {
  it('kimlik opak — kodun hiçbir parçası içinde geçmiyor', async () => {
    const kod = kurtarmaUret()
    const k = (await kimlikTuret(kod, HIZLI))!
    const sade = kod.replace(/-/g, '')
    expect(k.kimlik).not.toContain(sade)
    /* Kodun dörtlü öbeklerinden hiçbiri kimliğin içinde olmamalı. */
    for (const obek of kod.split('-')) expect(k.kimlik.toUpperCase()).not.toContain(obek)
  })

  it('e-posta çözülemeyen bir alan adında — hiçbir yere posta gitmiyor', async () => {
    const k = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    expect(k.eposta.endsWith('@' + ALAN_ADI)).toBe(true)
    expect(ALAN_ADI).toBe('defter.invalid')
  })

  it('parola ile kimlik birbirinden bağımsız', async () => {
    const k = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    expect(k.parola).not.toContain(k.kimlik)
    expect(k.kimlik).not.toContain(k.parola)
  })

  it('şifreleme anahtarı dışa aktarılamaz — kaza eseri gönderilemez', async () => {
    const k = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    expect(k.sifre.extractable).toBe(false)
    expect(k.satir.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', k.sifre)).rejects.toThrow()
  })

  it('şifreleme anahtarı yalnızca şifreleme için — imzalayamaz', async () => {
    const k = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    expect(k.sifre.usages.sort()).toEqual(['decrypt', 'encrypt'])
    expect(k.satir.usages).toEqual(['sign'])
  })
})

describe('satır kimliği', () => {
  it('kararlı ve varlığa özgü', async () => {
    const k = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    const a = await satirKimligi(k, 'kayit', 'abc')
    expect(await satirKimligi(k, 'kayit', 'abc')).toBe(a)
    expect(await satirKimligi(k, 'kenar', 'abc')).not.toBe(a)
    expect(await satirKimligi(k, 'kayit', 'abd')).not.toBe(a)
  })

  it('ham kimliği sızdırmıyor — tip de görünmüyor', async () => {
    const k = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    const s = await satirKimligi(k, 'kayit', 'gizli-uuid-123')
    expect(s).not.toContain('gizli-uuid-123')
    expect(s).not.toContain('kayit')
    expect(s).toMatch(/^[0-9a-f]{64}$/)
  })

  it('başka hesap aynı kaydı farklı kimlikle görüyor', async () => {
    const a = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    const b = (await kimlikTuret(kurtarmaUret(), HIZLI))!
    expect(await satirKimligi(a, 'kayit', 'ayni-id')).not.toBe(
      await satirKimligi(b, 'kayit', 'ayni-id'),
    )
  })
})
