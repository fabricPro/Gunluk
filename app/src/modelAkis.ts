import type { Anlatim } from './cekirdek/anlatim.js'
import type { AnahtarDepo } from './veri/anahtarDepo.js'

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

  constructor(private readonly depo: AnahtarDepo) {}

  async yukle(): Promise<void> {
    try {
      this.anahtar = await this.depo.oku()
    } catch {
      this.anahtar = null
    }
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
    if (!this.anahtar) throw new Error('Anahtar girilmemiş.')
    const { cevapAkit } = await import('./veri/model.js')
    await cevapAkit(anlatim, this.anahtar, parca)
  }

  dinle(f: () => void): void {
    this.dinleyiciler.push(f)
  }

  private duyur(): void {
    for (const f of this.dinleyiciler) f()
  }
}
