import type { KilitKaydi } from './veri/kilit.js'
import { denemeDurumu, hataIsle, hataSifirla, kilidiKur, pinIleAc } from './veri/kilit.js'
import type { KilitDepo } from './veri/kilitDepo.js'

/**
 * Kilit durumu ve geçişleri.
 *
 * Üç durum var ve aralarındaki geçişler tek yerden yönetiliyor:
 *
 *   kurulusuz  → kilit hiç kurulmamış, defter doğrudan açılıyor
 *   kilitli    → kayıt var, ana anahtar bellekte YOK, veritabanı KAPALI
 *   acik       → anahtar bellekte, veritabanı açık
 *
 * Kilitliyken veritabanı açılmaz; anahtar olmadan açılamaz zaten
 * (KARARLAR.md · K-021).
 */
export type KilitDurumu = 'kurulusuz' | 'kilitli' | 'acik'

export interface AcmaSonuc {
  oldu: boolean
  anaAnahtar?: string
  /** Açılamadıysa neden: yanlış PIN mi, bekleme mi. */
  sebep?: 'yanlis' | 'bekleme' | 'yok'
  /** Bekleme varsa kaç ms kaldı. */
  kalan?: number
}

export class Kilit {
  durum: KilitDurumu = 'kurulusuz'
  kayit: KilitKaydi | null = null
  private anahtar: string | null = null

  constructor(private readonly depo: KilitDepo) {}

  /** Açılışta çağrılır: kayıt varsa kilitli başlarız. */
  async yukle(): Promise<KilitDurumu> {
    this.kayit = await this.depo.oku()
    this.durum = this.kayit ? 'kilitli' : 'kurulusuz'
    return this.durum
  }

  get anaAnahtar(): string | null {
    return this.durum === 'acik' ? this.anahtar : null
  }

  get biyometriAcik(): boolean {
    return this.kayit?.biyometri ?? false
  }

  /** PIN ile açar; yanlışsa sayacı ilerletir ve kalıcı yazar. */
  async pinIle(pin: string, simdi = Date.now()): Promise<AcmaSonuc> {
    if (!this.kayit) return { oldu: false, sebep: 'yok' }
    const d = denemeDurumu(this.kayit, simdi)
    if (!d.acik) return { oldu: false, sebep: 'bekleme', kalan: d.kalan }

    const av = await pinIleAc(this.kayit, pin)
    if (!av) {
      this.kayit = hataIsle(this.kayit, simdi)
      await this.depo.yaz(this.kayit)
      const yeni = denemeDurumu(this.kayit, simdi)
      return { oldu: false, sebep: 'yanlis', kalan: yeni.kalan }
    }
    this.kayit = hataSifirla(this.kayit)
    await this.depo.yaz(this.kayit)
    this.anahtar = av
    this.durum = 'acik'
    return { oldu: true, anaAnahtar: av }
  }

  /** Biyometriyle açar. Kullanıcı vazgeçerse sessizce başarısız olur. */
  async biyometriIle(): Promise<AcmaSonuc> {
    if (!this.kayit?.biyometri) return { oldu: false, sebep: 'yok' }
    const av = await this.depo.biyometriIleAc()
    if (!av) return { oldu: false, sebep: 'yanlis' }
    this.anahtar = av
    this.durum = 'acik'
    return { oldu: true, anaAnahtar: av }
  }

  /**
   * Kilidi kurar. Defter zaten varsa mevcut anahtarı korur — kilit
   * sonradan açıldığında veri okunamaz hâle gelmesin.
   */
  async kur(pin: string, mevcutAnahtar?: string): Promise<string> {
    const { kayit, anaAnahtar } = await kilidiKur(pin, mevcutAnahtar)
    this.kayit = kayit
    this.anahtar = anaAnahtar
    this.durum = 'acik'
    await this.depo.yaz(kayit)
    return anaAnahtar
  }

  /** PIN'i değiştirir; ana anahtar aynı kalır, defter yeniden şifrelenmez. */
  async pinDegistir(eskiPin: string, yeniPin: string): Promise<boolean> {
    if (!this.kayit) return false
    const av = await pinIleAc(this.kayit, eskiPin)
    if (!av) return false
    const biyometri = this.kayit.biyometri
    const { kayit } = await kilidiKur(yeniPin, av)
    this.kayit = { ...kayit, biyometri }
    await this.depo.yaz(this.kayit)
    return true
  }

  async biyometriKur(): Promise<boolean> {
    if (!this.kayit || !this.anahtar) return false
    if (!(await this.depo.biyometriVarMi())) return false
    await this.depo.biyometriKur(this.anahtar)
    this.kayit = { ...this.kayit, biyometri: true }
    await this.depo.yaz(this.kayit)
    return true
  }

  async biyometriKaldir(): Promise<void> {
    if (!this.kayit) return
    await this.depo.biyometriKaldir()
    this.kayit = { ...this.kayit, biyometri: false }
    await this.depo.yaz(this.kayit)
  }

  /** Kilidi tamamen kaldırır. Defter bundan sonra doğrudan açılır. */
  async kaldir(): Promise<void> {
    await this.depo.sil()
    this.kayit = null
    this.durum = 'kurulusuz'
  }

  /**
   * Kilitler: ana anahtar bellekten silinir.
   * Çağıran taraf veritabanını da kapatmak zorunda.
   */
  kilitle(): void {
    if (!this.kayit) return
    this.anahtar = null
    this.durum = 'kilitli'
  }

  async biyometriVarMi(): Promise<boolean> {
    return this.depo.biyometriVarMi()
  }
}
