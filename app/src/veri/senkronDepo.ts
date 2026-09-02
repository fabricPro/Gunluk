import { Capacitor } from '@capacitor/core'
import { S } from '../cekirdek/metin.js'
import type { SenkronKimlik } from '../cekirdek/senkronKimlik.js'
import type { Zarf } from '../cekirdek/senkronBicim.js'

/**
 * SENKRONUN AĞ KATMANI — cihazdan çıkan tek yeni istek.
 *
 * Uygulamada ağa çıkabilen dosyalar üç tane: `veri/model.ts` (kullanıcının
 * kendi anahtarıyla Anthropic), `veri/gomu-isci.ts` (model indirmesi) ve
 * bu dosya. `test/senkronGizlilik.test.ts` bu listeyi sabitliyor —
 * dördüncüsü eklenirse test düşer (KARARLAR.md · K-036).
 *
 * **SDK yok, düz `fetch` var.** `@neondatabase/neon-js` cazipti ama iki
 * sebeple alınmadı: (1) Data API düz PostgREST, Better Auth düz REST —
 * ikisi de birkaç satır; (2) ağ yüzeyi ne kadar küçük ve okunur olursa
 * "metnim nereye gidiyor" sorusu o kadar kolay cevaplanıyor. Bu dosyayı
 * baştan sona okumak beş dakika sürüyor.
 *
 * **Buradan geçen gövde her zaman şifreli.** Bu dosya `SenkronKimlik`in
 * `sifre` alanına hiç dokunmuyor: şifreleme `cekirdek/senkronBicim.ts`te
 * bitiyor, buraya yalnızca hazır `Zarf` geliyor.
 */

export interface SunucuAyar {
  /** Managed Better Auth taban adresi. */
  auth: string
  /** Data API (PostgREST) taban adresi. */
  api: string
}

/**
 * Hangi adrese konuşulacağı — ve neden iki tane olduğu.
 *
 * **Cihazda doğrudan Neon.** Capacitor sayfayı `https://localhost`ten
 * servis ediyor, çerez oradan yazılıyor, araya kimse girmiyor.
 *
 * **Tarayıcıda kendi kaynağımız üzerinden.** Sayfa Vercel'de, auth
 * `*.neon.tech`te olsaydı oturum çerezi ÇAPRAZ SİTE olurdu; Safari'nin
 * izleme koruması bunu doğrudan düşürüyor, Chrome da üçüncü taraf
 * çerezlerini kapatıyor. `/auth` ve `/rest`, `app/vercel.json`taki
 * yönlendirmelerle (ve `vite.config.ts`teki aynı yönlendirmelerle,
 * geliştirmede) Neon'a taşınıyor; tarayıcı bakımından her şey aynı
 * kaynakta, çerez birinci taraf (KARARLAR.md · K-037).
 *
 * Vekilden GEÇEN: türetilmiş parola ve JWT.
 * Vekilden GEÇMEYEN: şifreleme anahtarı ve düz metin. Şifreleme
 * `cekirdek/senkronBicim.ts`te bitiyor; buraya hazır `Zarf` geliyor ve
 * `test/senkronGizlilik.test.ts` bunu sabitliyor.
 */
export function sunucuAyari(): SunucuAyar {
  if (Capacitor.isNativePlatform())
    return {
      auth: import.meta.env.VITE_DEFTER_AUTH as string,
      api: import.meta.env.VITE_DEFTER_API as string,
    }
  return { auth: '/auth', api: '/rest' }
}

export class SenkronHatasi extends Error {}

/**
 * Senkron akışının sunucudan beklediği her şey.
 *
 * Ayrı bir arayüz olmasının sebebi test: `test/senkronAkis.test.ts`
 * bunun bellekte duran bir taklidini koyup iki cihazlı tam turu ağ
 * olmadan koşturuyor. Akış katmanı somut sınıfı değil bunu görüyor.
 */
export interface Sunucu {
  cek(sonGorulen: number, sinir?: number): Promise<{ zarf: Zarf; surum: number }[]>
  it(zarflar: Zarf[]): Promise<void>
  kullanim(): Promise<{ satir: number; bayt: number }>
  hepsiniSil(): Promise<void>
}

/** JWT 15 dakikada doluyor; bitmesine bu kadar kala yenileniyor. */
const PAY_MS = 60_000

interface Jeton {
  jwt: string
  biter: number
}

/** JWT'nin `exp` iddiasını okur — imza doğrulanmıyor, yalnızca süre. */
function bitisZamani(jwt: string): number {
  try {
    const govde = jwt.split('.')[1]
    if (!govde) return 0
    const json = atob(govde.replace(/-/g, '+').replace(/_/g, '/'))
    const exp = (JSON.parse(json) as { exp?: number }).exp
    return exp ? exp * 1000 : 0
  } catch {
    return 0
  }
}

/**
 * Ortak oturum makinesi.
 *
 * İki hesap türü var ve ikisi de aynı Better Auth akışını kullanıyor:
 * senkron hesabı (Defter Kimliği'nden türer) ve kasa hesabı (paroladan
 * türer). Kimlik türetmeleri ayrı, ağ akışı aynı — bu yüzden burada
 * (KARARLAR.md · K-038).
 *
 * Kimlikten yalnızca `eposta` ve `parola` okunuyor. Şifreleme anahtarına
 * bu katman hiç dokunmuyor ve `test/senkronGizlilik.test.ts` bunu
 * sabitliyor: gövdeler buraya HAZIR ŞİFRELİ geliyor.
 */
abstract class Oturum {
  private jeton: Jeton | null = null

  constructor(
    protected readonly ayar: SunucuAyar,
    protected readonly kimlik: { eposta: string; parola: string },
  ) {}

  /* ── kimlik ──────────────────────────────────────────────── */

  /**
   * Oturum açar.
   *
   * `yarat` true ise hesap yoksa açılıp tekrar deneniyor: Defter Kimliği
   * girildiği an hesap ya vardır ya yaratılır, kullanıcıya "kayıt ol"
   * diye bir şey sorulmuyor. Sentetik e-posta (`<opak>@defter.invalid`)
   * hiçbir yere ulaşmıyor ve doğrulama istenmiyor — Neon tarafında
   * `require_email_verification` kapalı.
   *
   * `yarat` FALSE ise hesap yokken yaratılmıyor, `false` dönüyor. Kasayı
   * okurken bu şart: yanlış parola girildiğinde sessizce boş bir kasa
   * hesabı açmak, kullanıcıya "kurtarma başarılı" deyip boş defter
   * vermek olurdu.
   */
  protected async oturumAc(yarat: boolean): Promise<boolean> {
    const govde = JSON.stringify({
      email: this.kimlik.eposta,
      password: this.kimlik.parola,
    })
    let y = await this.authIstek('/sign-in/email', govde)
    if (y.status === 401 || y.status === 403 || y.status === 404) {
      if (!yarat) return false
      const kayit = await this.authIstek(
        '/sign-up/email',
        JSON.stringify({
          email: this.kimlik.eposta,
          password: this.kimlik.parola,
          name: 'defter',
        }),
      )
      if (!kayit.ok) throw new SenkronHatasi(await this.hataMetni(kayit))
      y = await this.authIstek('/sign-in/email', govde)
    }
    if (!y.ok) throw new SenkronHatasi(await this.hataMetni(y))
    return true
  }

  private authIstek(yol: string, govde: string): Promise<Response> {
    return this.iste(() =>
      fetch(this.ayar.auth + yol, {
        method: 'POST',
        /* Oturum çerezi için: auth başka bir kaynakta duruyor. */
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: govde,
      }),
    )
  }

  /**
   * Geçerli JWT; yoksa ya da bitmek üzereyse yenisini alır.
   *
   * `yarat` false iken hesap yoksa `null` dönüyor — hata değil, "böyle
   * bir hesap yok" demek.
   */
  protected async jwt(yarat: boolean): Promise<string | null> {
    if (this.jeton && this.jeton.biter - PAY_MS > Date.now()) return this.jeton.jwt

    const jeton = () =>
      this.iste(() => fetch(this.ayar.auth + '/token', { credentials: 'include' }))
    let y = await jeton()
    if (!y.ok) {
      if (!(await this.oturumAc(yarat))) return null
      y = await jeton()
      if (!y.ok) throw new SenkronHatasi(await this.hataMetni(y))
    }
    const { token } = (await y.json()) as { token?: string }
    /*
     * Çerez engellenmişse (ITP, üçüncü taraf çerez kısıtı) burası boş
     * döner. Sessiz geçilmiyor: kullanıcı "senkron çalışmıyor" değil,
     * NEDEN çalışmadığını görmeli.
     */
    if (!token) throw new SenkronHatasi(S('ag.senkronOturum'))
    this.jeton = { jwt: token, biter: bitisZamani(token) }
    return token
  }

  /**
   * Kullanıcının göreceği cümle. Kütüphane ya da sunucu metni ham hâlde
   * arayüze düşmüyor: uygulama Türkçe-öncelikli ve hata da çevrilmek
   * zorunda (KARARLAR.md · K-035).
   */
  protected async hataMetni(y: Response): Promise<string> {
    if (y.status === 401 || y.status === 403) return S('ag.senkronKimlik')
    if (y.status >= 500) return S('ag.senkronSunucu')
    const ham = await y.text().catch(() => '')
    console.warn('[defter] senkron', y.status, ham.slice(0, 300))
    return S('ag.senkronSunucu')
  }

  /**
   * `fetch` ağ seviyesinde patlarsa (DNS, çevrimdışı, CORS) tarayıcı
   * "Failed to fetch" atıyor — kullanıcıya İngilizce sızmasın.
   */
  protected async iste(f: () => Promise<Response>): Promise<Response> {
    try {
      return await f()
    } catch (e) {
      console.warn('[defter] senkron ağ', e)
      throw new SenkronHatasi(S('ag.baglanilamadi'))
    }
  }

  /* ── veri ────────────────────────────────────────────────── */

  protected async apiIstek(
    yol: string,
    secenek: RequestInit = {},
    yarat = true,
  ): Promise<Response | null> {
    const jwt = await this.jwt(yarat)
    if (!jwt) return null
    return this.iste(() =>
      fetch(this.ayar.api + yol, {
        ...secenek,
        headers: {
          ...secenek.headers,
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
      }),
    )
  }
}

/**
 * Senkronun ağ katmanı.
 *
 * Hesabı yoksa açıyor: Defter Kimliği girildiği an hesap ya vardır ya
 * yaratılır.
 */
export class SenkronDepo extends Oturum implements Sunucu {
  constructor(ayar: SunucuAyar, kimlik: SenkronKimlik) {
    super(ayar, kimlik)
  }

  /** Senkron her zaman hesabı yaratabilir; `null` dönmüyor. */
  private async istek(yol: string, secenek: RequestInit = {}): Promise<Response> {
    return (await this.apiIstek(yol, secenek))!
  }

  /**
   * Su seviyesinden yeni satırları çeker.
   *
   * `surum`u sunucu atıyor ve kesin artan — bu yüzden `> sonGorulen`
   * hiçbir satırı atlamıyor ve iki kez getirmiyor.
   */
  async cek(sonGorulen: number, sinir = 200): Promise<{ zarf: Zarf; surum: number }[]> {
    const y = await this.istek(
      `/defter_blob?surum=gt.${sonGorulen}&order=surum.asc&limit=${sinir}` +
        `&select=satir,surum,iv,govde`,
    )
    if (!y.ok) throw new SenkronHatasi(await this.hataMetni(y))
    const satirlar = (await y.json()) as {
      satir: string
      surum: number
      iv: string
      govde: string
    }[]
    return satirlar.map((s) => ({
      surum: Number(s.surum),
      zarf: { satir: s.satir, iv: s.iv, govde: s.govde },
    }))
  }

  /**
   * Zarfları yazar (upsert).
   *
   * `kullanici` ve `surum` gönderilmiyor: ikisini de sunucudaki trigger
   * atıyor. İstemci başkasının kimliğini yazamıyor.
   */
  async it(zarflar: Zarf[]): Promise<void> {
    if (!zarflar.length) return
    const y = await this.istek('/defter_blob?on_conflict=kullanici,satir', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(zarflar),
    })
    if (!y.ok) throw new SenkronHatasi(await this.hataMetni(y))
  }

  /** Kaç satır ve kaç bayt tutuluyor — ayar kağıdı bunu gösteriyor. */
  async kullanim(): Promise<{ satir: number; bayt: number }> {
    const y = await this.istek('/defter_blob?select=govde', {
      headers: { Prefer: 'count=exact' },
    })
    if (!y.ok) throw new SenkronHatasi(await this.hataMetni(y))
    const satirlar = (await y.json()) as { govde: string }[]
    return {
      satir: satirlar.length,
      bayt: satirlar.reduce((t, s) => t + s.govde.length, 0),
    }
  }

  /**
   * Hesabın sunucudaki bütün satırlarını siler.
   *
   * Senkron kapatılırken çağrılıyor. "Bizden talep etmenize gerek yok"
   * sözünün karşılığı: silme uygulamanın içinde, tek dokunuşta.
   */
  async hepsiniSil(): Promise<void> {
    const y = await this.istek('/defter_blob?satir=neq.', {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    })
    if (!y.ok) throw new SenkronHatasi(await this.hataMetni(y))
  }
}

/** Kasada duran satır — gövde ZATEN şifreli. */
export interface KasaSatir {
  iv: string
  govde: string
}

/**
 * KASA — Defter Kimliği'nin paroladan açılan kopyası.
 *
 * Kimliği senkronunkinden ayrı ve yalnızca paroladan türüyor
 * (`cekirdek/kasaKimlik.ts`). Sebebi basit: kurtarma anında elde kod
 * YOK, onu almaya geliniyor (KARARLAR.md · K-038).
 *
 * **Şifreleme burada bitmiyor, burada başlamıyor.** Bu sınıf `iv` ve
 * `govde` dizelerini taşıyor; ikisini de çağıran taraf üretiyor ve
 * çözüyor. Senkronun zarfıyla aynı disiplin: ağ katmanı anahtarı hiç
 * görmüyor.
 */
/**
 * `Kasa.oku()`nun cevabı.
 *
 * `hesapYok` ile `satirYok` ayrımı teşhis için: ikincisi "oturum
 * açıldı ama sunucu satır vermedi" demek ve bu, satırın gerçekten
 * olmamasından da satır düzeyi güvenliğin onu süzmesinden de
 * gelebilir — ikisi de sessizce "kasa yok" sayılmamalı.
 */
export type KasaOkuma =
  | { durum: 'hesapYok' }
  | { durum: 'satirYok' }
  | { durum: 'var'; satir: KasaSatir }

export class Kasa extends Oturum {
  /**
   * Kasayı okur — ve HANGİ durumda olduğunu söyler.
   *
   * Eskiden üçü de `null` dönüyordu: hesap yok, satır yok, satır boş.
   * Üstüne bir de "satır geldi ama açılmadı" hâli çağıranda aynı yere
   * düşüyordu. Dört ayrı durum tek cevaba katlanınca canlıda çıkan bir
   * arıza teşhis edilemez oldu: sunucu 200 dönüyor, kullanıcı "böyle bir
   * defter yok" görüyor ve arada ne olduğu bilinmiyordu (K-042).
   *
   * Hesap YARATILMIYOR: yaratılsaydı yanlış parola giren kullanıcıya
   * sessizce boş bir kasa açılır ve "kurtarma başarılı" denirdi.
   */
  async oku(): Promise<KasaOkuma> {
    const y = await this.apiIstek('/defter_kasa?select=iv,govde&limit=1', {}, false)
    if (!y) return { durum: 'hesapYok' }
    if (!y.ok) throw new SenkronHatasi(await this.hataMetni(y))
    const satirlar = (await y.json()) as KasaSatir[]
    const satir = satirlar[0]
    if (!satir?.iv || !satir.govde) return { durum: 'satirYok' }
    return { durum: 'var', satir }
  }

  /** Kasayı yazar; hesap yoksa açılıyor. Tek satır, upsert. */
  async yaz(satir: KasaSatir): Promise<void> {
    const y = (await this.apiIstek('/defter_kasa?on_conflict=kullanici', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([satir]),
    }))!
    if (!y.ok) throw new SenkronHatasi(await this.hataMetni(y))
  }

  /**
   * Kasayı siler.
   *
   * Hesap yoksa sessizce geçiyor: silinecek bir şey yoktu. Parola
   * değişiminde ESKİ kasayı temizlemek için de bu kullanılıyor.
   */
  async sil(): Promise<void> {
    const y = await this.apiIstek(
      '/defter_kasa?kullanici=neq.',
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
      false,
    )
    if (y && !y.ok) throw new SenkronHatasi(await this.hataMetni(y))
  }
}
