import { CILT_SAYFA, VARSAYILAN_OLCU, ciltleriKur, sayfalariKur } from './cekirdek/sayfa.js'
import type { SayfaOlcu } from './cekirdek/sayfa.js'
import { BASLANGIC, gununSorusu, havuzdanSor, havuzuIlerlet, ilkHaftaBitti, kayitYazildi } from './cekirdek/yonlendirme.js'
import type { YonlendirmeDurum } from './cekirdek/yonlendirme.js'
import type { TemaTanim } from './cekirdek/sorgu.js'
import type { Cilt, DefterBilgi, EkBilgi, Gun, KenarNotu, Sayfa } from './cekirdek/tipler.js'
import type { Depo } from './veri/depo.js'

/**
 * Defterin bellekteki görünümü. Ekranlar buradan senkron okur; yazma
 * işlemleri depoya gider ve ardından `yenile()` çağrılır.
 *
 * Sayfa akışı zaten bütün kayıtları gerektiriyor, o yüzden tam model
 * bellekte tutuluyor. On yıllık defter için bile bu birkaç megabayt.
 */
export class Durum {
  gunler: Gun[] = []
  sayfalar: Sayfa[] = []
  ciltler: Cilt[] = []
  basliklar = new Map<string, string>()
  kenarlar = new Map<string, KenarNotu>()
  /**
   * Eklerin yalnızca ÜSTVERİSİ. Gövde (base64) burada durmuyor: ekran
   * görünen sayfanınkini `depo.ekVeri` ile tek tek istiyor. Yoksa
   * "on yıllık defter birkaç megabayt" varsayımı fotoğrafla çökerdi.
   */
  ekler = new Map<string, EkBilgi>()
  temalar: TemaTanim[] = []
  /** Açık defter — kitaplıktan seçilen. */
  aktifDefter: DefterBilgi | null = null
  aktifSayfa = 0
  aramaTerim = ''
  /** Tarayıcı derlemesinde false — veritabanı şifresiz. */
  sifreli = false
  /** Ölçülmüş sayfa kapasitesi; ekran katmanı doldurur. */
  olcu: SayfaOlcu = VARSAYILAN_OLCU
  /** İlk hafta yönlendirmesinin durumu. */
  yonlendirme: YonlendirmeDurum = BASLANGIC
  /** Şu an ekranda duran soru — yazılınca kayda iliştirilir. */
  aktifSoru: string | null = null

  private dinleyiciler: (() => void)[] = []

  constructor(private readonly depo: Depo) {}

  dinle(f: () => void): void {
    this.dinleyiciler.push(f)
  }

  get kayitSayisi(): number {
    return this.gunler.reduce((n, g) => n + g.kayitlar.length, 0)
  }

  get bos(): boolean {
    return this.sayfalar.length === 0
  }

  /** Defterin kendi sayfa sınırı; defter yoksa demo değeri. */
  get sayfaSiniri(): number {
    return this.aktifDefter?.sayfaSiniri ?? CILT_SAYFA
  }

  /** Sayfa sınırına gelindi mi — gelindiyse yazma durur, tören açılır. */
  get dolu(): boolean {
    return this.sayfalar.length >= this.sayfaSiniri
  }

  /** Kapanmış deftere yeni kayıt yazılamaz, eski kayıt düzeltilemez. */
  get kapali(): boolean {
    return this.aktifDefter?.kapandi ?? false
  }

  /** Yazmaya izin var mı. */
  get yazilabilir(): boolean {
    return !this.kapali && !this.dolu
  }

  get sonSayfa(): number {
    return Math.max(0, this.sayfalar.length - 1)
  }

  /** Depodan okur, sayfaları yeniden akıtır, dinleyicileri uyarır. */
  /** Kitaplıktan bir defter seçip açar. */
  async defteriAc(id: string): Promise<void> {
    this.depo.defteriSec(id)
    await this.depo.ayarYaz('aktifDefter', id)
    this.aktifSayfa = 0
    await this.yenile()
    this.aktifSayfa = this.sonSayfa
  }

  async yenile(): Promise<void> {
    this.gunler = await this.depo.gunler()
    this.kenarlar = await this.depo.kenarlar()
    this.ekler = await this.depo.ekler()
    this.basliklar = await this.depo.basliklar()
    this.temalar = await this.depo.temalar()
    this.yonlendirme = {
      gun: Number((await this.depo.ayarOku('yonlendirme.gun')) ?? 0),
      sonTarih: (await this.depo.ayarOku('yonlendirme.sonTarih')) ?? null,
      havuzIndeks: Number((await this.depo.ayarOku('yonlendirme.havuz')) ?? 0),
    }
    this.aktifDefter = await this.depo.defterGetir(this.depo.aktifDefterId)

    const akis = sayfalariKur({
      gunler: this.gunler,
      kenarlar: this.kenarlar,
      ekler: this.ekler,
      olcu: this.olcu,
    })
    this.sayfalar = akis.sayfalar
    const ad = this.aktifDefter ? new Map([[1, this.aktifDefter.ad]]) : new Map<number, string>()
    this.ciltler = ciltleriKur(this.sayfalar, ad)
    if (this.aktifSayfa > this.sonSayfa) this.aktifSayfa = this.sonSayfa
    for (const f of this.dinleyiciler) f()
  }

  /* ── yönlendirme ──────────────────────────────────────── */

  /** Bugün gösterilecek soruyu belirler ve `aktifSoru`ya yazar. */
  soruyuTazele(bugun: string): void {
    /* Kapalı ya da dolu deftere yazılamaz; soru sormanın anlamı yok. */
    if (!this.yazilabilir) {
      this.aktifSoru = null
      return
    }
    this.aktifSoru = gununSorusu(this.yonlendirme, bugun, this.krizVar)
  }

  /** Kullanıcı "bana bir şey sor" dedi. */
  async baskaSoruIste(): Promise<void> {
    if (!this.yazilabilir) return
    this.aktifSoru = havuzdanSor(this.yonlendirme, this.krizVar)
    this.yonlendirme = havuzuIlerlet(this.yonlendirme)
    await this.depo.ayarYaz('yonlendirme.havuz', String(this.yonlendirme.havuzIndeks))
  }

  /** Kayıt yazıldıktan sonra yönlendirmeyi ilerletir. */
  async yonlendirmeyiIlerlet(tarih: string): Promise<void> {
    this.yonlendirme = kayitYazildi(this.yonlendirme, tarih)
    await this.depo.ayarYaz('yonlendirme.gun', String(this.yonlendirme.gun))
    await this.depo.ayarYaz('yonlendirme.sonTarih', tarih)
    this.aktifSoru = null
  }

  /**
   * "Bana bir şey sor" düğmesi görünsün mü.
   *
   * Soru duruyorken de görünür: gelen soru tutmadıysa kullanıcı başkasını
   * isteyebilmeli, yoksa tek bir soruya mahkûm oluyor.
   */
  get soruIstenebilir(): boolean {
    return this.yazilabilir && ilkHaftaBitti(this.yonlendirme)
  }

  /**
   * Kriz işareti — ilke 2.1. Sınıflandırıcı Faz 3.11'de gelecek; kanca
   * şimdiden burada ki geldiğinde soru sorma yolları tek yerden sussun.
   */
  krizVar = false

  kayitBul(id: string): { gun: Gun; kayit: Gun['kayitlar'][number] } | null {
    for (const gun of this.gunler)
      for (const kayit of gun.kayitlar) if (kayit.id === id) return { gun, kayit }
    return null
  }

  baslik(sayfa: Sayfa): string | null {
    return sayfa.anahtar ? (this.basliklar.get(sayfa.anahtar) ?? null) : null
  }

  /** Metinden bilinen temaları yakalar. */
  temalariCikar(metin: string): string[] {
    const k = metin.toLocaleLowerCase('tr')
    return this.temalar.filter((t) => t.anahtar.some((a) => k.includes(a))).map((t) => t.id)
  }
}
