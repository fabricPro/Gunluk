import { beforeEach, describe, expect, it } from 'vitest'
import { kurtarmaUret } from '../src/cekirdek/kurtarma.js'
import { SON_SURUM, defteriAc, gocleriUygula, pragmalariKur, GOCLER } from '../src/veri/db.js'
import type { SqlSurucu } from '../src/veri/db.js'
import { Depo } from '../src/veri/depo.js'
import { DokumHatasi, dokumAl, dokumuYukle } from '../src/veri/dokum.js'
import { YedekHatasi, muhruAc, muhurle } from '../src/veri/yedek.js'
import { testSurucusu } from './surucu.js'

const HIZLI = { t: 1, m: 1024, p: 1 }

let db: SqlSurucu
let depo: Depo

beforeEach(async () => {
  db = await defteriAc(testSurucusu())
  depo = new Depo(db)
})

async function ornekDoldur(d: Depo): Promise<void> {
  await d.temaTanimla('kerem', 'Kerem', ['kerem'])
  const k1 = await d.kayitEkle({
    tarih: '2026-01-05',
    saat: '09:00',
    metin: 'İlk kayıt · şğüıöç',
    temalar: ['kerem'],
    soru: 'Bu defteri neden açtın?',
  })
  await d.kayitEkle({ tarih: '2026-02-10', saat: '23:00', metin: 'İkinci kayıt' })
  await d.baslikYaz(k1.id, 'Başlangıç')
  await d.kenarEkle(k1.id, 'Sonradan düşülen not', '3 mart 2026')
  await d.defterAdiYaz(d.aktifDefterId, 'Son yıl')
  await d.kapsulEkle('2026-01-01', '2030-01-01', 'Sevgili ben,')
  await d.ayarYaz('yonlendirme.gun', '3')
  /* Ek base64 METİN olduğu için döküme kendiliğinden giriyor (K-023). */
  await d.ekYaz({
    kayitId: k1.id,
    tur: 'image/jpeg',
    veri: '/9j/4AAQSkZJRg' + 'B'.repeat(120),
    en: 1200,
    boy: 900,
    bayt: 100,
  })
}

describe('döküm', () => {
  it('bütün tabloları alıyor, FTS gölgelerini almıyor', async () => {
    await ornekDoldur(depo)
    const d = await dokumAl(db)
    expect(d.bicim).toBe('defter-dokum')
    expect(d.semaSurum).toBe(SON_SURUM)
    expect(Object.keys(d.tablolar).sort()).toEqual(
      ['ayar', 'defter', 'ek', 'kapsul', 'kayit', 'kayit_tema', 'kenar', 'sayfa_baslik', 'tema'].sort(),
    )
    expect(d.tablolar.kayit).toHaveLength(2)
  })

  it('ek base64 gövdesiyle birebir geri geliyor', async () => {
    await ornekDoldur(depo)
    const once = (await depo.ekleriTam()).values().next().value!
    const d = await dokumAl(db)
    await dokumuYukle(db, d)
    const sonra = (await depo.ekleriTam()).values().next().value!
    expect(sonra.veri).toBe(once.veri)
    expect(sonra.en).toBe(1200)
    expect(sonra.boy).toBe(900)
  })

  it('geri yükleme her şeyi geri getiriyor', async () => {
    await ornekDoldur(depo)
    const d = await dokumAl(db)

    const yeni = await defteriAc(testSurucusu())
    await dokumuYukle(yeni, d)
    const yeniDepo = new Depo(yeni)

    expect(await yeniDepo.kayitSayisi()).toBe(2)
    const gunler = await yeniDepo.gunler()
    expect(gunler[0]!.kayitlar[0]!.metin).toBe('İlk kayıt · şğüıöç')
    expect(gunler[0]!.kayitlar[0]!.soru).toBe('Bu defteri neden açtın?')
    expect(gunler[0]!.kayitlar[0]!.temalar).toEqual(['kerem'])
    expect([...(await yeniDepo.basliklar()).values()]).toEqual(['Başlangıç'])
    expect([...(await yeniDepo.kenarlar()).values()][0]![0]!.metin).toBe('Sonradan düşülen not')
    expect((await yeniDepo.defterGetir('defter-1'))?.ad).toBe('Son yıl')
    expect(await yeniDepo.kapsuller()).toHaveLength(1)
    expect(await yeniDepo.ayarOku('yonlendirme.gun')).toBe('3')
  })

  it('geri yüklemeden sonra arama çalışıyor — FTS yeniden kuruluyor', async () => {
    await ornekDoldur(depo)
    const d = await dokumAl(db)
    const yeni = await defteriAc(testSurucusu())
    await dokumuYukle(yeni, d)
    const yeniDepo = new Depo(yeni)
    expect(await yeniDepo.ara('İlk')).toHaveLength(1)
    /* Yeni yazılan kayıt da indeksleniyor: tetikleyiciler yerinde. */
    await yeniDepo.kayitEkle({ tarih: '2026-03-01', saat: '10:00', metin: 'sonradan' })
    expect(await yeniDepo.ara('sonradan')).toHaveLength(1)
  })

  it('geri yükleme mevcut verinin YERİNE geçiyor', async () => {
    await ornekDoldur(depo)
    const d = await dokumAl(db)

    const baska = await defteriAc(testSurucusu())
    const baskaDepo = new Depo(baska)
    await baskaDepo.kayitEkle({ tarih: '2026-06-06', saat: '12:00', metin: 'silinecek kayıt' })
    await dokumuYukle(baska, d)
    expect(await baskaDepo.ara('silinecek')).toHaveLength(0)
    expect(await baskaDepo.kayitSayisi()).toBe(2)
  })

  it('ESKİ şema sürümüyle alınmış yedek göçlerden geçip yükleniyor', async () => {
    /* 1. sürümde bir defter kur ve doldur. */
    const eski = testSurucusu()
    await pragmalariKur(eski)
    await eski.islem(async () => {
      await eski.betik(GOCLER[0]!.sql)
      await eski.calistir('PRAGMA user_version = 1')
    })
    const t = Date.now()
    await eski.calistir(
      `INSERT INTO kayit (id, tarih, saat, metin, sira, olusturma, guncelleme, duzenlendi)
       VALUES ('k1', '2025-05-05', '08:00', 'çok eski bir kayıt', 0, ?, ?, 0)`,
      [t, t],
    )
    const d = await dokumAl(eski)
    expect(d.semaSurum).toBe(1)

    const yeni = await defteriAc(testSurucusu())
    await dokumuYukle(yeni, d)
    const yeniDepo = new Depo(yeni)
    expect(await yeniDepo.kayitSayisi()).toBe(1)
    expect((await yeniDepo.gunler())[0]!.kayitlar[0]!.metin).toBe('çok eski bir kayıt')
    expect(
      (await yeni.tek<{ user_version: number }>('PRAGMA user_version'))?.user_version,
    ).toBe(SON_SURUM)
  })

  it('daha YENİ sürümle alınmış yedek reddediliyor', async () => {
    const d = await dokumAl(db)
    d.semaSurum = SON_SURUM + 3
    await expect(dokumuYukle(db, d)).rejects.toThrow(DokumHatasi)
  })

  it('defter yedeği olmayan dosya reddediliyor', async () => {
    await expect(
      dokumuYukle(db, { bicim: 'başka-şey' } as never),
    ).rejects.toThrow(DokumHatasi)
  })
})

describe('mühürleme', () => {
  it('mühürlenip aynı kodla açılıyor', async () => {
    await ornekDoldur(depo)
    const d = await dokumAl(db)
    const kod = kurtarmaUret()
    const y = await muhurle(d, kod, HIZLI)
    const geri = await muhruAc(y, kod)
    expect(geri.tablolar.kayit).toHaveLength(2)
    expect(JSON.stringify(geri)).toBe(JSON.stringify(d))
  })

  it('YANLIŞ kodla açılmıyor', async () => {
    const d = await dokumAl(db)
    const y = await muhurle(d, kurtarmaUret(), HIZLI)
    await expect(muhruAc(y, kurtarmaUret())).rejects.toThrow(YedekHatasi)
  })

  it('geçersiz kod anlaşılır hata veriyor', async () => {
    const d = await dokumAl(db)
    await expect(muhurle(d, 'BOZUK-KOD', HIZLI)).rejects.toThrow(/geçersiz/)
    const y = await muhurle(d, kurtarmaUret(), HIZLI)
    await expect(muhruAc(y, 'BOZUK-KOD')).rejects.toThrow(/geçersiz/)
  })

  it('mühürlü dosyada AÇIK metin yok', async () => {
    await ornekDoldur(depo)
    const y = await muhurle(await dokumAl(db), kurtarmaUret(), HIZLI)
    const ham = JSON.stringify(y)
    expect(ham).not.toContain('İlk kayıt')
    expect(ham).not.toContain('Başlangıç')
    expect(ham).not.toContain('Sevgili ben')
    expect(ham).not.toContain('Sonradan düşülen not')
  })

  it('her mühürlemede tuz ve iv farklı', async () => {
    const d = await dokumAl(db)
    const kod = kurtarmaUret()
    const a = await muhurle(d, kod, HIZLI)
    const b = await muhurle(d, kod, HIZLI)
    expect(a.tuz).not.toBe(b.tuz)
    expect(a.iv).not.toBe(b.iv)
    expect(a.veri).not.toBe(b.veri)
  })

  it('bozulmuş dosya reddediliyor', async () => {
    const kod = kurtarmaUret()
    const y = await muhurle(await dokumAl(db), kod, HIZLI)
    await expect(muhruAc({ ...y, veri: y.veri.slice(0, -8) + 'AAAAAAAA' }, kod)).rejects.toThrow(
      YedekHatasi,
    )
    await expect(muhruAc({ ...y, bicim: 'yanlış' } as never, kod)).rejects.toThrow(/Defter yedeği/)
  })

  it('mühürden çıkan döküm gerçekten geri yüklenebiliyor', async () => {
    await ornekDoldur(depo)
    const kod = kurtarmaUret()
    const y = await muhurle(await dokumAl(db), kod, HIZLI)

    const yeni = await defteriAc(testSurucusu())
    await dokumuYukle(yeni, await muhruAc(y, kod))
    expect(await new Depo(yeni).kayitSayisi()).toBe(2)
  })
})

describe('göç hedefi', () => {
  it('gocleriUygula hedef sürümde duruyor', async () => {
    const s = testSurucusu()
    await pragmalariKur(s)
    await gocleriUygula(s, 2)
    expect((await s.tek<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(2)
  })
})

/**
 * K-036 · Sıkıştırma biçimde YAZILI.
 *
 * Önce `CompressionStream` yoksa sıkıştırma sessizce atlanıyordu ve
 * biçimde bunu söyleyen bir alan yoktu. Sıkıştırarak mühürlenip
 * sıkıştırma açamayan bir ortamda açılan dosya GCM etiketini geçiyor,
 * sonra `JSON.parse`ta çöple patlıyordu. Yedek on yıl sonra okunacak
 * diye tasarlandı (K-003); içinde tahmin edilecek bir şey kalmamalı.
 */
describe('yedek · sıkıştırma bayrağı', () => {
  const kod = kurtarmaUret()
  const ornek = { bicim: 'defter-dokum', surum: 1, semaSurum: 7, olusturma: 0, tablolar: {} }

  it('mühür sıkıştırmayı söylüyor', async () => {
    const y = await muhurle(ornek as never, kod, HIZLI)
    expect(y.sikistirma).toBe(typeof CompressionStream === 'undefined' ? 'yok' : 'gzip')
  })

  it("'yok' yazan yedek açılırken gzip denenmiyor", async () => {
    const y = await muhurle(ornek as never, kod, HIZLI)
    if (y.sikistirma !== 'gzip') return
    /* Gövdeyi elle sıkıştırmasız yeniden mühürle. */
    const dahaSonra = { ...y, sikistirma: 'yok' as const }
    /* Bayrak yalan söylüyor: gzip'li gövdeyi düz sayıyor → JSON patlar,
       ama sessiz bozulma değil, açık hata. */
    await expect(muhruAc(dahaSonra, kod)).rejects.toThrow()
  })

  it('bayraksız eski yedekler gzip sayılıyor', async () => {
    const y = await muhurle(ornek as never, kod, HIZLI)
    if (y.sikistirma !== 'gzip') return
    const eski = { ...y }
    delete (eski as { sikistirma?: unknown }).sikistirma
    expect(await muhruAc(eski, kod)).toEqual(ornek)
  })
})
