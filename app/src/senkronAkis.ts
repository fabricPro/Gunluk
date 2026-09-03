import { catismaKarari, zarfiAc, zarfla, type Varlik } from './cekirdek/senkronBicim.js'
import type { Zarf } from './cekirdek/senkronBicim.js'
import type { SenkronKimlik } from './cekirdek/senkronKimlik.js'
import type { Depo, SenkronUygulama } from './veri/depo.js'
import type { Sunucu } from './veri/senkronDepo.js'
import { OKUNAMAYAN, SU_SEVIYESI } from './senkronKurulum.js'

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
  /** Son turda sunucudan inip yerele YAZILAN satır sayısı. */
  sonCekilen: number
  /**
   * Son turda inip AÇILAMAYAN satır sayısı.
   *
   * Bu satırlar sessizce atlanıyordu ve su seviyesi üstlerine çıkıyordu:
   * sunucudaki `surum` bir daha değişmediği için bir daha da hiç
   * istenmiyorlardı. Kullanıcı defterinin bir kısmının inmediğini
   * öğrenemiyordu — arıza dışarıdan görünmez oluyordu
   * (KARARLAR.md · K-042, K-048).
   */
  okunamayan: number
}

/** Bir turda taşınan en fazla satır. Ek'ler büyük olabiliyor. */
const PARCA = 50

export class SenkronAkis {
  private iptal = false
  private suruyor = false
  /** Bu turda sunucudan inen satır sayısı (açılanlar + açılamayanlar). */
  private indirilen = 0
  /** Bu turda açılamayan satır sayısı. */
  private turdaOkunamayan = 0
  private dinleyiciler: (() => void)[] = []

  /**
   * Son tur GERÇEKTEN bir şey değiştirdi mi.
   *
   * `calistir()`in dönüşü "hata almadan koştu" demek, "değişti" demek
   * değil — ve çağıran taraf bunu "değişti" diye okuyunca sonsuz bir
   * döngü kuruluyordu: tur biter → ekran tazelenir → tazeleme senkronu
   * yeniden borçlandırır → 4 saniye sonra tur biter… Defter açık kaldığı
   * sürece sürüyordu (KARARLAR.md · K-044).
   *
   * Ayrı bir alan, çünkü `calistir()`in boolean anlamı ("koştu mu")
   * testlerde sabitlenmiş durumda; ikisini tek değere bindirmek yine
   * aynı karışıklığı üretirdi.
   */
  sonTurDegisti = false

  durum: SenkronDurum = {
    calisiyor: false,
    bekleyen: 0,
    asama: '',
    hata: null,
    sonSenkron: null,
    sonCekilen: 0,
    okunamayan: 0,
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
    /* Açılamayan satır sayısı yeniden yüklemeden sonra da durmalı: kalıcı
       olmasaydı ayar kağıdı onu yalnızca satırın indiği anda gösterirdi. */
    this.durum.okunamayan = Number((await this.depo.ayarOku(OKUNAMAYAN)) ?? 0)
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
    this.sonTurDegisti = false
    this.durum.sonCekilen = 0
    this.indirilen = 0
    this.turdaOkunamayan = 0
    try {
      const cekilen = await this.cek()
      /*
       * Sayı YALNIZCA gerçekten satır indiren turda yazılıyor.
       *
       * Her turda yazılsaydı boş bir tur, bir önceki turun bulduğu
       * açılamayan satırları sıfırlar ve uyarı kaybolurdu.
       */
      if (this.indirilen) {
        this.durum.okunamayan = this.turdaOkunamayan
        await this.depo.ayarYaz(OKUNAMAYAN, String(this.turdaOkunamayan))
      }
      const itilen = this.iptal ? 0 : await this.it()
      this.sonTurDegisti = cekilen + itilen > 0
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

  /** Uygulanan satır sayısı — 0 ise uzakta yeni bir şey yoktu. */
  private async cek(): Promise<number> {
    let seviye = Number((await this.depo.ayarOku(SU_SEVIYESI)) ?? 0)
    let uygulanan = 0
    for (;;) {
      if (this.iptal) return uygulanan
      this.durum.asama = 'çekiliyor'
      this.duyur()

      const gelen = await this.sunucu.cek(seviye, PARCA)
      if (!gelen.length) return uygulanan
      this.indirilen += gelen.length

      const islemler: SenkronUygulama[] = []
      const notlar: { kayitId: string; metin: string }[] = []
      let enBuyukSaat = 0

      for (const { zarf } of gelen) {
        const uzak = await zarfiAc(zarf, this.kimlik)
        /*
         * Çözülemeyen satır atlanıyor — senkron çökmüyor. Ama SAYILIYOR:
         * seviye birazdan bunun üstüne çıkacak ve satır bu cihazın çekme
         * akışından kalıcı olarak düşecek. Seviyeyi geri tutmak çare değil,
         * gerçekten yabancı tek bir satır senkronu sonsuza kadar kilitler;
         * doğru davranış ilerleyip SÖYLEMEK (KARARLAR.md · K-048).
         */
        if (!uzak) {
          this.turdaOkunamayan++
          continue
        }
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
      uygulanan += islemler.length + notlar.length
      this.durum.sonCekilen = uygulanan
      await this.depo.senkronSaatiIlerlet(enBuyukSaat)

      /*
       * Çakışmada kaybeden metin kenar notuna dönüyor — ve bu not YEREL
       * bir değişiklik, yani iz bırakıyor ve karşı cihaza da gidiyor.
       * Bir günlükte sessiz "son yazan kazanır" kabul edilemez.
       */
      for (const n of notlar) await this.depo.kenarEkle(n.kayitId, n.metin)

      seviye = gelen[gelen.length - 1]!.surum
      await this.depo.ayarYaz(SU_SEVIYESI, String(seviye))
      if (gelen.length < PARCA) return uygulanan
    }
  }

  /* ── itme ──────────────────────────────────────────────── */

  /** Gönderilen satır sayısı — 0 ise yerelde bekleyen yoktu. */
  private async it(): Promise<number> {
    let gonderilen = 0
    for (;;) {
      if (this.iptal) return gonderilen
      const bekleyen = await this.depo.senkronBekleyen(PARCA)
      if (!bekleyen.length) return gonderilen

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
      gonderilen += isaretler.length
      await this.tazele()
      if (bekleyen.length < PARCA) return gonderilen
    }
  }
}
