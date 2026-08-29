import type { Cilt, Gun, KenarNotu, Sayfa, SayfaOgesi } from './tipler.js'

/** Bir sayfaya sığan yaklaşık karakter maliyeti. Demodan birebir. */
export const SAYFA_HACIM = 620
/** Bir cildin sayfa sayısı. Defteri defter yapan sınır. */
export const CILT_SAYFA = 45

/* Öğelerin karakter maliyeti — demodaki hesabın aynısı. */
const GUN_BASLIGI_MALIYET = 44
const KAYIT_SABIT_MALIYET = 22
const KENAR_SABIT_MALIYET = 20

export interface AkisGirdi {
  gunler: Gun[]
  /** kayitId -> o kayda düşülmüş kenar notu */
  kenarlar: Map<string, KenarNotu>
  /**
   * Kapanmış ciltlerin dondurulmuş sayfaları (KARARLAR.md · K-006).
   * Verilirse bu sayfalar olduğu gibi korunur, akış yalnızca sonrasında
   * hesaplanır. Boşsa her şey yeniden akıtılır.
   */
  donmusSayfalar?: Sayfa[]
}

export interface Akis {
  sayfalar: Sayfa[]
  ciltler: Cilt[]
}

/**
 * Kayıtları karakter maliyetine göre sayfalara akıtır.
 *
 * Kapanmış ciltlere ait sayfalar `donmusSayfalar` ile verilirse aynen
 * korunur; yalnızca açık cildin sayfaları yeniden hesaplanır. Sebep: eski
 * bir kayıt düzeltilip uzayınca kapanmış cildin içeriği değişmesin.
 */
export function sayfalariKur({ gunler, kenarlar, donmusSayfalar = [] }: AkisGirdi): Akis {
  const donmus = donmusSayfalar.slice().sort((a, b) => a.no - b.no)

  /* Donmuş sayfalarda yer alan kayıtlar yeniden akıtılmaz. */
  const donmusKayitlar = new Set<string>()
  for (const s of donmus)
    for (const o of s.ogeler) if (o.tip === 'kayit') donmusKayitlar.add(o.kayitId)

  const sayfalar: Sayfa[] = donmus.map((s) => ({ ...s }))
  let ogeler: SayfaOgesi[] = []
  let hacim = 0

  const sayfayiKapat = () => {
    if (!ogeler.length) return
    sayfalar.push({ no: 0, cilt: 0, ciltSayfa: 0, ogeler, hacim, anahtar: null })
    ogeler = []
    hacim = 0
  }

  for (const gun of gunler) {
    let basYok = true
    for (const kayit of gun.kayitlar) {
      if (donmusKayitlar.has(kayit.id)) continue
      const kenar = kenarlar.get(kayit.id)
      const maliyet =
        kayit.metin.length +
        KAYIT_SABIT_MALIYET +
        (basYok ? GUN_BASLIGI_MALIYET : 0) +
        (kenar ? kenar.metin.length + KENAR_SABIT_MALIYET : 0)

      if (hacim + maliyet > SAYFA_HACIM && ogeler.length) {
        sayfayiKapat()
        basYok = true /* yeni sayfada gün başlığı tekrar yazılır */
      }
      if (basYok) {
        ogeler.push({ tip: 'gun', tarih: gun.tarih, ad: gun.ad })
        basYok = false
      }
      ogeler.push({ tip: 'kayit', kayitId: kayit.id, tarih: gun.tarih })
      if (kenar)
        ogeler.push({ tip: 'kenar', kayitId: kayit.id, metin: kenar.metin, tarih: kenar.tarih })
      hacim += maliyet
    }
  }
  sayfayiKapat()

  sayfalar.forEach((s, i) => {
    s.no = i + 1
    s.cilt = Math.floor(i / CILT_SAYFA) + 1
    s.ciltSayfa = (i % CILT_SAYFA) + 1
    const ilk = s.ogeler.find((o) => o.tip === 'kayit')
    /* Başlık sayfa numarasına değil ilk kaydın kimliğine bağlı (K-005). */
    s.anahtar = ilk && ilk.tip === 'kayit' ? ilk.kayitId : null
  })

  return { sayfalar, ciltler: ciltleriKur(sayfalar, new Map()) }
}

/** Sayfalardan cilt listesini çıkarır. Son cilt her zaman açıktır. */
export function ciltleriKur(sayfalar: Sayfa[], adlar: Map<number, string>): Cilt[] {
  const adet = Math.ceil(sayfalar.length / CILT_SAYFA)
  const ciltler: Cilt[] = []
  for (let c = 1; c <= adet; c++) {
    const syf = sayfalar.filter((s) => s.cilt === c)
    ciltler.push({
      no: c,
      ad: adlar.get(c) ?? null,
      sayfa: syf.length,
      kapali: c < adet,
      ilk: syf[0],
      son: syf[syf.length - 1],
    })
  }
  return ciltler
}

/** Bir kaydın hangi sayfada olduğunu bulur. */
export const sayfaBul = (sayfalar: Sayfa[], kayitId: string): Sayfa | null =>
  sayfalar.find((s) => s.ogeler.some((o) => o.tip === 'kayit' && o.kayitId === kayitId)) ?? null
