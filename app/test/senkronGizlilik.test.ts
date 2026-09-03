import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * AĞ SINIRININ MUHAFIZI.
 *
 * Keşifte çıkan bulgu şuydu: mevcut testlerin **hiçbiri** "src/ altına
 * yeni bir dış adres girmesin" demiyordu. `gomuGizlilik.test.ts` yalnızca
 * `gomu-isci.ts`'i, `anlatim.test.ts` yalnızca `anlatim.ts` + `yak.ts`'i
 * tarıyordu. Yeni bir `veri/sunucu.ts` mevcut takımı **kırmadan**
 * eklenebilirdi.
 *
 * Senkron eklenirken o sınırın gevşemesi değil, sıkılaşması gerekiyordu.
 * Bu dosya listeyi tamamlıyor (KARARLAR.md · K-036).
 */

const kok = new URL('../src/', import.meta.url).pathname
const sunucuKok = new URL('../api/', import.meta.url).pathname

const dosyalar = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? dosyalar(join(d, e.name))
      : /*
         * `.js` de taranıyor.
         *
         * Tarama yalnızca `.ts`ye bakarken `src/sw.js` görünmez oldu — ve
         * o dosya, ekleyebileceğimiz EN AĞ DOKUNAKLI kod: her isteği
         * görüyor ve önbelleğe alabiliyor. "Ağa çıkan dosyaların tam
         * listesi" iddiası, bakmadığı bir uzantı varken doğru olamaz
         * (KARARLAR.md · K-049).
         */
        e.name.endsWith('.ts') || e.name.endsWith('.js')
        ? [join(d, e.name)]
        : [],
  )

/** Yorumları at — tarama koda baksın, kodu anlatan cümlelere değil. */
const yorumsuz = (k: string): string =>
  k.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')

const goreli = (f: string): string => f.slice(kok.length)

/**
 * Ağa çıkabilen dosyaların TAM listesi.
 *
 * Dördüncüsü eklenirse bu test düşer ve düşmesi gerekir: "metnim nereye
 * gidiyor" sorusunun cevabı üç dosyayı geçmemeli.
 */
const AGA_CIKANLAR = [
  'veri/model.ts', // kullanıcının kendi anahtarıyla Anthropic (K-031)
  'veri/gomu-isci.ts', // model indirmesi — yalnızca indirir (K-029)
  'veri/senkronDepo.ts', // uçtan uca şifreli senkron (K-036)
  'sw.js', // servis işçisi: YENİ adres açmıyor, var olanı geçiriyor (K-049)
]

describe('ağa çıkabilen dosyalar sabit', () => {
  const agIzleri = /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|https?:\/\//

  it('listede olmayan hiçbir dosya ağa dokunmuyor', () => {
    const kacaklar: string[] = []
    for (const f of dosyalar(kok)) {
      const ad = goreli(f)
      if (AGA_CIKANLAR.includes(ad)) continue
      const kod = yorumsuz(readFileSync(f, 'utf8'))
      if (agIzleri.test(kod)) kacaklar.push(ad)
    }
    expect(kacaklar, `ağa çıkan yeni dosya: ${kacaklar.join(', ')}`).toEqual([])
  })

  it('listedeki dosyalar gerçekten var', () => {
    const hepsi = dosyalar(kok).map(goreli)
    for (const a of AGA_CIKANLAR) expect(hepsi).toContain(a)
  })
})

/**
 * Sunucu tarafı da sabit.
 *
 * `api/` Vercel'de çalışan tek kod. `src/` taraması onu göremiyor —
 * tam olarak bu yüzden ayrıca sabitleniyor: buraya sessizce ikinci bir
 * dosya girmesin (KARARLAR.md · K-037).
 */
const SUNUCUDA_CALISANLAR = ['vekil.ts']

describe('sunucuda çalışan dosyalar sabit', () => {
  it('vekilden başka sunucu kodu yok', () => {
    const hepsi = dosyalar(sunucuKok).map((f) => f.slice(sunucuKok.length))
    expect(hepsi.sort()).toEqual([...SUNUCUDA_CALISANLAR].sort())
  })

  it('vekil defteri okuyamıyor — anahtara dokunan hiçbir şey yok', () => {
    const kod = yorumsuz(readFileSync(join(sunucuKok, SUNUCUDA_CALISANLAR[0]!), 'utf8'))
    /*
     * Vekilden şifreli zarflar geçiyor; anahtar cihazdan hiç çıkmıyor.
     * Bu satırlar o sözü makine düzeyinde tutuyor.
     */
    for (const yasak of ['crypto.subtle', 'kimlikTuret', 'zarfiAc', 'sifre', 'console.'])
      expect(kod, `vekil içinde ${yasak}`).not.toContain(yasak)
  })
})

describe('senkron çekirdeği saf', () => {
  for (const ad of ['cekirdek/senkronKimlik.ts', 'cekirdek/senkronBicim.ts', 'cekirdek/gizle.ts'])
    describe(ad, () => {
      const ham = readFileSync(join(kok, ad), 'utf8')
      const kod = yorumsuz(ham)

      it('yalnızca kendi katmanından import ediyor', () => {
        const importlar = [...ham.matchAll(/^import[^']*'([^']+)'/gm)].map((m) => m[1]!)
        for (const i of importlar)
          expect(i.startsWith('./') || i === 'hash-wasm', `${ad} → ${i}`).toBe(true)
      })

      it('ağa ve kalıcı depolamaya dokunmuyor', () => {
        for (const yasak of [
          'fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon',
          'localStorage', 'sessionStorage', 'indexedDB',
          'http://', 'https://',
        ])
          expect(kod, `${ad} içinde ${yasak}`).not.toContain(yasak)
      })
    })
})

describe('şifreleme anahtarı ağ katmanına geçmiyor', () => {
  const depo = yorumsuz(readFileSync(join(kok, 'veri/senkronDepo.ts'), 'utf8'))

  it('ağ dosyası şifreleme anahtarına hiç dokunmuyor', () => {
    /*
     * `SenkronKimlik.sifre` AES anahtarı. Ağ katmanının onu okuması için
     * hiçbir sebep yok — şifreleme `cekirdek/senkronBicim.ts`te bitiyor
     * ve buraya hazır `Zarf` geliyor.
     */
    expect(depo).not.toMatch(/\.sifre\b/)
    expect(depo).not.toMatch(/\bsatir\s*[:.]\s*kimlik/)
  })

  it('ağ dosyası şifreleme ya da çözme yapmıyor', () => {
    for (const yasak of ['crypto.subtle', 'kapat(', 'zarfla(', 'zarfiAc('])
      expect(depo).not.toContain(yasak)
  })

  it('kimlikten yalnızca e-posta ve parola okunuyor', () => {
    const okunanlar = [...depo.matchAll(/this\.kimlik\.(\w+)/g)].map((m) => m[1]!)
    expect([...new Set(okunanlar)].sort()).toEqual(['eposta', 'parola'])
  })
})

describe('yakılan sayfa senkrona bulaşmıyor — ilke 2.2', () => {
  const yak = readFileSync(join(kok, 'ekran/yak.ts'), 'utf8')

  it('yak.ts senkron sözcüğünü hiç içermiyor', () => {
    expect(yak.toLowerCase()).not.toContain('senkron')
  })

  it('yak.ts import listesi hâlâ tek kalemlik', () => {
    /* `test/yakma.test.ts` bunu zaten sabitliyor; burada da duruyor
       çünkü senkron eklerken gevşetilmesi en muhtemel muhafız buydu. */
    const importlar = [...yak.matchAll(/^import[^']*'([^']+)'/gm)].map((m) => m[1]!)
    expect(importlar).toEqual(['./ortak.js'])
  })
})

describe('senkronlanmayanlar', () => {
  it('gömü vektörleri ve cihaz ayarları listede değil', async () => {
    const { VARLIKLAR } = await import('../src/cekirdek/senkronBicim.js')
    expect(VARLIKLAR).not.toContain('gomu')
    expect(VARLIKLAR).not.toContain('ayar')
    expect(VARLIKLAR).not.toContain('kayit_fts')
  })

  it('senkron muhasebesi mühürlü yedeğe girmiyor', () => {
    const dokum = readFileSync(join(kok, 'veri/dokum.ts'), 'utf8')
    /* "Bu cihaz neyi göndermedi" bilgisi yedeğin içeriği değil. */
    expect(dokum).toMatch(/senkron_/)
  })
})

/**
 * SERVİS İŞÇİSİ — ağa çıkabilen dördüncü dosya, ve en tehlikelisi.
 *
 * Diğer üçü belirli bir adrese gidiyor; bu, sayfanın YAPTIĞI HER İSTEĞİ
 * görüyor ve istediğini diske yazabiliyor. Bir günlükte bunun sınırı
 * yorumda kalamaz — burada sabitleniyor (KARARLAR.md · K-049).
 */
describe('servis işçisi neyi önbelleğe ALMIYOR', () => {
  const isci = readFileSync(join(kok, 'sw.js'), 'utf8')

  it('hesap ve senkron yolları işçiye hiç uğramıyor', () => {
    /*
     * `/auth` ve `/rest` şifreli defterin ve oturumun geçtiği yer. Bir
     * yanıtın önbelleğe düşmesi, defterin diske ikinci bir kopyasının
     * çıkması demek olurdu (PROJE.md · 2.3).
     */
    expect(isci).toContain("const GECILEN = ['/auth', '/rest', '/api']")
    /* Liste yalnızca durmuyor, KULLANILIYOR: erken dönüş var. */
    expect(yorumsuz(isci)).toMatch(/GECILEN\.some\([\s\S]{0,120}?\)\)\s*return/)
  })

  it('başka kaynaklara ait hiçbir şey önbelleğe alınmıyor', () => {
    /* Gömü modeli CDN'den iniyor ve ~145 MB (K-029). */
    expect(yorumsuz(isci)).toMatch(/adres\.origin !== self\.location\.origin\)?\s*return/)
  })

  it('yalnızca 200 ve kendi kaynağımızdan olan yanıt saklanıyor', () => {
    /* 206 `ok` sayılıyor; saklansaydı dosya yarım kalır ve sessizce
       bozulurdu. */
    expect(yorumsuz(isci)).toContain("istek.headers.has('range')")
    expect(yorumsuz(isci)).toContain("yanit.status === 200 && yanit.type === 'basic'")
  })

  it('kabuk ÖNCE AĞDAN alınıyor — eski sürüme çakılmak yok', () => {
    /*
     * Önce önbellek olsaydı yayınlanan bir düzeltme kullanıcıya
     * ulaşmazdı. K-048'de tam olarak bunun bedeli ödendi.
     */
    const govde = yorumsuz(isci)
    const gezinme = govde.slice(govde.indexOf("istek.mode === 'navigate'"))
    const agIndeksi = gezinme.indexOf('await fetch(istek)')
    /* Kapanış parantezi aranmıyor: `caches.match('/', BAK)` da geçerli
       ve dize eşleşmesi yüzünden düşen bir test kusuru gösterir, arıza
       değil. */
    const onbellekIndeksi = gezinme.indexOf("caches.match('/'")
    expect(agIndeksi).toBeGreaterThan(-1)
    expect(onbellekIndeksi).toBeGreaterThan(agIndeksi)
  })
})
