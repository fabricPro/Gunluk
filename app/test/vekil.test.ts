import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { sunucuAyari } from '../src/veri/senkronDepo.js'

/**
 * VEKİLİN MUHAFIZI.
 *
 * Tarayıcıda senkron kendi kaynağımızdaki `/auth` ve `/rest`e konuşuyor;
 * o iki yol Neon'a `app/vercel.json` (üretim) ve `app/vite.config.ts`
 * (geliştirme) üzerinden taşınıyor. Üç yer de aynı öneki bilmek zorunda:
 * biri değişip diğerleri kalırsa senkron sessizce ölür — kullanıcı
 * "Sunucu şu an cevap vermiyor" görür ve sebebi hiçbir yerde yazmaz.
 *
 * Bu dosya o üç yeri birbirine bağlıyor (KARARLAR.md · K-037).
 */

const oku = (ad: string): string => readFileSync(new URL(`../${ad}`, import.meta.url), 'utf8')

const vercel = JSON.parse(oku('vercel.json')) as {
  ignoreCommand?: string
  buildCommand: string
  rewrites: { source: string; destination: string }[]
}

const fonksiyon = oku('api/vekil.ts')

const ortam = Object.fromEntries(
  oku('.env')
    .split('\n')
    .filter((s) => s.includes('=') && !s.trimStart().startsWith('#'))
    .map((s) => {
      const i = s.indexOf('=')
      return [s.slice(0, i).trim(), s.slice(i + 1).trim()]
    }),
) as Record<string, string>

describe('tarayıcıda senkron kendi kaynağımıza konuşuyor', () => {
  it('cihaz dışı ortamda göreli adres veriyor', () => {
    /* Test ortamı yerel (Capacitor native değil) — tarayıcı yolu. */
    expect(sunucuAyari()).toEqual({ auth: '/auth', api: '/rest' })
  })

  it('göreli adres çapraz site DEĞİL — mutlak adres sızmıyor', () => {
    for (const v of Object.values(sunucuAyari())) expect(v.startsWith('/')).toBe(true)
  })
})

describe('vercel.json kodun istediği yolları taşıyor', () => {
  const kaynaklar = vercel.rewrites.map((r) => r.source)

  it('her iki önek için yönlendirme var', () => {
    for (const onek of Object.values(sunucuAyari()))
      expect(
        kaynaklar.some((k) => k.startsWith(onek + '/')),
        `${onek} için yönlendirme yok: ${kaynaklar.join(', ')}`,
      ).toBe(true)
  })

  it('yönlendirmeler vekil fonksiyonuna gidiyor, doğrudan Neon\'a değil', () => {
    /*
     * Doğrudan yönlendirme DENENDİ ve olmadı: Vercel dış hedefe giderken
     * `Host` başlığını olduğu gibi taşıyor, Neon da projeyi Host'tan
     * bulduğu için `INVALID_HOSTNAME` dönüyor. Bu satır o dersi tutuyor —
     * biri "yönlendirme yeter" deyip fonksiyonu atmasın (K-037).
     */
    for (const r of vercel.rewrites) {
      expect(r.destination.startsWith('/api/vekil?'), r.destination).toBe(true)
      expect(r.destination).not.toContain('neon.tech')
    }
  })

  it('env adresleri hâlâ Neon ve hâlâ HTTPS', () => {
    for (const a of [ortam.VITE_DEFTER_AUTH!, ortam.VITE_DEFTER_API!]) {
      expect(a.startsWith('https://')).toBe(true)
      expect(a).toContain('.neon.tech')
    }
  })

  it('yayına çıkmadan testler koşuyor', () => {
    /*
     * Emekliye ayrılan `pages.yml` yayından önce `npm test` koşuyordu.
     * Vercel yalnızca derleseydi bu güvenlik ağı sessizce kaybolurdu:
     * düşen bir muhafız testiyle birlikte yayına çıkardık.
     */
    expect(vercel.buildCommand).toContain('npm test')
  })

  it('derleme hiçbir koşulda atlanmıyor', () => {
    /*
     * `ignoreCommand` çıkış kodu 0 ise derleme ATLANIYOR, 1 ise
     * sürüyor. Burada `exit 1` yazılı olmasının iki sebebi var:
     *
     * 1. Önizleme dağıtımları herkese açık olmasın diye önce
     *    `[ "$VERCEL_ENV" != production ]` konmuştu. Canlıda ÜRETİM
     *    dağıtımını da atladı — `VERCEL_ENV` o adımda boş geliyor,
     *    koşul her zaman "atla" diyor. Dağıtım sessizce CANCELED oldu
     *    ve tek satır derleme kaydı düşmedi: hata görünmüyordu bile.
     * 2. Alanı `vercel.json`dan SİLMEK yetmedi. Vercel bu ayarı proje
     *    tarafında da tutuyor; anahtar kalkınca eski değer kalıyor ve
     *    derlemeler atlanmaya devam etti. Ezmenin tek yolu açıkça
     *    yazmak.
     *
     * Önizlemeler Vercel Authentication ile korunuyor — o bir proje
     * ayarı, bu dosyada duramıyor (KARARLAR.md · K-037).
     */
    expect(vercel.ignoreCommand).toBe('exit 1')
  })
})

describe('geliştirme sunucusu üretimle aynı yolları taşıyor', () => {
  const yapilandirma = oku('vite.config.ts')

  it('vite.config aynı önekleri yönlendiriyor', () => {
    for (const onek of Object.values(sunucuAyari()))
      expect(yapilandirma, `vite.config.ts içinde ${onek} yok`).toContain(`'${onek}'`)
  })

  it('adresleri env dosyasından okuyor, kopyalamıyor', () => {
    expect(yapilandirma).toContain('loadEnv')
    expect(yapilandirma).not.toContain('https://ep-')
  })
})

describe('vekil fonksiyonu', () => {
  it('Neon adresleri .env ile aynı', () => {
    /* Fonksiyon Vite ile derlenmiyor, `.env`i okuyamıyor: adresler orada
       yazılı duruyor. İki kopya kayarsa cihaz bir sunucuya, tarayıcı
       başkasına konuşurdu — bu test kaymayı düşürüyor. */
    expect(fonksiyon).toContain(ortam.VITE_DEFTER_AUTH!)
    expect(fonksiyon).toContain(ortam.VITE_DEFTER_API!)
  })

  it('kodun istediği iki hedefi tanıyor', () => {
    for (const onek of Object.values(sunucuAyari()))
      expect(fonksiyon, `vekil ${onek} hedefini tanımıyor`).toContain(`${onek.slice(1)}:`)
  })

  it('yönlendirmedeki parça adı da elenen alanla aynı', () => {
    /*
     * Vercel, yönlendirmedeki adlandırılmış parçayı sorgu dizesine
     * YANKILIYOR. Parçaya `:yol*` deseydik Neon'a `yol=token` diye bir
     * alan giderdi ve PostgREST onu sütun süzgeci sayıp 400 dönerdi.
     * Aynı adı taşıyınca tek kuralla eleniyor.
     */
    for (const r of vercel.rewrites) expect(r.source).toContain(':vekilYol*')
  })

  it('yönlendirme fonksiyonun beklediği alanları gönderiyor', () => {
    /*
     * Dinamik yol denendi ve canlıda ÇOKLU segment yakalamadı:
     * `/api/vekil/auth` düştü, `/api/vekil/auth/token` düşmedi. Yol artık
     * sorgu dizesinde; iki taraf aynı alan adlarını bilmek zorunda.
     */
    for (const r of vercel.rewrites) {
      const alanlar = new URL('https://x' + r.destination).searchParams
      for (const ad of [...alanlar.keys()]) expect(fonksiyon, ad).toContain(`'${ad}'`)
      expect(alanlar.get('vekilYol')).toBe(':vekilYol*')
    }
  })

  it('çerezden Domain düşürülüyor — çerez bu kaynağa ait olsun', () => {
    expect(fonksiyon.toLowerCase()).toContain("'domain='")
    expect(fonksiyon).toContain('getSetCookie')
  })

  it('Vercel\'in kendi alanları Neon\'a taşınmıyor', () => {
    /* `_vercel_share` gibi alanlar sorgu dizesine ekleniyor; PostgREST
       tanımadığı alanı sütun süzgeci sayıp 400 dönüyor. */
    expect(fonksiyon).toContain('_vercel_')
  })

  it('göreli istek adresi çökertmiyor', () => {
    /* Çalışma ortamında `istek.url` göreli gelebiliyor; tabansız
       `new URL(...)` `ERR_INVALID_URL` atıyordu ve fonksiyon 500
       dönüyordu. */
    expect(fonksiyon).toMatch(/new URL\(istek\.url,/)
  })

  it('kayıt tutmuyor', () => {
    /* Ne gövde, ne başlık, ne adres. Vekilin tek savunması okunabilir
       olmasıydı; bir `console` satırı o savunmayı bitirir. */
    expect(fonksiyon).not.toMatch(/\bconsole\s*\./)
  })

  it('şifreleme ya da çözme yapmıyor', () => {
    /* Zarf cihazda kapanıyor, cihazda açılıyor. Vekil taşıyıcı. */
    for (const yasak of ['crypto.subtle', 'atob(', 'btoa(', 'TextDecoder'])
      expect(fonksiyon, `vekil içinde ${yasak}`).not.toContain(yasak)
  })

  it('yalnızca tanıdığı iki hedefe gidiyor', () => {
    /* Açık vekil olmasın: hedef listede yoksa 404. */
    expect(fonksiyon).toContain('404')
  })
})
