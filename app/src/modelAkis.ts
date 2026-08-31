import type { Anlatim } from './cekirdek/anlatim.js'
import type { AnahtarDepo } from './veri/anahtarDepo.js'
import { S, dil } from './ekran/ortak.js'

/**
 * Model cevabının durumu: anahtar var mı, çağrı açık mı.
 *
 * Anahtar yoksa özellik yok — varsayılan kapalı olması bir ayar değil,
 * kurulumun kendisi. Kullanıcı anahtarını girene kadar arşivde model
 * düğmesi hiç görünmüyor (KARARLAR.md · K-031).
 */
export class ModelAkis {
  private anahtar: string | null = null
  private dinleyiciler: (() => void)[] = []
  /**
   * Yazdıktan sonra soru düğmesi görünsün mü — yol haritası 12.
   *
   * Ayrı bir ayar, çünkü arşiv cevabıyla aynı şey değil: biri geçmişe
   * bakarken, diğeri yazarken devreye giriyor. Anahtarı olan herkes
   * ikisini birden istemek zorunda değil (KARARLAR.md · K-032).
   */
  soruAcik = false

  constructor(private readonly depo: AnahtarDepo) {}

  async yukle(soruAcik = false): Promise<void> {
    try {
      this.anahtar = await this.depo.oku()
    } catch {
      this.anahtar = null
    }
    this.soruAcik = soruAcik
    this.duyur()
  }

  get acik(): boolean {
    return !!this.anahtar
  }

  /** Anahtarın yalnızca son dört hanesi — ayar kağıdı bunu gösteriyor. */
  get kuyruk(): string {
    return this.anahtar ? this.anahtar.slice(-4) : ''
  }

  async anahtarYaz(a: string): Promise<void> {
    await this.depo.yaz(a.trim())
    this.anahtar = a.trim()
    this.duyur()
  }

  async anahtarSil(): Promise<void> {
    await this.depo.sil()
    this.anahtar = null
    this.duyur()
  }

  /**
   * Cevabı akıtır. Çağrı kodu ayrı bir parçada: anahtar girilmemişse
   * SDK hiç indirilmiyor.
   */
  async sor(anlatim: Anlatim, parca: (m: string) => void): Promise<void> {
    if (!this.anahtar) throw new Error(S('genel.anahtarYok'))
    const { cevapAkit } = await import('./veri/model.js')
    await cevapAkit(anlatim, this.anahtar, parca)
  }

  /**
   * Yazılan kayıttan tek bir soru üretir; kriz işareti varsa null.
   *
   * Dışarı çıkan tek şey o kaydın metni — gün, defter, geçmiş kayıtlar
   * gitmiyor.
   */
  async soruSor(kayitMetni: string): Promise<string | null> {
    if (!this.anahtar || !this.soruAcik) return null
    const { soruUret } = await import('./veri/model.js')
    return soruUret(kayitMetni, this.anahtar, dil())
  }

  /** Yazdıktan sonra soru düğmesi çıkacak mı. */
  get soruIstenebilir(): boolean {
    return !!this.anahtar && this.soruAcik
  }

  dinle(f: () => void): void {
    this.dinleyiciler.push(f)
  }

  private duyur(): void {
    for (const f of this.dinleyiciler) f()
  }
}
