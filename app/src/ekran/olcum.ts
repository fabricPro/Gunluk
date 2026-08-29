import type { SayfaOlcu } from '../cekirdek/sayfa.js'
import { VARSAYILAN_OLCU } from '../cekirdek/sayfa.js'

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

/* Ölçüm metni: Türkçe harf dağılımı ve sözcük uzunluğu gerçekçi olsun. */
const ORNEK = (
  'Bugün yine erken kalktım ve pencereyi açtım, hava soğuktu. ' +
  'Aşağıda birileri konuşuyordu, uzun süre onları dinledim. ' +
  'Sonra çay koydum ve düşündüm ki bu aylarda ilk defa bir şey istiyorum. '
).repeat(6)

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
  const govdeYukseklik = olc(
    kagitIc,
    `<div class="satir"><time>00:00</time><p>${ORNEK}</p></div>`,
  )
  if (govdeYukseklik < 1) return VARSAYILAN_OLCU
  const karakterPiksel = ORNEK.length / govdeYukseklik

  /* 2 — boş bir kayıt satırının kendi payı (dolgu, boşluk). */
  const bosSatir = olc(kagitIc, '<div class="satir"><time>00:00</time><p>x</p></div>')
  /* 3 — gün başlığı ve kenar notunun yüksekliği. */
  const gunBasligi = olc(kagitIc, '<div class="g-bas">perşembe, 1 ocak 2026</div>')
  const kenar = olc(kagitIc, '<div class="kenar">x<span>kenar notu · 1 ocak</span></div>')
  /* 4 — sayfa başlığı şeridi her sayfanın tepesinde duruyor. */
  const syfBaslik = olc(
    kagitIc,
    '<div class="syf-baslik"><button class="ekle">başlık ekle</button></div>',
  )
  /* 5 — kayda eşlik eden sorunun kendi payı. */
  const soru = olc(kagitIc, '<div class="kayit-soru">x</div>')
  /* 6 — son sayfadaki yazma alanı. */
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
  }
}
