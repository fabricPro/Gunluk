import { SABIT_OLCU } from '../cekirdek/sayfa.js'
import { S } from './ortak.js'

/**
 * SAYFA SABİT, YAZI ÖLÇEKLİ (KARARLAR.md · K-051).
 *
 * Bu dosya eskiden "bu kağıda kaç karakter sığar" diye ölçüp cevabı
 * sayfalamaya veriyordu. Sonucu: sayfa numarası ekrana bağlıydı ve aynı
 * defter masaüstünde 70, yatay telefonda 389 sayfa oluyordu.
 *
 * Şimdi ölçülen şey ters yönde: **sabit sayfanın bu kağıda sığması için
 * yazı ne kadar olmalı.** K-014'ün kazanımı duruyor — tahmin yok, kağıdın
 * içine bilinen uzunlukta metin konup gerçek yüksekliği ölçülüyor; yalnızca
 * sonuç sayfalamaya değil ÖLÇEĞE gidiyor.
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

/*
 * Ölçüm metni aktif dilde: harf dağılımı ve sözcük uzunluğu gerçekçi
 * olsun. Türkçe ölçüp İngilizce dizmek sayfa kapasitesini kaydırıyordu
 * (KARARLAR.md · K-035).
 */
const ornek = (): string => S('olcum.ornek').repeat(6)

/**
 * Ölçüm için sayfanın içine geçici bir kopya kurar, ölçer, kaldırır.
 *
 * Yükseklik `offsetHeight` ile alınıyor, `getBoundingClientRect` ile
 * DEĞİL. Sebebi `zoom`: kağıt bir ölçekle çiziliyor ve iki ölçü ayrı
 * birimde dönüyor — `clientHeight`/`offsetHeight` yerleşim birimini,
 * `getBoundingClientRect` ekrana basılan (ölçeklenmiş) pikseli veriyor.
 * İkisini karıştırmak kapasiteyi ölçek kadar yanlış hesaplardı
 * (KARARLAR.md · K-051).
 */
function olc<T = number>(
  kagitIc: HTMLElement,
  html: string,
  f?: (el: HTMLElement) => T,
): T {
  const kap = document.createElement('div')
  kap.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:0;right:0'
  kap.innerHTML = html
  kagitIc.appendChild(kap)
  const sonuc = (f ? f(kap) : kap.offsetHeight) as T
  kap.remove()
  return sonuc
}

/**
 * Yazı ölçeğinin sınırları.
 *
 * Alt sınıra dayanınca (yatay telefon) sabit sayfa kağıda sığmıyor ve
 * `.kagit-ic` kaydırılabiliyor — bugün de var olan emniyet supabı.
 * Sınırsız bırakmak orada okunmayacak kadar küçük bir yazı demekti.
 * Üst sınır çok büyük ekranda yazının afişe dönmesini engelliyor.
 */
const EN_KUCUK_OLCEK = 0.62
const EN_BUYUK_OLCEK = 2.05

const kis = (k: number): number => Math.min(EN_BUYUK_OLCEK, Math.max(EN_KUCUK_OLCEK, k))

const olcekYaz = (k: number): void => {
  document.documentElement.style.setProperty('--yazi-olcek', String(Math.round(k * 1000) / 1000))
}

/**
 * Şu anki ölçekte bir sayfanın taşıdığı karakter — ve ekin tavanı.
 *
 * `null` dönüyorsa kağıt henüz ölçülebilir değil.
 *
 * Bütün ölçüler YERLEŞİM biriminde: `zoom` altında `clientHeight` ve
 * `offsetHeight` yerleşim birimini, `getBoundingClientRect` ekrana basılan
 * pikseli veriyor. `olc()` bu yüzden `offsetHeight` kullanıyor.
 */
function hacimOlc(): { hacim: number; karakterPiksel: number; kullanilabilir: number } | null {
  const kagitIc = document.querySelector<HTMLElement>('.kagit-ic')
  if (!kagitIc || !kagitIc.clientHeight) return null

  const stil = getComputedStyle(kagitIc)
  const kullanilabilir =
    kagitIc.clientHeight - parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom)
  if (kullanilabilir < 40) return null

  const metin = ornek()
  const govdeYukseklik = olc(
    kagitIc,
    `<div class="satir"><time>00:00</time><p>${metin}</p></div>`,
  )
  if (govdeYukseklik < 1) return null
  const karakterPiksel = metin.length / govdeYukseklik

  /* Sayfa başlığı şeridi her sayfanın tepesinde duruyor. */
  const syfBaslik = olc(
    kagitIc,
    `<div class="syf-baslik"><button class="ekle">${S('defter.baslikEkle')}</button></div>`,
  )
  /*
   * Satır yüksekliği — doğrusal modelin kaçırdığı kayıp buradan geliyor.
   * Metin satır satır dizildiği için her kaydın son satırı yarım kalır;
   * sayfadan bir satır emniyet payı düşülüyor.
   */
  const satirYukseklik = olc(kagitIc, '<div class="satir"><time>0</time><p>x</p></div>', (el) => {
    const p = el.querySelector('p')!
    const y = parseFloat(getComputedStyle(p).lineHeight)
    return Number.isFinite(y) ? y : 24
  })

  const hacim = Math.max(
    1,
    Math.round((kullanilabilir - syfBaslik) * karakterPiksel - satirYukseklik * karakterPiksel),
  )
  return { hacim, karakterPiksel, kullanilabilir }
}

/**
 * Sabit sayfanın kağıda sığacağı yazı ölçeğini bulur ve uygular.
 *
 * Yakınsama: `zoom = k` altında yerleşim kutusu `fiziksel / k` oluyor, yani
 * kapasite `1/k²` ile değişiyor. Ölçülen kapasite hedeften büyükse ölçek
 * `sqrt(ölçülen / hedef)` kadar büyütülüyor — bir adımda neredeyse tam
 * oturuyor, birkaç yineleme sabit maliyetlerin (başlık şeridi, satır payı)
 * doğrusal olmayan kısmını topluyor.
 */
export function yaziOlceginiKur(): number {
  let k = 1
  let son: ReturnType<typeof hacimOlc> = null
  for (let i = 0; i < 4; i++) {
    olcekYaz(k)
    son = hacimOlc()
    if (!son) {
      olcekYaz(1)
      return 1
    }
    const oran = son.hacim / SABIT_OLCU.hacim
    if (Math.abs(oran - 1) < 0.02) break
    const yeni = kis(k * Math.sqrt(oran))
    if (yeni === k) break
    k = yeni
  }
  olcekYaz(k)

  /*
   * Ekin tavanı da sabit ölçüden çıkıyor: `SABIT_OLCU.ekTavan` karakterlik
   * yer, bu ölçekte kaç yerleşim pikseli ediyorsa o. Maliyet ile görselin
   * AYNI sayıdan gelmesi K-014'ün şartıydı ve duruyor; yalnızca kaynak
   * ölçüm değil sabit oldu.
   */
  const olcum = hacimOlc()
  if (olcum) {
    const tavan = Math.round(SABIT_OLCU.ekTavan / olcum.karakterPiksel)
    document.documentElement.style.setProperty('--ek-tavan', tavan + 'px')
  }
  return k
}
