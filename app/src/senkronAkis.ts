import { catismaKarari, zarfiAc, zarfla, type Varlik } from './cekirdek/senkronBicim.js'
import type { Zarf } from './cekirdek/senkronBicim.js'
import type { SenkronKimlik } from './cekirdek/senkronKimlik.js'
import type { Depo, SenkronUygulama } from './veri/depo.js'
import type { Sunucu } from './veri/senkronDepo.js'

/**
 * SENKRON DÖNGÜSÜ — çek, uygula, it.
 *
 * Yerel asıl: SQLite hâlâ tek kaynak. Bu katman onun üstüne takılıyor
 * ve kapalıyken uygulama bugünkü gibi, tamamen çevrimdışı çalışıyor
 * (KARARLAR.md · K-036). `GomuAkis` deseninin aynısı — parçalı,
 * iptal edilebilir, sürdürülebilir.
 */

export interface SenkronDurum {
  calisiyor: boolean
  bekleyen: number
  asama: string
  hata: string | null
  sonSenkron: number | null
}

/** Bir turda taşınan en fazla satır. Ek'ler büyük olabiliyor. */
const PARCA = 50

/** Su seviyeleri `ayar` tablosunda — cihaza özgü, senkronlanmıyor. */
const SU_SEVIYESI = 'senkron.sonGorulen'

export class SenkronAkis {
  private iptal = false
  private suruyor = false
  private dinleyiciler: (() => void)[] = []

  durum: SenkronDurum = {
    calisiyor: false,
    bekleyen: 0,
    asama: '',
    hata: null,
    sonSenkron: null,
  }

  constructor(
    private readonly depo: Depo,
    private readonly sunucu: Sunucu,
    private readonly kimlik: SenkronKimlik,
  ) {}

  dinle(f: () => void): void {
    this.dinleyiciler.push(f)
  }
  private duyur(): void {
    for (const f of this.dinleyiciler) f()
  }

  dur(): void {
    this.iptal = true
  }

  async tazele(): Promise<void> {
    this.durum.bekleyen = await this.depo.senkronBekleyenSayisi()
    this.duyur()
  }

  /**
   * Bir tam tur: önce çek, sonra it.
   *
   * Sıra bilerek: uzaktaki değişiklikler yerele indikten sonra
   * itiliyor, böylece çakışma kararı iki tarafı da görmüş oluyor.
   */
  async calistir(): Promise<boolean> {
    if (this.suruyor) return false
    this.suruyor = true
    this.iptal = false
    this.durum.calisiyor = true
    this.durum.hata = null
    this.duyur()
    try {
      await this.cek()
      if (!this.iptal) await this.it()
      this.durum.sonSenkron = Date.now()
      return true
    } catch (e) {
      this.durum.hata = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      this.suruyor = false
      this.durum.calisiyor = false
      this.durum.asama = ''
      await this.tazele().catch(() => {})
      this.duyur()
    }
  }

  /* ── çekme ─────────────────────────────────────────────── */

  private async cek(): Promise<void> {
    let seviye = Number((await this.depo.ayarOku(SU_SEVIYESI)) ?? 0)
    for (;;) {
      if (this.iptal) return
      this.durum.asama = 'çekiliyor'
      this.duyur()

      const gelen = await this.sunucu.cek(seviye, PARCA)
      if (!gelen.length) return

      const islemler: SenkronUygulama[] = []
      const notlar: { kayitId: string; metin: string }[] = []
      let enBuyukSaat = 0

      for (const { zarf } of gelen) {
        const uzak = await zarfiAc(zarf, this.kimlik)
        /* Çözülemeyen satır atlanıyor — senkron çökmüyor. */
        if (!uzak) continue
        enBuyukSaat = Math.max(enBuyukSaat, uzak.guncelleme)

        /*
         * Yerelin bildiği her şey: satırın kendisi (silinmişse yok) ve
         * izdeki Lamport sırası. İz, silinmiş satırlar için de duruyor —
         * "burada bir şey vardı ve şu anda silindi" bilgisi yalnızca
         * orada yaşıyor.
         */
        const iz = await this.depo.senkronIziOku(uzak.varlik, uzak.id)
        const alanlar = iz?.silindi
          ? null
          : await this.depo.senkronSatir(uzak.varlik, uzak.id)
        const yerel = iz || alanlar ? { sira: iz?.sira ?? 0, alanlar } : null

        const karar = catismaKarari(yerel, uzak)
        if (karar.tur === 'yerel') continue
        islemler.push({
          varlik: uzak.varlik,
          id: uzak.id,
          sira: uzak.guncelleme,
          alanlar: uzak.alanlar,
        })
        if (karar.kurtarilacakMetin)
          notlar.push({ kayitId: uzak.id, metin: karar.kurtarilacakMetin })
      }

      await this.depo.senkronUygula(islemler)
      await this.depo.senkronSaatiIlerlet(enBuyukSaat)

      /*
       * Çakışmada kaybeden metin kenar notuna dönüyor — ve bu not YEREL
       * bir değişiklik, yani iz bırakıyor ve karşı cihaza da gidiyor.
       * Bir günlükte sessiz "son yazan kazanır" kabul edilemez.
       */
      for (const n of notlar) await this.depo.kenarEkle(n.kayitId, n.metin)

      seviye = gelen[gelen.length - 1]!.surum
      await this.depo.ayarYaz(SU_SEVIYESI, String(seviye))
      if (gelen.length < PARCA) return
    }
  }

  /* ── itme ──────────────────────────────────────────────── */

  private async it(): Promise<void> {
    for (;;) {
      if (this.iptal) return
      const bekleyen = await this.depo.senkronBekleyen(PARCA)
      if (!bekleyen.length) return

      this.durum.asama = `gönderiliyor — ${bekleyen.length}`
      this.duyur()

      const zarflar: Zarf[] = []
      const isaretler: { varlik: string; id: string; sira: number }[] = []
      for (const b of bekleyen) {
        const varlik = b.varlik as Varlik
        /* Silme de aynı işlevden çıkıyor: `alanlar` null. Satır arada
           silinmişse de aynı yol. */
        const alanlar = b.silindi ? null : await this.depo.senkronSatir(b.varlik, b.id)
        zarflar.push(
          await zarfla({ varlik, id: b.id, alanlar, guncelleme: b.sira }, this.kimlik),
        )
        isaretler.push({ varlik: b.varlik, id: b.id, sira: b.sira })
      }

      await this.sunucu.it(zarflar)
      /* Önce sunucu, sonra işaret: istek yarıda kalırsa satır bekleyende
         kalıyor ve bir daha gönderiliyor. Aynı satırı iki kez göndermek
         zararsız (upsert), göndermemek veri kaybı. */
      await this.depo.senkronGonderildi(isaretler)
      await this.tazele()
      if (bekleyen.length < PARCA) return
    }
  }
}
