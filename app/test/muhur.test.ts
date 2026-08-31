import { describe, expect, it } from 'vitest'
import { aesAnahtar, rastgele } from '../src/cekirdek/gizle.js'
import { muhruAc, muhurle, paketiAc, paketle } from '../src/cekirdek/muhur.js'

/**
 * YEREL MÜHÜR — tarayıcıda cihazdaki SQLCipher'ın yerini tutan şey.
 *
 * Buradaki tek söz şu: mühürlenmiş baytlarda defterin hiçbir parçası
 * okunmuyor ve yanlış anahtar açmıyor (KARARLAR.md · K-037).
 */

const anahtar = (): Promise<CryptoKey> => aesAnahtar(rastgele(32))
const metin = (s: string): Uint8Array => new TextEncoder().encode(s)
const yazi = (b: Uint8Array): string => new TextDecoder().decode(b)

/* `crypto.getRandomValues` tek çağrıda 65536 baytla sınırlı. */
const cokRastgele = (n: number): Uint8Array => {
  const b = new Uint8Array(n)
  for (let i = 0; i < n; i += 65536) b.set(rastgele(Math.min(65536, n - i)), i)
  return b
}

describe('gidiş-dönüş', () => {
  it('mühürle → aç aynı baytları veriyor', async () => {
    const a = await anahtar()
    const veri = metin('Kerem yine yazmadı.')
    expect(yazi((await muhruAc(await muhurle(veri, a), a))!)).toBe('Kerem yine yazmadı.')
  })

  it('boş yığın da gidip geliyor', async () => {
    const a = await anahtar()
    expect((await muhruAc(await muhurle(new Uint8Array(0), a), a))!.length).toBe(0)
  })

  it('büyük ve rastgele yığın bozulmuyor', async () => {
    /* Rastgele: sıkıştırma kazanmıyor, yani sıkışmayan yol da sınanıyor. */
    const a = await anahtar()
    const veri = cokRastgele(300_000)
    const geri = (await muhruAc(await muhurle(veri, a), a))!
    expect(geri.length).toBe(veri.length)
    expect(geri[0]).toBe(veri[0])
    expect(geri[veri.length - 1]).toBe(veri[veri.length - 1])
  })

  it('sıkışabilen yığın gerçekten küçülüyor', async () => {
    const a = await anahtar()
    const veri = metin('defter '.repeat(20_000))
    expect((await muhurle(veri, a)).length).toBeLessThan(veri.length / 4)
  })
})

describe('mühürlü baytlar', () => {
  it('kullanıcı metni mühürde geçmiyor', async () => {
    /*
     * İşaret bilerek uzun ve ayırt edici: kısa bir dize 300 kB şifreli
     * gövdede rastlantı eseri belirebilir ve test yılda bir düşerdi
     * (K-033'ün dersi).
     */
    const ISARET = 'KIMSEYE-SOYLEMEDIGIM-SEY-8f2c1d4b-BU-DISARI-CIKMAMALI'
    const a = await anahtar()
    const muhur = await muhurle(metin(`bir şey ${ISARET} bir şey`), a)
    /* Baytları harf harf tarıyoruz — diske giden şeyin aynısı. */
    expect(yazi(muhur)).not.toContain(ISARET)
    expect([...muhur].map((x) => String.fromCharCode(x)).join('')).not.toContain(ISARET)
  })

  it('aynı veri iki kez mühürlenince farklı çıkıyor — IV yeniden kullanılmıyor', async () => {
    const a = await anahtar()
    const veri = metin('aynı metin')
    const x = await muhurle(veri, a)
    const y = await muhurle(veri, a)
    expect(yazi(x.slice(8, 20))).not.toBe(yazi(y.slice(8, 20)))
    expect([...x].join()).not.toBe([...y].join())
  })

  it('başlıkta sihir ve sürüm var', async () => {
    const m = await muhurle(metin('x'), await anahtar())
    expect([...m.slice(0, 8)]).toEqual([0x44, 0x46, 0x54, 0x52, 0x4d, 0x48, 0x52, 0x01])
  })
})

describe('açılmayan durumlar — hepsi null, çökme değil', () => {
  it('yanlış anahtar açmıyor', async () => {
    const m = await muhurle(metin('gizli'), await anahtar())
    expect(await muhruAc(m, await anahtar())).toBeNull()
  })

  it('oynanmış gövde açılmıyor', async () => {
    const a = await anahtar()
    const m = await muhurle(metin('gizli'), a)
    m[m.length - 1] = (m[m.length - 1] ?? 0) ^ 1
    expect(await muhruAc(m, a)).toBeNull()
  })

  it('oynanmış IV açılmıyor', async () => {
    const a = await anahtar()
    const m = await muhurle(metin('gizli'), a)
    m[10] = (m[10] ?? 0) ^ 1
    expect(await muhruAc(m, a)).toBeNull()
  })

  it('sıkıştırma bayrağı ŞİFRENİN İÇİNDE — dışarıdan oynanamıyor', async () => {
    /*
     * Yedek biçiminde bu alan açıkta duruyor (`yedek.ts`). Burada
     * gövdenin ilk baytı olduğu için GCM etiketi onu da doğruluyor:
     * "sıkıştırılmamış" diye işaretleyip çöp okutmak mümkün değil.
     */
    const a = await anahtar()
    const m = await muhurle(metin('defter '.repeat(500)), a)
    /* Başlıkta bayrak yok; ilk 20 bayt yalnızca sihir + IV. */
    expect(m.length).toBeGreaterThan(20)
    for (let i = 20; i < 24; i++) {
      const bozuk = m.slice()
      bozuk[i] = (bozuk[i] ?? 0) ^ 0xff
      expect(await muhruAc(bozuk, a)).toBeNull()
    }
  })

  it('bizim biçimimiz olmayan dosya null', async () => {
    expect(await muhruAc(rastgele(200), await anahtar())).toBeNull()
  })

  it('çok kısa dosya null', async () => {
    expect(await muhruAc(new Uint8Array(5), await anahtar())).toBeNull()
  })
})

describe('paketleme biçimde yazılı — Ö2 dersi', () => {
  it('paketle ne yaptığını söylüyor', async () => {
    const { nasil } = await paketle(metin('x'.repeat(1000)))
    expect(['gzip', 'yok']).toContain(nasil)
  })

  it('söylediğine göre açılıyor', async () => {
    const veri = metin('defter '.repeat(100))
    const { govde, nasil } = await paketle(veri)
    expect(yazi(await paketiAc(govde, nasil))).toBe(yazi(veri))
  })

  it('sıkıştırılmışı düz sanmak patlıyor — tahmin edilmemeli', async () => {
    const veri = metin('defter '.repeat(100))
    const { govde, nasil } = await paketle(veri)
    if (nasil === 'gzip') expect(yazi(await paketiAc(govde, 'yok'))).not.toBe(yazi(veri))
  })
})
