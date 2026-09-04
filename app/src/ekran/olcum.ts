import type { SayfaOlcu } from '../cekirdek/sayfa.js'
import { VARSAYILAN_OLCU } from '../cekirdek/sayfa.js'
import { S } from './ortak.js'

/**
 * Sayfanın gerçek taşıma kapasitesini ölçer.
 *
 * Sabit bir "620 karakter" varsayımı yanlıştı: aynı metin 680px'lik bir
 * kağıtta ve 320px'lik bir telefon kağıdında bambaşka yer kaplıyor, telefonda
 * sayfa taşıyordu. Burada tahmin yok — kağıdın içine bilinen uzunlukta bir
 * metin konup gerçek yüksekliği ölçülüyor, oradan "piksel başına karakter"
 * çıkarılıyor. Yazı tipi, satır aralığı, ekran genişliği ne olursa olsun
 * doğru sonuç verir.
 */

/**
 * SERİM — aynı anda kaç sayfa görünüyor (KARARLAR.md · K-050).
 *
 * Kararı CSS medya sorgusu DEĞİL burası veriyor, ve sebebi ölçüm: sayfa
 * kapasitesi kağıdın gerçek genişliğinden çıkıyor. Yalnızca CSS bilseydi
 * `sayfaOlc` kaç sütun çizildiğini bilmez, iki sütunluk bir kağıdı tek
 * sütun sanıp sayfayı taşırırdı. Tek doğruluk kaynağı burada; CSS gövdedeki
 * sınıfa bakıyor.
 *
 * Kural: **yatay ekran ve en az 720 px.** Dar bir sütunda satır ~15
 * karaktere düşüyor ve okunmuyor; telefon dikey tutulurken tek sayfa
 * kalıyor — yazarken klavye açıkken doğru duruş da o.
 */
const SERIM_EN_AZ = 720

export function serimSayfasi(): 1 | 2 {
  const en = window.innerWidth
  const boy = window.innerHeight
  return en >= SERIM_EN_AZ && en > boy ? 2 : 1
}

/** Bir sayfanın okunabilir kaldığı en dar genişlik. */
const EN_DAR_SAYFA = 320

/**
 * Defterin en-boy oranı — SABİT DEĞİL, kutudan çıkıyor.
 *
 * Sabit bir oran iki uçta da yanlış cevap veriyordu:
 *
 *   · Geniş masaüstünde (1600×900) oran yüksekliği doldurup 1114 px'de
 *     kalıyor, iki yanda yüzlerce piksel boş duruyordu — kullanıcının
 *     şikayeti tam olarak buydu.
 *   · Yan çevrilmiş telefonda (844×390) yükseklik çok az olduğu için
 *     defter 389 px'e düşüyor ve ekranın yarısı boş kalıyordu.
 *
 * Kural: kutunun kendi oranı alınıyor, kitaba benzemeyi bırakmasın diye
 * sınırlanıyor. Sınır sayfayı okunmaz yapacaksa (yükseklik çok az) sınır
 * kalkıyor: o durumda "kitap gibi dursun" demek, "okunamasın" demektir.
 */
function defterOrani(sayfaBasi: 1 | 2): number {
  const kap = document.querySelector<HTMLElement>('#kagit-kap')
  const k = kap?.getBoundingClientRect()
  if (!k || k.height < 40 || k.width < 40) return sayfaBasi === 2 ? 1.6 : 0.74
  const kutu = k.width / k.height
  const [enAz, enCok] = sayfaBasi === 2 ? [1.35, 1.72] : [0.6, 0.95]
  const sinirli = Math.min(enCok, Math.max(enAz, kutu))
  /* Sınırlı oran sayfaları okunmaz inceltiyorsa kutuyu doldur. */
  const sayfaEni = (k.height * sinirli) / sayfaBasi
  return sayfaEni < EN_DAR_SAYFA ? kutu : sinirli
}

/**
 * Serimi gövdeye yazar ve kaç sayfa olduğunu döner.
 *
 * Ölçümden ÖNCE çağrılmak zorunda: sınıf konmadan ölçülen kağıt yanlış
 * genişlikte olur.
 */
export function serimiKur(): 1 | 2 {
  const n = serimSayfasi()
  document.body.classList.toggle('serim', n === 2)
  document.documentElement.style.setProperty('--defter-oran', defterOrani(n).toFixed(3))
  return n
}

/** Ekin görseli sayfanın kullanılabilir yüksekliğinin en fazla bu kadarı. */
const EK_SAYFA_PAYI = 0.42
/**
 * `.ek`'in dikey marjı. getBoundingClientRect marjı saymaz; sayılmazsa
 * her ek sayfayı 20px taşırır.
 */
const EK_MARJIN = 20

/*
 * Ölçüm metni aktif dilde: harf dağılımı ve sözcük uzunluğu gerçekçi
 * olsun. Türkçe ölçüp İngilizce dizmek sayfa kapasitesini kaydırıyordu
 * (KARARLAR.md · K-035).
 */
const ornek = (): string => S('olcum.ornek').repeat(6)

/** Ölçüm için sayfanın içine geçici bir kopya kurar, ölçer, kaldırır. */
function olc<T = number>(
  kagitIc: HTMLElement,
  html: string,
  f?: (el: HTMLElement) => T,
): T {
  const kap = document.createElement('div')
  kap.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:0;right:0'
  kap.innerHTML = html
  kagitIc.appendChild(kap)
  const sonuc = (f ? f(kap) : kap.getBoundingClientRect().height) as T
  kap.remove()
  return sonuc
}

/** Açık sayfayı ölçer. Sayfa DOM'da yoksa demo değerleri döner. */
export function sayfaOlc(): SayfaOlcu {
  const kagitIc = document.querySelector<HTMLElement>('.kagit-ic')
  if (!kagitIc || !kagitIc.clientHeight) return VARSAYILAN_OLCU

  const stil = getComputedStyle(kagitIc)
  const kullanilabilir =
    kagitIc.clientHeight - parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom)
  if (kullanilabilir < 40) return VARSAYILAN_OLCU

  /* 1 — gövde metninin piksel başına kaç karakter taşıdığı. */
  const metin = ornek()
  const govdeYukseklik = olc(
    kagitIc,
    `<div class="satir"><time>00:00</time><p>${metin}</p></div>`,
  )
  if (govdeYukseklik < 1) return VARSAYILAN_OLCU
  const karakterPiksel = metin.length / govdeYukseklik

  /* 2 — boş bir kayıt satırının kendi payı (dolgu, boşluk). */
  const bosSatir = olc(kagitIc, '<div class="satir"><time>00:00</time><p>x</p></div>')
  /* 3 — gün başlığı ve kenar notunun yüksekliği. */
  const gunBasligi = olc(kagitIc, `<div class="g-bas">${S('olcum.gunBasligi')}</div>`)
  const kenar = olc(kagitIc, '<div class="kenar">x<span>kenar notu · 1 ocak</span></div>')
  /* 4 — sayfa başlığı şeridi her sayfanın tepesinde duruyor. */
  const syfBaslik = olc(
    kagitIc,
    `<div class="syf-baslik"><button class="ekle">${S('defter.baslikEkle')}</button></div>`,
  )
  /* 5 — kayda eşlik eden sorunun kendi payı. */
  const soru = olc(kagitIc, '<div class="kayit-soru">x</div>')
  /*
   * 6 — ek. İki ayrı ölçü gerekiyor çünkü maliyet orana bağlı: aynı
   * genişlikte dikey bir fotoğraf yatay olanın iki katı yer kaplar.
   * Önce çerçevenin kendi payı, sonra KARE bir görselin yüksekliği.
   */
  const ekSabitPiksel =
    olc(kagitIc, '<div class="ek" style="--ek-tavan:0"><i></i></div>') + EK_MARJIN
  const ekKarePiksel =
    olc(kagitIc, '<div class="ek" style="--ek-tavan:99999px"><i style="aspect-ratio:1"></i></div>') -
    ekSabitPiksel +
    EK_MARJIN

  /*
   * Ekin görseli sayfanın bundan fazlasını yiyemez. Aynı piksel hem CSS'e
   * (`--ek-tavan`) hem maliyet hesabına gidiyor; ikisi ayrılırsa sayfa
   * sessizce taşıyor.
   */
  const ekTavanPiksel = Math.round(kullanilabilir * EK_SAYFA_PAYI)
  document.documentElement.style.setProperty('--ek-tavan', ekTavanPiksel + 'px')

  /* 7 — son sayfadaki yazma alanı. */
  const yazma = olc(
    kagitIc,
    '<div style="display:flex;gap:14px;padding:4px 0 26px">' +
      '<div style="width:34px;flex:none"></div>' +
      '<div style="flex:1;min-height:74px;padding:6px 0 0"></div></div>',
  )

  /*
   * Satır yüksekliği — doğrusal modelin kaçırdığı kayıp buradan geliyor.
   * Metin satır satır dizildiği için her kaydın son satırı yarım kalır;
   * dar ekranda (satırda ~20 karakter) bu kayıp sayfayı taşıracak kadar
   * büyür. Kayda ortalama yarım satır ekleniyor, sayfadan da bir satır
   * emniyet payı düşülüyor.
   */
  const satirYukseklik = olc(kagitIc, '<div class="satir"><time>0</time><p>x</p></div>', (el) => {
    const p = el.querySelector('p')!
    const y = parseFloat(getComputedStyle(p).lineHeight)
    return Number.isFinite(y) ? y : 24
  })
  const satirKarakter = satirYukseklik * karakterPiksel

  /*
   * Defterin gerçek genişliği üst şeride ve araç çubuğuna geçiyor.
   *
   * Kağıt kutusu artık en-boy oranıyla, yani YÜKSEKLİKTEN türeyen bir
   * genişlikte. Üstteki ad ile alttaki düğmeler sabit bir `max-width`e
   * bağlı kalsaydı geniş ekranda kağıtla hizası kaçardı. `--ek-tavan` ile
   * aynı desen: ölçülen piksel doğrudan CSS'e.
   */
  /* Ölçülen şey cildin kendisi: `#kagit-kap` bütün genişliği kaplayan kap,
     defter onun içinde ortalanmış duruyor. */
  const kap = document.querySelector<HTMLElement>('#kagit-kap .cilt')
  if (kap) {
    const en = Math.round(kap.getBoundingClientRect().width)
    if (en > 0) document.documentElement.style.setProperty('--defter-en', en + 'px')
  }

  const ktr = (piksel: number) => Math.max(0, Math.round(piksel * karakterPiksel))
  const hacim = Math.max(
    120,
    Math.round((kullanilabilir - syfBaslik) * karakterPiksel - satirKarakter),
  )

  return {
    hacim,
    gunBasligi: ktr(gunBasligi),
    kayitSabit: ktr(bosSatir) + Math.round(satirKarakter / 2),
    kenarSabit: ktr(kenar),
    soruSabit: ktr(soru),
    yazmaAlani: ktr(yazma),
    ekSabit: ktr(ekSabitPiksel),
    ekKare: Math.max(1, ktr(ekKarePiksel)),
    ekTavan: Math.max(1, ktr(ekTavanPiksel)),
  }
}
