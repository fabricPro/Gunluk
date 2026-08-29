import { beforeEach, describe, expect, it } from 'vitest'
import { Depo } from '../src/veri/depo.js'
import { SON_SURUM, defteriAc, gocleriUygula } from '../src/veri/db.js'
import type { SqlSurucu } from '../src/veri/db.js'
import { defteriSifirla } from '../src/veri/sifirla.js'
import { testSurucusu } from './surucu.js'

let db: SqlSurucu
let depo: Depo

beforeEach(async () => {
  db = await defteriAc(testSurucusu())
  depo = new Depo(db)
})

describe('göç', () => {
  it('boş veritabanını güncel sürüme getirir', async () => {
    expect((await db.tek<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(SON_SURUM)
  })

  it('ikinci kez çalıştırıldığında hiçbir şey yapmaz', async () => {
    expect(await gocleriUygula(db)).toBe(0)
  })

  it('daha yeni sürümle yazılmış defteri açmayı reddeder', async () => {
    await db.calistir(`PRAGMA user_version = ${SON_SURUM + 5}`)
    await expect(gocleriUygula(db)).rejects.toThrow(/en fazla/)
  })

  it('secure_delete açık — silinen kayıt sayfada iz bırakmasın', async () => {
    expect((await db.tek<{ secure_delete: number }>('PRAGMA secure_delete'))?.secure_delete).toBe(1)
  })
})

describe('kayıt', () => {
  it('ekler ve geri okur', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-08-28', saat: '14:50', metin: 'Mülakat fena geçmedi.' })
    const geri = await depo.kayitGetir(k.id)
    expect(geri?.metin).toBe('Mülakat fena geçmedi.')
    expect(geri?.duzenlendi).toBe(false)
    expect(await depo.kayitSayisi()).toBe(1)
  })

  it('düzeltme iz bırakır', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-08-28', saat: '09:00', metin: 'ilk hâli' })
    await depo.kayitDuzelt(k.id, 'düzeltilmiş hâli')
    const geri = await depo.kayitGetir(k.id)
    expect(geri?.metin).toBe('düzeltilmiş hâli')
    expect(geri?.duzenlendi).toBe(true)
  })

  it('temalarıyla saklar', async () => {
    const k = await depo.kayitEkle({
      tarih: '2026-08-28',
      saat: '20:00',
      metin: 'Kerem yine yazmadı.',
      temalar: ['kerem', 'beklemek'],
    })
    expect((await depo.kayitGetir(k.id))?.temalar.sort()).toEqual(['beklemek', 'kerem'])
  })

  it('günlere gruplar ve zaman sırasına dizer', async () => {
    await depo.kayitEkle({ tarih: '2026-08-27', saat: '10:05', metin: 'yürüyüş' })
    await depo.kayitEkle({ tarih: '2026-08-28', saat: '08:30', metin: 'mülakat sabahı' })
    await depo.kayitEkle({ tarih: '2026-08-28', saat: '14:50', metin: 'mülakat sonrası' })
    const g = await depo.gunler()
    expect(g.map((x) => x.tarih)).toEqual(['2026-08-27', '2026-08-28'])
    expect(g[1]!.kayitlar.map((k) => k.saat)).toEqual(['08:30', '14:50'])
    expect(g[0]!.ad).toBe('perşembe')
  })

  it('siler', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-08-28', saat: '10:00', metin: 'silinecek' })
    await depo.kayitSil(k.id)
    expect(await depo.kayitGetir(k.id)).toBeNull()
    expect(await depo.kayitSayisi()).toBe(0)
  })

  it('boş defterde çökmez', async () => {
    expect(await depo.gunler()).toEqual([])
    expect(await depo.kayitSayisi()).toBe(0)
    expect(await depo.ara('herhangi bir şey')).toEqual([])
  })
})

describe('arama · FTS5', () => {
  beforeEach(async () => {
    await depo.kayitEkle({ tarih: '2026-02-03', saat: '23:40', metin: 'Kerem yine yazmadı, bekliyorum.' })
    await depo.kayitEkle({ tarih: '2026-02-19', saat: '10:00', metin: 'Tez danışmanına yazdım.' })
    await depo.kayitEkle({ tarih: '2026-03-04', saat: '21:00', metin: 'Açık havada yürüdüm, iyi geldi.' })
  })

  it('sözcük bulur', async () => {
    expect((await depo.ara('kerem')).map((k) => k.metin)).toEqual(['Kerem yine yazmadı, bekliyorum.'])
  })

  it('Türkçe karakterleri ayırt eder — açık ile acik aynı sözcük değil', async () => {
    expect(await depo.ara('açık')).toHaveLength(1)
    expect(await depo.ara('acik')).toHaveLength(0)
  })

  it('düzeltilen kaydın indeksi güncellenir', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-04-01', saat: '12:00', metin: 'portakal' })
    expect(await depo.ara('portakal')).toHaveLength(1)
    await depo.kayitDuzelt(k.id, 'mandalina')
    expect(await depo.ara('portakal')).toHaveLength(0)
    expect(await depo.ara('mandalina')).toHaveLength(1)
  })

  it('silinen kayıt indeksten de düşer', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-04-02', saat: '12:00', metin: 'zeytin' })
    await depo.kayitSil(k.id)
    expect(await depo.ara('zeytin')).toHaveLength(0)
  })

  it('FTS sözdizimi kullanıcı metninden sızmaz', async () => {
    expect(async () => await depo.ara('kerem OR tez NEAR("x")')).not.toThrow()
    expect(async () => await depo.ara('"')).not.toThrow()
    expect(async () => await depo.ara('*')).not.toThrow()
  })
})

describe('başlık ve kenar notu — kayıt kimliğine bağlı (K-005)', () => {
  it('başlık yazılır, değiştirilir, silinir', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-08-28', saat: '10:00', metin: 'a' })
    await depo.baslikYaz(k.id, 'Mülakat haftası')
    expect((await depo.basliklar()).get(k.id)).toBe('Mülakat haftası')
    await depo.baslikYaz(k.id, 'Yeni ad')
    expect((await depo.basliklar()).get(k.id)).toBe('Yeni ad')
    await depo.baslikYaz(k.id, '   ')
    expect((await depo.basliklar()).has(k.id)).toBe(false)
  })

  it('araya kayıt eklenince başlık kaymaz', async () => {
    const ikinci = await depo.kayitEkle({ tarih: '2026-08-20', saat: '12:00', metin: 'başlıklı kayıt' })
    await depo.baslikYaz(ikinci.id, 'Bu başlık buraya ait')
    await depo.kayitEkle({ tarih: '2026-08-10', saat: '09:00', metin: 'daha eski bir kayıt' })
    await depo.kayitEkle({ tarih: '2026-08-15', saat: '09:00', metin: 'araya giren kayıt' })
    expect((await depo.basliklar()).get(ikinci.id)).toBe('Bu başlık buraya ait')
    expect((await depo.basliklar()).size).toBe(1)
  })

  it('kayıt silinince başlığı ve kenar notu da gider', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-08-28', saat: '10:00', metin: 'a' })
    await depo.baslikYaz(k.id, 'başlık')
    await depo.kenarEkle(k.id, 'sonradan düşülen not', '29 ağustos 2026')
    await depo.kayitSil(k.id)
    expect((await depo.basliklar()).size).toBe(0)
    expect((await depo.kenarlar()).size).toBe(0)
  })

  it('kenar notu kayda bağlanır', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-03-12', saat: '03:00', metin: 'dibi gördüm' })
    await depo.kenarEkle(k.id, 'Bunu okuyan ben: o gün gerçekten dibi görmüştün.', '14 haziran 2026')
    const kn = (await depo.kenarlar()).get(k.id)
    expect(kn?.metin).toContain('dibi görmüştün')
    expect(kn?.tarih).toBe('14 haziran 2026')
  })
})

describe('kitaplık', () => {
  it('göçten gelen tek defter aktif', async () => {
    const d = await depo.defterGetir(depo.aktifDefterId)
    expect(d?.ad).toBe('Defter')
    expect(d?.cilt).toBe(1)
  })

  it('yeni defter açılır, adı ve kapağı saklanır', async () => {
    const d = await depo.defterAc('Gece defteri', 'bez')
    expect(d.ad).toBe('Gece defteri')
    expect(d.cilt).toBe(1)
    expect(d.kapak).toBe('bez')
    expect(await depo.defterler()).toHaveLength(2)
  })

  it('aynı adla açılan defter bir sonraki cilt olur (K-016)', async () => {
    await depo.defterAc('Günlük', 'deri')
    expect(await depo.siradakiCilt('Günlük')).toBe(2)
    const ikinci = await depo.defterAc('Günlük', 'kraft')
    expect(ikinci.cilt).toBe(2)
    const ucuncu = await depo.defterAc('Günlük', 'kraft')
    expect(ucuncu.cilt).toBe(3)
    expect(await depo.siradakiCilt('Yepyeni')).toBe(1)
  })

  it('kayıtlar yalnızca kendi defterinde görünür', async () => {
    await depo.kayitEkle({ tarih: '2026-01-01', saat: '09:00', metin: 'birinci defterin kaydı' })
    const ikinci = await depo.defterAc('İkinci', 'bez')
    depo.defteriSec(ikinci.id)
    expect(await depo.kayitSayisi()).toBe(0)
    expect(await depo.ara('birinci')).toHaveLength(0)
    await depo.kayitEkle({ tarih: '2026-01-01', saat: '10:00', metin: 'ikinci defterin kaydı' })
    expect(await depo.kayitSayisi()).toBe(1)

    depo.defteriSec('defter-1')
    expect(await depo.kayitSayisi()).toBe(1)
    expect(await depo.ara('birinci')).toHaveLength(1)
    expect(await depo.ara('ikinci defterin')).toHaveLength(0)
  })

  it('defter silinince kayıtları da gider', async () => {
    const d = await depo.defterAc('Silinecek', 'deri')
    depo.defteriSec(d.id)
    await depo.kayitEkle({ tarih: '2026-01-01', saat: '09:00', metin: 'gidecek' })
    await db.calistir('DELETE FROM defter WHERE id = ?', [d.id])
    expect(await depo.kayitSayisi()).toBe(0)
  })

  it('raf dizilişi saklanır', async () => {
    const a = await depo.defterAc('A', 'deri')
    const b = await depo.defterAc('B', 'bez')
    await depo.rafiDiz([
      { id: b.id, raf: 0, sira: 0 },
      { id: a.id, raf: 1, sira: 0 },
    ])
    const hepsi = await depo.defterler()
    const bulunan = hepsi.filter((d) => d.id === a.id || d.id === b.id)
    expect(bulunan.find((d) => d.id === b.id)).toMatchObject({ raf: 0, sira: 0 })
    expect(bulunan.find((d) => d.id === a.id)).toMatchObject({ raf: 1, sira: 0 })
  })

  it('defter kapatılabilir', async () => {
    const d = await depo.defterAc('Kapanacak', 'deri')
    await depo.defterKapat(d.id)
    expect((await depo.defterGetir(d.id))?.kapandi).toBe(true)
  })

  it('kayıt sayısı defter başına doğru', async () => {
    await depo.kayitEkle({ tarih: '2026-01-01', saat: '09:00', metin: 'bir' })
    await depo.kayitEkle({ tarih: '2026-01-02', saat: '09:00', metin: 'iki' })
    const d = await depo.defterGetir('defter-1')
    expect(d?.kayitSayisi).toBe(2)
  })
})

describe('ayar', () => {
  it('yazılır ve okunur', async () => {
    expect(await depo.ayarOku('yok')).toBeNull()
    await depo.ayarYaz('ilkAcilis', '2026-08-29')
    await depo.ayarYaz('ilkAcilis', '2026-08-30')
    expect(await depo.ayarOku('ilkAcilis')).toBe('2026-08-30')
  })
})

describe('iç içe işlem', () => {
  it('dış işlem içinde kayıt eklemek çalışır (tohum bu yolu kullanıyor)', async () => {
    await depo.islem(async () => {
      await depo.kayitEkle({ tarih: '2026-08-29', saat: '09:00', metin: 'bir' })
      await depo.kayitEkle({ tarih: '2026-08-29', saat: '10:00', metin: 'iki' })
    })
    expect(await depo.kayitSayisi()).toBe(2)
  })

  it('dış işlem hata alırsa içteki yazmalar da geri alınır', async () => {
    await expect(
      depo.islem(async () => {
        await depo.kayitEkle({ tarih: '2026-08-29', saat: '09:00', metin: 'geri alınacak' })
        throw new Error('bilerek')
      }),
    ).rejects.toThrow('bilerek')
    expect(await depo.kayitSayisi()).toBe(0)
  })
})

describe('sıfırlama — geliştirme aracı', () => {
  it('defteri boşaltır ve şemayı yeniden kurar', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-08-29', saat: '10:00', metin: 'silinecek' })
    await depo.baslikYaz(k.id, 'başlık')
    await depo.kenarEkle(k.id, 'kenar', '29 ağustos 2026')
    await depo.defterAdiYaz(depo.aktifDefterId, 'Yeni ad')
    await depo.ayarYaz('bir', 'iki')
    await depo.kapsulEkle('2026-08-29', '2026-12-01', 'mektup')

    await defteriSifirla(db)

    expect(await depo.kayitSayisi()).toBe(0)
    expect((await depo.basliklar()).size).toBe(0)
    expect((await depo.kenarlar()).size).toBe(0)
    expect(await depo.ayarOku('bir')).toBeNull()
    expect(await depo.kapsuller()).toEqual([])
  })

  it('sıfırlamadan sonra şema çalışır durumda — arama dahil', async () => {
    await depo.kayitEkle({ tarih: '2026-01-01', saat: '09:00', metin: 'eski' })
    await defteriSifirla(db)
    await depo.kayitEkle({ tarih: '2026-08-29', saat: '09:00', metin: 'sıfırlamadan sonra yazıldı' })
    expect(await depo.kayitSayisi()).toBe(1)
    expect(await depo.ara('sıfırlamadan')).toHaveLength(1)
    expect(await depo.ara('eski')).toHaveLength(0)
    expect((await db.tek<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(
      SON_SURUM,
    )
  })
})

describe('kayda eşlik eden soru (K-020)', () => {
  it('soru kayıtla saklanır ve geri okunur', async () => {
    const k = await depo.kayitEkle({
      tarih: '2026-08-29',
      saat: '10:00',
      metin: 'Çünkü bir yere yazmam gerekiyordu.',
      soru: 'Bu defteri neden açtın?',
    })
    expect((await depo.kayitGetir(k.id))?.soru).toBe('Bu defteri neden açtın?')
  })

  it('sorusuz kayıtta null kalır', async () => {
    const k = await depo.kayitEkle({ tarih: '2026-08-29', saat: '11:00', metin: 'düz kayıt' })
    expect((await depo.kayitGetir(k.id))?.soru).toBeNull()
  })

  it('SORU ARAMAYA GİRMEZ — arşiv yalnızca kullanıcının yazdığını görür', async () => {
    await depo.kayitEkle({
      tarih: '2026-08-29',
      saat: '12:00',
      metin: 'Bugün yürüyüşe çıktım.',
      soru: 'Bugün kimseye söylemediğin ne oldu?',
    })
    /* Sorunun içindeki sözcükler aramada eşleşmemeli. */
    expect(await depo.ara('söylemediğin')).toHaveLength(0)
    expect(await depo.ara('kimseye')).toHaveLength(0)
    expect(await depo.ara('yürüyüşe')).toHaveLength(1)
  })
})
