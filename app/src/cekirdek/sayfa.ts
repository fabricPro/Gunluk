import type { Cilt, EkBilgi, Gun, KenarNotu, Sayfa, SayfaOgesi } from './tipler.js'

/** Bir sayfaya sığan yaklaşık karakter maliyeti — ölçüm yokken. */
export const SAYFA_HACIM = 620
/** Bir cildin sayfa sayısı. Defteri defter yapan sınır. */
export const CILT_SAYFA = 45

/**
 * Sayfanın taşıma kapasitesi ve öğelerin maliyeti.
 *
 * Sabit değil: aynı metin 680px'lik bir kağıtta ve 320px'lik bir telefon
 * kağıdında çok farklı yer kaplar. Ekran katmanı sayfayı gerçekten ölçüp
 * bu değerleri geçer (`ekran/olcum.ts`); çekirdek DOM bilmez, yalnızca
 * sayı alır (KARARLAR.md · K-014).
 */
export interface SayfaOlcu {
  hacim: number
  gunBasligi: number
  kayitSabit: number
  kenarSabit: number
  /** Kayda eşlik eden sorunun satır payı. */
  soruSabit: number
  /** Son sayfanın altındaki yazma alanı. */
  yazmaAlani: number
  /** Ekin çerçeve, boşluk ve alt yazı payı. */
  ekSabit: number
  /** KARE bir ekin gösterim genişliğindeki maliyeti. */
  ekKare: number
  /** Ekin görselinin en fazla tutabileceği yer — CSS'teki `--ek-tavan`. */
  ekTavan: number
}

/**
 * Bir ekin sayfada kapladığı yer.
 *
 * Tek bir "ek sabiti" yanlış olurdu: dikey bir fotoğraf aynı genişlikte
 * yatay olanın iki katı yer kaplar. Maliyet en-boy oranından çıkıyor —
 * sabit SAYFA_HACIM hatasının aynısını tekrarlamamak için (K-014, K-023).
 *
 * `ekTavan` tek tavan ve CSS'le AYNI sayı: ölçüm katmanı hem bu değeri hem
 * `--ek-tavan` özelliğini aynı pikselden üretiyor. Önce ikisi ayrıydı —
 * maliyet kırpılıyor ama görsel kırpılmıyordu, sayfa da sessizce 110px
 * taşıyordu. Tavan ayrıca akışın kilitlenmesini engelliyor: hiçbir sayfaya
 * sığmayan bir ek, yerleştirilmeyi sonsuza kadar denerdi.
 */
export const ekMaliyeti = (ek: EkBilgi, olcu: SayfaOlcu): number =>
  olcu.ekSabit +
  Math.min(olcu.ekTavan, Math.round((olcu.ekKare * ek.boy) / Math.max(1, ek.en)))

/** Ölçüm yapılamadığında kullanılan demo değerleri. */
export const VARSAYILAN_OLCU: SayfaOlcu = {
  hacim: SAYFA_HACIM,
  gunBasligi: 44,
  kayitSabit: 22,
  kenarSabit: 20,
  soruSabit: 26,
  yazmaAlani: 90,
  ekSabit: 24,
  ekKare: 260,
  ekTavan: 260,
}

/**
 * Bir parçanın sayfada işgal etmesi anlamlı sayılan en az yer.
 * Sayfanın dibinde bundan az yer kaldıysa parça oraya sıkıştırılmaz,
 * sayfa kapatılıp temiz bir sayfadan başlanır.
 */
const ASGARI_PARCA = 80

export interface AkisGirdi {
  gunler: Gun[]
  /** kayitId -> o kayda düşülmüş kenar notları, yazılma sırasında */
  kenarlar: Map<string, KenarNotu[]>
  /** kayitId -> o kayda iliştirilmiş ekin üstverisi (gövde yok). */
  ekler?: Map<string, EkBilgi>
  /**
   * Kapanmış ciltlerin dondurulmuş sayfaları (KARARLAR.md · K-006).
   * Verilirse bu sayfalar olduğu gibi korunur, akış yalnızca sonrasında
   * hesaplanır. Boşsa her şey yeniden akıtılır.
   */
  donmusSayfalar?: Sayfa[]
  /** Ölçülmüş sayfa kapasitesi; verilmezse demo değerleri kullanılır. */
  olcu?: SayfaOlcu
}

export interface Akis {
  sayfalar: Sayfa[]
  ciltler: Cilt[]
}

/**
 * Metni verilen sınıra kadar, mümkünse sözcük sınırından ikiye ayırır.
 *
 * Dönen iki parça birleştirildiğinde özgün metni **birebir** verir: ayırma
 * noktasındaki boşluk baş parçanın sonunda kalır. Sınır içinde hiç boşluk
 * yoksa (kırılamayan uzun bir dizi) karakterden kesilir — yoksa akış sonsuz
 * döngüye girer.
 */
export function sozcuktenKes(metin: string, sinir: number): [string, string] {
  if (sinir >= metin.length) return [metin, '']
  if (sinir < 1) return [metin.slice(0, 1), metin.slice(1)]

  /* Sınırın hemen sonrasında boşluk varsa tam orada kesmek en temizi. */
  const pencere = metin.slice(0, sinir + 1)
  const bosluk = Math.max(pencere.lastIndexOf(' '), pencere.lastIndexOf('\n'))
  if (bosluk > 0) return [metin.slice(0, bosluk + 1), metin.slice(bosluk + 1)]
  return [metin.slice(0, sinir), metin.slice(sinir)]
}

/**
 * Kayıtları karakter maliyetine göre sayfalara akıtır.
 *
 * Bir sayfaya sığmayan kayıt kesilir ve sonraki sayfadan devam eder; hiçbir
 * kayıt kağıdın dışına taşmaz. Kapanmış ciltlere ait sayfalar
 * `donmusSayfalar` ile verilirse aynen korunur; yalnızca açık cildin
 * sayfaları yeniden hesaplanır.
 */
export function sayfalariKur({
  gunler,
  kenarlar,
  ekler = new Map(),
  donmusSayfalar = [],
  olcu = VARSAYILAN_OLCU,
}: AkisGirdi): Akis {
  const SAYFA = olcu.hacim
  const GUN_BASLIGI_MALIYET = olcu.gunBasligi
  const KAYIT_SABIT_MALIYET = olcu.kayitSabit
  const KENAR_SABIT_MALIYET = olcu.kenarSabit
  const SORU_SABIT_MALIYET = olcu.soruSabit
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
      const notlar = kenarlar.get(kayit.id) ?? []
      const ek = ekler.get(kayit.id)
      /* Soru yalnızca kaydın başladığı sayfada, bir kez yer kaplar. */
      const soruMaliyet = kayit.soru ? kayit.soru.length + SORU_SABIT_MALIYET : 0

      /*
       * Kuyruk = kaydın son parçasıyla gelenler: ek ve kenar notu.
       *
       * Maliyetleri bölünen metinden düşülmüyor, çünkü metin biterken
       * ödeniyorlar. Ama tavansız bırakılamazlar: kuyruk tek başına temiz
       * bir sayfaya sığmıyorsa 1. koşul hiçbir zaman tutmaz, 2. koşul da
       * atlanır, akış boş parçalar üretip sonsuza kadar döner. Yeterince
       * uzun bir kenar notu bu döngüyü gerçekten kuruyordu.
       */
      const kuyrukTavan = Math.max(
        0,
        SAYFA - GUN_BASLIGI_MALIYET - KAYIT_SABIT_MALIYET - ASGARI_PARCA,
      )
      /*
       * Kuyruk öğeleri ve maliyetleri. Toplam tavana vuruyor ama BASIM
       * tavanla değil gerçek boşlukla ilerliyor (bkz. `kuyrugaBas`):
       * maliyeti kırpıp çizimi kırpmamak sayfayı sessizce taşırır — ek
       * işinde tam olarak bu olmuştu.
       */
      const kuyruk: { oge: SayfaOgesi; maliyet: number }[] = []
      if (ek)
        kuyruk.push({
          oge: { tip: 'ek', kayitId: kayit.id, tur: ek.tur, en: ek.en, boy: ek.boy },
          maliyet: ekMaliyeti(ek, olcu),
        })
      for (const n of notlar)
        kuyruk.push({
          oge: { tip: 'kenar', id: n.id, kayitId: kayit.id, metin: n.metin, tarih: n.tarih },
          maliyet: n.metin.length + KENAR_SABIT_MALIYET,
        })
      const kuyrukMaliyet = Math.min(
        kuyrukTavan,
        kuyruk.reduce((t, k) => t + k.maliyet, 0),
      )

      /**
       * Kuyruğu basar; sığmayan öğe için sayfayı kapatıp yenisinden devam
       * eder. Kayıt yerleştikten sonra çalıştığı için sayfa kapatmak
       * güvenli — bölme mantığına dokunmuyor.
       */
      const kuyrugaBas = (): void => {
        for (const k of kuyruk) {
          if (ogeler.length && hacim + k.maliyet > SAYFA) {
            sayfayiKapat()
            basYok = true
          }
          ogeler.push(k.oge)
          hacim += k.maliyet
        }
      }

      let kalan = kayit.metin
      let parcaNo = 0

      /*
       * Kayıt bu sayfaya sığıyorsa bütün yazılır. Sığmıyor ama temiz bir
       * sayfaya sığıyorsa olduğu gibi sonraki sayfaya taşınır — kısa
       * kayıtların davranışı demodaki gibi kalsın diye. Yalnızca tek
       * başına bir sayfaya sığmayan kayıt bölünür (K-014).
       */
      for (;;) {
        const basMaliyet = basYok ? GUN_BASLIGI_MALIYET : 0
        const bastaMi = parcaNo === 0
        const tamMaliyet =
          basMaliyet +
          KAYIT_SABIT_MALIYET +
          (bastaMi ? soruMaliyet : 0) +
          kalan.length +
          kuyrukMaliyet
        const bosluk = SAYFA - hacim

        const gunBasligiYaz = () => {
          if (!basYok) return
          ogeler.push({ tip: 'gun', tarih: gun.tarih, ad: gun.ad })
          basYok = false
        }

        /* 1 — sığıyor: bütün yaz. */
        if (tamMaliyet <= bosluk) {
          gunBasligiYaz()
          ogeler.push({
            tip: 'kayit',
            kayitId: kayit.id,
            tarih: gun.tarih,
            metin: kalan,
            parcaNo,
            sonParca: true,
          })
          hacim += tamMaliyet - kuyrukMaliyet
          kuyrugaBas()
          break
        }

        /* 2 — temiz sayfaya sığıyor: bölmeden taşı (demodaki davranış). */
        const temizMaliyet =
          GUN_BASLIGI_MALIYET +
          KAYIT_SABIT_MALIYET +
          (bastaMi ? soruMaliyet : 0) +
          kalan.length +
          kuyrukMaliyet
        if (ogeler.length && temizMaliyet <= SAYFA) {
          sayfayiKapat()
          basYok = true
          continue
        }

        /* 3 — tek başına bir sayfaya sığmıyor: sözcük sınırından böl. */
        const yer = bosluk - basMaliyet - KAYIT_SABIT_MALIYET - (bastaMi ? soruMaliyet : 0)
        if (ogeler.length && yer < ASGARI_PARCA) {
          sayfayiKapat()
          basYok = true
          continue
        }
        const [parca, geri] = sozcuktenKes(kalan, Math.max(yer, ASGARI_PARCA))
        gunBasligiYaz()
        ogeler.push({
          tip: 'kayit',
          kayitId: kayit.id,
          tarih: gun.tarih,
          metin: parca,
          parcaNo,
          sonParca: false,
        })
        hacim = SAYFA
        sayfayiKapat()
        basYok = true
        parcaNo++
        kalan = geri
      }
    }
  }
  sayfayiKapat()

  /* Son sayfada yazma alanına yer kalmadıysa temiz bir sayfa aç. */
  const son = sayfalar[sayfalar.length - 1]
  if (son && son.hacim + olcu.yazmaAlani > SAYFA)
    sayfalar.push({ no: 0, cilt: 0, ciltSayfa: 0, ogeler: [], hacim: 0, anahtar: null })

  sayfalar.forEach((s, i) => {
    s.no = i + 1
    s.cilt = Math.floor(i / CILT_SAYFA) + 1
    s.ciltSayfa = (i % CILT_SAYFA) + 1
    /*
     * Başlık anahtarı yalnızca bir kaydın BAŞLADIĞI sayfaya verilir
     * (K-005 + K-014). Devam sayfası yeni bir başlangıç değildir; aksi
     * hâlde aynı anahtar iki sayfaya düşer ve başlık ikisine birden yazılır.
     */
    const ilk = s.ogeler.find((o) => o.tip === 'kayit' && o.parcaNo === 0)
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

/**
 * Bir kaydın BAŞLADIĞI sayfayı bulur.
 * Arşivden bir kayda tıklayan onun başına gitsin, ortasına değil.
 */
export const sayfaBul = (sayfalar: Sayfa[], kayitId: string): Sayfa | null =>
  sayfalar.find((s) =>
    s.ogeler.some((o) => o.tip === 'kayit' && o.kayitId === kayitId && o.parcaNo === 0),
  ) ?? null
