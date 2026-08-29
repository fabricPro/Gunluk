import { ciltleriKur, sayfalariKur } from './cekirdek/sayfa.js'
import type { TemaTanim } from './cekirdek/sorgu.js'
import type { Cilt, Gun, KenarNotu, Sayfa } from './cekirdek/tipler.js'
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
  temalar: TemaTanim[] = []
  ciltAdlari = new Map<number, string>()
  aktifSayfa = 0
  aramaTerim = ''
  /** Tarayıcı derlemesinde false — veritabanı şifresiz. */
  sifreli = false

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

  get sonSayfa(): number {
    return Math.max(0, this.sayfalar.length - 1)
  }

  /** Depodan okur, sayfaları yeniden akıtır, dinleyicileri uyarır. */
  async yenile(): Promise<void> {
    this.gunler = await this.depo.gunler()
    this.kenarlar = await this.depo.kenarlar()
    this.basliklar = await this.depo.basliklar()
    this.ciltAdlari = await this.depo.ciltAdlari()
    this.temalar = await this.depo.temalar()

    const akis = sayfalariKur({ gunler: this.gunler, kenarlar: this.kenarlar })
    this.sayfalar = akis.sayfalar
    this.ciltler = ciltleriKur(this.sayfalar, this.ciltAdlari)
    if (this.aktifSayfa > this.sonSayfa) this.aktifSayfa = this.sonSayfa
    for (const f of this.dinleyiciler) f()
  }

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
