import type { Gomucu } from './cekirdek/gomucu.js'
import { paketle } from './cekirdek/gomu.js'
import type { Depo } from './veri/depo.js'

/**
 * Gömü indeksleme işi — parçalı, iptal edilebilir, sürdürülebilir.
 *
 * On yıllık bir defterde birkaç yüz kayıt var ve her biri için 12 katmanlı
 * bir model çalışıyor; bu iş dakikalar sürebilir. O yüzden:
 *
 *  - parçalar hâlinde ilerliyor ve her parçadan sonra nefes alıyor;
 *  - her an iptal edilebiliyor — kilitlenince ve arka plana geçince
 *    duruyor (K-021), çünkü anahtar bellekten silinince veritabanı da
 *    kapanıyor;
 *  - kaldığı yerden devam ediyor: kuyruk her turda depodan yeniden
 *    soruluyor, bellekte durum tutulmuyor.
 */

export interface AkisDurum {
  calisiyor: boolean
  bekleyen: number
  toplam: number
  asama: string
  hata: string | null
}

const PARCA = 8

export class GomuAkis {
  private iptal = false
  private surüyor = false
  durum: AkisDurum = { calisiyor: false, bekleyen: 0, toplam: 0, asama: '', hata: null }

  private dinleyiciler: (() => void)[] = []

  constructor(
    private readonly depo: Depo,
    private readonly gomucu: Gomucu,
    /** Belge öneki — e5 ailesi bunu bekliyor. */
    private readonly onek: (m: string) => string = (m) => m,
  ) {}

  dinle(f: () => void): void {
    this.dinleyiciler.push(f)
  }
  private duyur(): void {
    for (const f of this.dinleyiciler) f()
  }

  asamaYaz(asama: string): void {
    this.durum.asama = asama
    this.duyur()
  }

  /** Sayaçları tazeler; iş başlatmaz. */
  async tazele(): Promise<void> {
    const d = await this.depo.gomuDurum(this.gomucu.kimlik)
    this.durum.bekleyen = d.bekleyen
    this.durum.toplam = d.toplam
    this.duyur()
  }

  /** Çalışan işi durdurur. Kilitlenmede ve arka plana geçişte çağrılıyor. */
  dur(): void {
    this.iptal = true
  }

  /**
   * Eksikleri gömer. Zaten çalışıyorsa ikinci kez başlamıyor.
   * Hata olursa durumda kalıyor ve iş sessizce ölmüyor.
   */
  async calistir(): Promise<void> {
    if (this.surüyor) return
    this.surüyor = true
    this.iptal = false
    this.durum.calisiyor = true
    this.durum.hata = null
    this.duyur()
    try {
      for (;;) {
        if (this.iptal) break
        const kuyruk = await this.depo.gomusuzKayitlar(this.gomucu.kimlik, PARCA)
        if (!kuyruk.length) break

        const vektorler = await this.gomucu.goc(kuyruk.map((k) => this.onek(k.metin)))
        if (this.iptal) break

        /* Tek işlemde yaz: yarım kalmış bir parça tutarsız indeks bırakmasın. */
        await this.depo.islem(async () => {
          for (let i = 0; i < kuyruk.length; i++) {
            const v = vektorler[i]
            if (!v) continue
            await this.depo.gomuYaz(kuyruk[i]!.id, this.gomucu.kimlik, paketle(v))
          }
        })
        await this.tazele()
        /* Arayüz nefes alsın — indeksleme yazmayı engellemesin. */
        await new Promise((r) => setTimeout(r, 0))
      }
    } catch (e) {
      this.durum.hata = e instanceof Error ? e.message : String(e)
    } finally {
      this.surüyor = false
      this.durum.calisiyor = false
      this.durum.asama = ''
      await this.tazele().catch(() => {})
      this.duyur()
    }
  }
}
