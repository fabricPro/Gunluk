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

export class SenkronDepo implements Sunucu {
  private jeton: Jeton | null = null

  constructor(
    private readonly ayar: SunucuAyar,
    private readonly kimlik: SenkronKimlik,
  ) {}

  /* ── kimlik ──────────────────────────────────────────────── */

  /**
   * Oturum açar; hesap yoksa açıp tekrar dener.
   *
   * Kullanıcıya "kayıt ol" diye bir şey sorulmuyor: Defter Kimliği
   * girildiği an hesap ya vardır ya yaratılır. Sentetik e-posta
   * (`<opak>@defter.invalid`) hiçbir yere ulaşmıyor ve doğrulama
   * istenmiyor — Neon tarafında `require_email_verification` kapalı.
   */
  private async oturumAc(): Promise<void> {
    const govde = JSON.stringify({
      email: this.kimlik.eposta,
      password: this.kimlik.parola,
    })
    let y = await this.authIstek('/sign-in/email', govde)
    if (y.status === 401 || y.status === 403 || y.status === 404) {
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

  /** Geçerli JWT; yoksa ya da bitmek üzereyse yenisini alır. */
  private async jwt(): Promise<string> {
    if (this.jeton && this.jeton.biter - PAY_MS > Date.now()) return this.jeton.jwt

    const jeton = () =>
      this.iste(() => fetch(this.ayar.auth + '/token', { credentials: 'include' }))
    let y = await jeton()
    if (!y.ok) {
      await this.oturumAc()
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
  private async hataMetni(y: Response): Promise<string> {
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
  private async iste(f: () => Promise<Response>): Promise<Response> {
    try {
      return await f()
    } catch (e) {
      console.warn('[defter] senkron ağ', e)
      throw new SenkronHatasi(S('ag.baglanilamadi'))
    }
  }

  /* ── veri ────────────────────────────────────────────────── */

  private async apiIstek(yol: string, secenek: RequestInit = {}): Promise<Response> {
    const jwt = await this.jwt()
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

  /**
   * Su seviyesinden yeni satırları çeker.
   *
   * `surum`u sunucu atıyor ve kesin artan — bu yüzden `> sonGorulen`
   * hiçbir satırı atlamıyor ve iki kez getirmiyor.
   */
  async cek(sonGorulen: number, sinir = 200): Promise<{ zarf: Zarf; surum: number }[]> {
    const y = await this.apiIstek(
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
    const y = await this.apiIstek('/defter_blob?on_conflict=kullanici,satir', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(zarflar),
    })
    if (!y.ok) throw new SenkronHatasi(await this.hataMetni(y))
  }

  /** Kaç satır ve kaç bayt tutuluyor — ayar kağıdı bunu gösteriyor. */
  async kullanim(): Promise<{ satir: number; bayt: number }> {
    const y = await this.apiIstek('/defter_blob?select=govde', {
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
    const y = await this.apiIstek('/defter_blob?satir=neq.', {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    })
    if (!y.ok) throw new SenkronHatasi(await this.hataMetni(y))
  }
}
