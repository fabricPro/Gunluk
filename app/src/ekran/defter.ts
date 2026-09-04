import { SAYFA_HACIM, serimBasi } from '../cekirdek/sayfa.js'
import { govdeler, ortakGovde } from '../cekirdek/govde.js'
import { krizIsareti } from '../cekirdek/kriz.js'
import type { Ek, KenarNotu, Sayfa } from '../cekirdek/tipler.js'
import { ekKaynak, gorseliHazirla } from './gorsel.js'
import { resimSec } from './dosya.js'
import { dahiEki, iso, romen, saatSayi } from '../cekirdek/tr.js'
import type { Durum } from '../durum.js'
import type { ModelAkis } from '../modelAkis.js'
import type { Depo } from '../veri/depo.js'
import {
  $,
  $$,
  S,
  bugun,
  dil,
  isikAyarla,
  kacir,
  odakBirak,
  odakVer,
  sayfaIsigiBagla,
  suanSaat,
  tarihYaz,
} from './ortak.js'

/**
 * Kenar notunun uzunluk sınırı.
 *
 * Kenarda duran bir not, sayfanın kendisi değil. Sınır aynı zamanda sayfa
 * bütçesini öngörülebilir tutuyor — akış taşan kuyruğu sonraki sayfaya
 * dökebiliyor ama bir notun tek başına sayfa yutması ürünün dili değil.
 */
const KENAR_SINIR = 280

export interface DefterArayuz {
  ciz: () => void
  sayfayaGit: (i: number, anim?: boolean) => void
}

export function defteriBagla(
  durum: Durum,
  depo: Depo,
  toreniAc: () => void,
  model?: ModelAkis,
): DefterArayuz {
  const sayfaIsik = () => {
    const s = durum.sayfalar[durum.aktifSayfa]
    if (!s) return isikAyarla(new Date().getHours())
    const kayitlar = s.ogeler.filter((o) => o.tip === 'kayit')
    const orta = kayitlar[Math.floor(kayitlar.length / 2)]
    if (!orta || orta.tip !== 'kayit') return isikAyarla(new Date().getHours())
    const k = durum.kayitBul(orta.kayitId)
    isikAyarla(k ? saatSayi(k.kayit.saat) : new Date().getHours())
  }
  sayfaIsigiBagla(sayfaIsik)

  /*
   * Gerçek en-boy oranı; tavanı CSS'teki `--ek-tavan` koyuyor ve aynı
   * pikseli maliyet hesabı da kullanıyor (`ekMaliyeti`). Uzun bir ekran
   * görüntüsü kırpılarak gösteriliyor, sayfayı yutmuyor.
   */
  const ekOran = (en: number, boy: number): string =>
    `aspect-ratio:${Math.max(1, en)}/${Math.max(1, boy)}`

  /**
   * Bırakılmayı bekleyen ek. Yalnızca bellekte: kullanıcı yazmadan
   * çıkarsa seçtiği görsel diske hiç değmez (ilke 2.2 ile aynı refleks).
   */
  let bekleyenEk: Ek | null = null

  /**
   * Yazılmakta olan, henüz bırakılmamış metin.
   *
   * `ciz()` kağıdı baştan kuruyor, yani textarea'yı da yeniden yaratıyor.
   * Ek iliştirmek de sayfayı yeniden çizdiği için yazılan cümle siliniyordu:
   * kullanıcı yarım cümlesini kaybediyordu. Taslak burada tutuluyor ve her
   * çizimden sonra geri konuyor. Diske değmiyor — bırakılana kadar yalnızca
   * bellekte.
   */
  let taslak = ''

  /**
   * Sessiz kart açık mı — ilke 2.1. Yalnızca bellekte: kayıt bırakıldığı
   * anda açılıyor, kapatılınca kapanıyor, yenilemede geri gelmiyor. Hiçbir
   * yere yazılmıyor (KARARLAR.md · K-030).
   */
  let krizKartiAcik = false

  /*
   * Arama vurgusu gövde farkındalı: "kötü" arayan kullanıcı sayfada
   * "kötüydüm"ü de işaretli görüyor (K-027). Sözcük sözcük geziliyor,
   * ham dize araması değil — yoksa çekimli biçim vurgusuz kalırdı.
   */
  const vurgu = (m: string): string => {
    const g = kacir(m)
    if (!durum.aramaTerim && !durum.aramaGovdeleri.length) return g
    const aranan = new Set(durum.aramaGovdeleri)
    return g.replace(/[\p{L}\p{N}]+/gu, (sozcuk) => {
      const dusuk = sozcuk.toLocaleLowerCase('tr')
      const eslesti =
        (durum.aramaTerim && dusuk.includes(durum.aramaTerim.toLocaleLowerCase('tr'))) ||
        (aranan.size > 0 && ortakGovde(govdeler(sozcuk), aranan))
      return eslesti ? `<mark>${sozcuk}</mark>` : sozcuk
    })
  }

  /**
   * Son sayfanın altı: yazma alanı, ya da defter dolduysa törene çağrı,
   * ya da defter kapandıysa sessiz bir not.
   */
  const altHtml = (): string => {
    if (durum.kapali)
      return `<div class="dolu-cagri"><p>${S('defter.kapali')}</p>
        <button id="ozetGor">${S('defter.ozetGor')}</button></div>`
    if (durum.dolu)
      return `<div class="dolu-cagri"><p>${S('defter.dolu')}</p>
        <button id="torenAc">${S('defter.torenAc')}</button></div>`
    const soru = durum.aktifSoru ? `<div id="yazma-soru">${kacir(durum.aktifSoru)}</div>` : ''
    /* Bekleyen ek yalnızca bellekte — bırakılmadıkça diske değmiyor. */
    const on = bekleyenEk
      ? `<div class="ek-onizleme"><img src="${ekKaynak(bekleyenEk.tur, bekleyenEk.veri)}" alt="">
          <button id="ekKaldir">${S('defter.ekKaldir')}</button></div>`
      : ''
    return `${soru}<div id="yazma"><div class="bosluk"></div>` +
      `<div class="yazma-govde">${on}` +
      `<textarea id="kalem" placeholder="${soru ? S('defter.yazSoruyla') : S('defter.yaz')}"></textarea></div></div>`
  }

  /*
   * Boş defterin ilk sayfası.
   *
   * "Defter boş" yazısı yalnızca kullanıcı daha hiçbir şey yapmadıysa
   * duruyor: taslak ya da bekleyen bir ek varsa iş başlamıştır, o yazının
   * söyleyeceği kalmamıştır — ve sayfanın yarısını kaplayıp yazılanı
   * aşağı itiyordu.
   */
  const bosSayfaHtml = (taraf: string): string => {
    const basladi = !!taslak || !!bekleyenEk
    const not = basladi
      ? ''
      : `<div class="bos-sayfa">
        <p>Defter boş. İlk sayfa aşağıda başlıyor.</p>
        <small>yaz, sonra bırak</small>
      </div>`
    return `<div class="kagit ${taraf}"><div class="kagit-ic">${not}${krizKartiHtml()}${altHtml()}
    </div><div class="kagit-alt">1</div></div>`
  }

  /**
   * Serimin boş duran yarısı.
   *
   * Son sayfa solda kalınca sağ taraf boş bir kağıt oluyor — gerçek bir
   * defterde de öyle. Kapatıp yerine tek kağıt koymak, sayfa çevirdikçe
   * defterin genişliğinin değişmesi demekti.
   */
  const bosYuzHtml = (taraf: string): string =>
    `<div class="kagit ${taraf} bos-yuz"><div class="kagit-ic"></div>
      <div class="kagit-alt"></div></div>`

  const kagitHtml = (i: number, taraf: string): string => {
    const s = durum.sayfalar[i]
    if (!s) return bosSayfaHtml(taraf)
    const baslik = durum.baslik(s)
    let ic = `<div class="syf-baslik" data-anahtar="${s.anahtar ?? ''}">
      ${baslik ? `<h3>${kacir(baslik)}</h3>` : ''}
      <button class="ekle">${baslik ? S('defter.baslikDegistir') : S('defter.baslikEkle')}</button></div>`
    for (const o of s.ogeler) {
      if (o.tip === 'gun') {
        ic += `<div class="g-bas">${o.ad}, ${tarihYaz(o.tarih)}</div>`
      } else if (o.tip === 'kayit') {
        const b = durum.kayitBul(o.kayitId)
        if (!b) continue
        /* Sayfaya düşen parça yazılır, kaydın tamamı değil (K-014).
           Saat ve düzelt düğmesi yalnızca kaydın başladığı parçada. */
        const bas = o.parcaNo === 0
        /* Soru kaydın başladığı yerde, gövdesinin üstünde. */
        if (bas && b.kayit.soru) ic += `<div class="kayit-soru">${kacir(b.kayit.soru)}</div>`
        const duzeltilebilir = bas && !durum.kapali
        const iz = bas && b.kayit.duzenlendi ? ` <span class="duz">${S('defter.duzeltildi')}</span>` : ''
        /*
         * Kenar notu düğmesi kapalı ve dolu defterde de duruyor: kapattığın
         * şey kapanır ama kenarına yazabilirsin (K-018).
         */
        const arac = bas
          ? `<div class="satir-arac">
              ${duzeltilebilir ? `<button class="kalem-btn">${S('defter.duzelt')}</button>` : ''}
              <button class="kenar-btn">${S('defter.kenarNotu')}</button>
              ${duzeltilebilir ? `<button class="sil-btn">${S('defter.sil')}</button>` : ''}</div>`
          : ''
        ic += `<div class="satir${bas ? '' : ' devam'}" data-id="${o.kayitId}">
          <time>${bas ? b.kayit.saat : ''}</time><p>${vurgu(o.metin)}${o.sonParca ? iz : ''}</p>
          ${arac}</div>`
      } else if (o.tip === 'ek') {
        /*
         * Çerçeve şimdi, görsel sonra. En-boy oranı üstveriden bilindiği
         * için yer baştan ayrılıyor; base64 gelince sayfa zıplamıyor.
         */
        ic += `<div class="ek" data-ek="${o.kayitId}"><i style="${ekOran(o.en, o.boy)}"></i></div>`
      } else {
        /* Arşivden gelen terim notta da vurgulanıyor: kayıt notu yüzünden
           bulunduysa kullanıcı sayfada nereye bakacağını görsün. */
        ic += `<div class="kenar" data-not="${o.id}">${vurgu(o.metin)}
          <span>kenar notu · ${kacir(kenarTarih(o.tarih))}</span></div>`
      }
    }
    if (i === durum.sonSayfa) ic += krizKartiHtml() + altHtml()
    return `<div class="kagit ${taraf}"><div class="kagit-ic">${ic}</div>
      <div class="kagit-alt">${s.ciltSayfa}</div></div>`
  }

  /**
   * Açık defterin görünen yüzü: bir ya da iki kağıt, bir cildin içinde.
   *
   * `sol` her zaman serimin başı — `Durum.aktifSayfa` ayarlayıcısı bunu
   * garanti ediyor (KARARLAR.md · K-050).
   */
  const serimHtml = (sol: number): string => {
    const ic =
      durum.sayfaBasi === 1
        ? kagitHtml(sol, 'tek')
        : kagitHtml(sol, 'sol') +
          (sol + 1 <= durum.sonSayfa ? kagitHtml(sol + 1, 'sag') : bosYuzHtml('sag'))
    return `<div class="cilt"><div class="yapraklar">${ic}</div></div>`
  }

  const ciz = (): void => {
    const s: Sayfa | undefined = durum.sayfalar[durum.aktifSayfa]
    const c = s ? durum.ciltler.find((x) => x.no === s.cilt) : undefined

    /* Defterin adı önce; cilt yalnızca birden fazlaysa anlamlı (K-016). */
    const d = durum.aktifDefter
    $('#ciltAd').textContent = d
      ? d.ad + (d.cilt > 1 ? ` · ${S('defter.cilt')} ${romen(d.cilt)}` : '')
      : (c?.ad ?? S('defter.varsayilanAd'))
    $('#sayfaNo').textContent = s
      ? S('defter.sayfaNo', { n: s.no, t: durum.sayfaSiniri }) +
        (d?.kapandi ? S('defter.kapaliDefter') : '')
      : S('defter.sayfaNo', { n: 1, t: durum.sayfaSiniri })

    const kalan = durum.sayfaSiniri - durum.sayfalar.length
    $('#kalanYazi').textContent =
      durum.aktifSayfa === durum.sonSayfa
        ? kalan > 3
          ? ''
          : kalan > 0
            ? S('defter.kalanSayfa', { n: kalan })
            : S('defter.dolduKisa')
        : ''

    $('#kagit-kap').innerHTML = serimHtml(durum.aktifSayfa)
    $<HTMLButtonElement>('#geri').disabled = durum.aktifSayfa === 0
    $<HTMLButtonElement>('#ileri').disabled =
      durum.aktifSayfa + durum.sayfaBasi > durum.sonSayfa

    /*
     * Yazma alanı SON SAYFADA duruyor ve o sayfa serimin sağ yarısında da
     * olabilir. `aktifSayfa === sonSayfa` demek, iki sayfalı kipte çift
     * sayıda sayfası olan bir defterde `bırak` düğmesini gizlerdi:
     * kullanıcı yazabildiği bir sayfaya bakıp bırakamazdı.
     */
    const son = durum.gorunenSayfalar.includes(durum.sonSayfa)
    $('#birak').style.display = son && durum.yazilabilir ? '' : 'none'
    $('#dikte').style.display = son && durum.yazilabilir ? '' : 'none'
    $('#ekIlistir').style.display = son && durum.yazilabilir ? '' : 'none'
    $('#ekIlistir').textContent = bekleyenEk ? S('arac.ekBaska') : S('arac.ek')
    $('#soruIste').style.display = son && durum.soruIstenebilir ? '' : 'none'
    $('#soruIste').textContent = durum.aktifSoru ? S('arac.soruIsteBaska') : S('arac.soruIste')
    /*
     * Yazdıktan sonra tek soru (yol haritası 12). Düğme, çağrının
     * kullanıcının AÇIK eylemi olması için var: ilke 2.3 "arka planda
     * sessizce hiçbir şey yüklenmez" diyor, otomatik gönderim o cümleyi
     * bozardı (KARARLAR.md · K-032).
     *
     * Kriz günlerinde hiç çıkmıyor: o gün uygulama susuyor (ilke 2.1).
     */
    $('#soruYazdan').style.display =
      son && durum.yazilabilir && !durum.krizVar && !!model?.soruIstenebilir && !!sonKayitMetni()
        ? ''
        : 'none'
    $('#bugune').style.display = son ? 'none' : ''

    kalemBagla()
    baslikBagla()
    for (const b of $$('#kagit-kap .kalem-btn'))
      b.onclick = (e) => {
        const el = (e.target as HTMLElement).closest<HTMLElement>('.satir')
        if (el?.dataset.id) duzelt(el.dataset.id)
      }
    /*
     * Araçlar dokunmayla açılıyor, bir seferde tek kayıtta. Metnin
     * kendisine dokunmak yeterli; ayrı bir "…" düğmesi sayfaya bir arayüz
     * öğesi daha eklerdi.
     */
    for (const el of $$('#kagit-kap .satir[data-id]'))
      el.onclick = (e) => {
        const h = e.target as HTMLElement
        if (h.closest('.satir-arac') || h.closest('.duzelt-alan')) return
        const acikti = el.classList.contains('acik')
        for (const o of $$('#kagit-kap .satir.acik')) o.classList.remove('acik')
        if (!acikti) el.classList.add('acik')
      }

    for (const b of $$('#kagit-kap .sil-btn'))
      b.onclick = (e) => {
        const el = (e.target as HTMLElement).closest<HTMLElement>('.satir')
        if (el?.dataset.id) kayitSilSor(el.dataset.id)
      }

    for (const b of $$('#kagit-kap .kenar-btn'))
      b.onclick = (e) => {
        const el = (e.target as HTMLElement).closest<HTMLElement>('.satir')
        if (el?.dataset.id) kenarYaz(el.dataset.id, el)
      }
    kenarlariBagla()
    const torenBtn = document.getElementById('torenAc')
    if (torenBtn) torenBtn.onclick = () => toreniAc()
    const ozetBtn = document.getElementById('ozetGor')
    if (ozetBtn) ozetBtn.onclick = () => toreniAc()

    krizKartiniBagla()
    ekleriBagla()
    kesitCiz()
    sayfaIsik()
  }

  /* ── kenar notu · eski bir kayda sonradan (K-024) ──────── */

  /**
   * Tarih ISO saklanıyor, burada biçimleniyor. Göç öncesi yazılmış okunur
   * dizeler olduğu gibi basılıyor — o veriyi güvenilir biçimde ayrıştırmak
   * mümkün değil, uydurmaktansa aynen göstermek doğru.
   */
  const kenarTarih = (t: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(t) ? tarihYaz(t) : t)

  /** Not yalnızca yazıldığı gün silinebilir; ertesi gün kalıcılaşır. */
  const bugunYazildi = (not: KenarNotu): boolean =>
    not.olusturma > 0 && iso(new Date(not.olusturma)) === bugun()

  function kenarlariBagla(): void {
    const hepsi = new Map<string, KenarNotu>()
    for (const liste of durum.kenarlar.values()) for (const n of liste) hepsi.set(n.id, n)

    for (const el of $$('#kagit-kap .kenar[data-not]')) {
      const not = hepsi.get(el.dataset.not ?? '')
      if (!not || !bugunYazildi(not)) continue
      const sil = document.createElement('button')
      sil.className = 'sil'
      sil.textContent = 'sil'
      sil.onclick = async () => {
        await depo.kenarSil(not.id)
        await durum.yenile()
        ciz()
      }
      el.appendChild(sil)
    }
  }

  /** Kaydın altında, notun duracağı yerde küçük bir yazma alanı açar. */
  function kenarYaz(kayitId: string, satir: HTMLElement): void {
    if (satir.parentElement?.querySelector('.kenar-yaz')) return
    const alan = document.createElement('div')
    alan.className = 'kenar-yaz'
    alan.innerHTML = `<textarea maxlength="${KENAR_SINIR}"
        placeholder="${kacir(S('defter.kenarYer'))}"></textarea>
      <div class="kenar-arac">
        <button class="kaydet">${S('defter.kaydet')}</button>
        <button class="vaz">${S('defter.vazgec')}</button>
        <span class="sayac"></span>
      </div>`
    satir.insertAdjacentElement('afterend', alan)

    const ta = alan.querySelector('textarea')!
    const sayac = alan.querySelector<HTMLElement>('.sayac')!
    const boyla = () => {
      ta.style.height = 'auto'
      ta.style.height = ta.scrollHeight + 'px'
      /* Sayaç yalnızca sınıra yaklaşınca görünüyor; sürekli sayı göstermek
         notu bir forma çevirirdi. */
      const kalan = KENAR_SINIR - ta.value.length
      sayac.textContent = kalan <= 40 ? String(kalan) : ''
    }
    ta.focus()
    ta.addEventListener('input', boyla)

    const bit = async () => {
      const m = ta.value.trim()
      if (!m) return ciz()
      await depo.kenarEkle(kayitId, m)
      await durum.yenile()
      ciz()
    }
    /* Kısayollar K-015'le aynı: tek bir yazma refleksi olsun. */
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        void bit()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        ciz()
      }
    })
    alan.querySelector<HTMLButtonElement>('.kaydet')!.onclick = () => void bit()
    alan.querySelector<HTMLButtonElement>('.vaz')!.onclick = () => ciz()
    alan.scrollIntoView({ block: 'nearest' })
  }

  /* ── ek ────────────────────────────────────────────────── */

  /**
   * Görünen sayfadaki eklerin gövdesini getirir.
   *
   * Base64 bellekte tutulmuyor (bkz. `Durum.ekler`); sayfa çizildikten
   * sonra yalnızca ekranda duran ek okunuyor. Çerçeve zaten doğru oranda
   * durduğu için görsel gelince sayfa kaymıyor.
   */
  function ekleriBagla(): void {
    for (const el of $$('#kagit-kap .ek[data-ek]')) {
      const id = el.dataset.ek
      if (!id) continue
      void depo.ekVeri(id).then((ek) => {
        if (!ek || !el.isConnected) return
        el.innerHTML =
          `<img src="${ekKaynak(ek.tur, ek.veri)}" alt="" loading="lazy" ` +
          `style="${ekOran(ek.en, ek.boy)}">`
        el.onclick = () => ekTamAc(ek)
      })
    }
    const kaldir = document.getElementById('ekKaldir')
    if (kaldir)
      kaldir.onclick = () => {
        bekleyenEk = null
        ciz()
      }
  }

  /** Sayfadaki küçük görsel, dokununca tam ekran. */
  function ekTamAc(ek: Ek): void {
    const kat = $('#ekTam')
    kat.innerHTML = `<img src="${ekKaynak(ek.tur, ek.veri)}" alt="">`
    kat.classList.add('acik')
    const kapa = () => {
      kat.classList.remove('acik')
      kat.innerHTML = ''
      removeEventListener('keydown', esc)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') kapa()
    }
    kat.onclick = kapa
    addEventListener('keydown', esc)
  }

  /** Görsel seçtirir, küçültür, hazırsa geri döner. */
  async function ekSec(): Promise<Ek | null> {
    const dosya = await resimSec()
    if (!dosya) return null
    try {
      return await gorseliHazirla(dosya)
    } catch (e) {
      console.error('[defter] görsel alınamadı', e)
      return null
    }
  }

  const sayfayaGit = (i: number, anim = true): void => {
    if (i < 0 || i > durum.sonSayfa) return
    /*
     * Hedef sayfa serimin sağ yarısında olabilir; gidilecek yer o sayfa
     * değil, onu İÇEREN serim (KARARLAR.md · K-050).
     */
    const hedef = serimBasi(i, durum.sayfaBasi)
    /*
     * Aynı sayfaya "gitmek" de bir iş yapar: arşivden bir kayda tıklandığında
     * arama terimi değişmiş olabilir. Eskiden burada kayıtsız dönülüyordu ve
     * kayıt zaten açık sayfadaysa vurgu hiç görünmüyordu — kullanıcı neden
     * o kaydın geldiğini göremiyordu.
     */
    if (hedef === durum.aktifSayfa) {
      ciz()
      return
    }
    const yon = hedef > durum.aktifSayfa ? 'ileri' : 'geri'
    /*
     * SIRT ETRAFINDA ÇEVRİLEN YAPRAK.
     *
     * Açık bir defterde çevrilen şey defterin tamamı değil, tek bir
     * yaprak: ileri giderken sağ sayfa sırtın etrafında sola, geri
     * giderken sol sayfa sağa dönüyor. Tek sayfalı kipte dönen şey
     * kağıdın kendisi.
     *
     * KLON ÇİZİMDEN SONRA EKLENİYOR — ve bu bir düzeltme. Eskiden klon
     * `ciz()`ten ÖNCE ekleniyordu; `ciz()` ise `#kagit-kap`ın bütün
     * içeriğini yeniden yazıyor, yani klonu daha ilk karede siliyordu.
     * Animasyon kodu duruyordu ama hiç görünmüyordu (KARARLAR.md · K-050).
     *
     * Arka yüz sorunu (yaprağın tersinde ne yazdığı) sönümlemeyle
     * çözülüyor: gerçek bir arka yüz çizmek, çevrilen yaprağın öteki
     * sayfasını da kurmak demekti ve kimse o kareyi görmüyor.
     */
    const secici = durum.sayfaBasi === 1 ? '.kagit' : yon === 'ileri' ? '.kagit.sag' : '.kagit.sol'
    const eskiHtml = anim
      ? (document.querySelector<HTMLElement>('#kagit-kap ' + secici)?.outerHTML ?? null)
      : null

    durum.aktifSayfa = hedef
    ciz()

    if (eskiHtml) {
      const yapraklar = document.querySelector<HTMLElement>('#kagit-kap .yapraklar')
      const kap = document.createElement('div')
      kap.innerHTML = eskiHtml
      const yaprak = kap.firstElementChild as HTMLElement | null
      if (yapraklar && yaprak) {
        yaprak.classList.add('cevrilen', 'cevir-' + yon)
        yapraklar.appendChild(yaprak)
        setTimeout(() => yaprak.remove(), 700)
      }
    }
  }

  /* ── sayfa başlığı — kayıt kimliğine bağlı (K-005) ─────── */
  function baslikBagla(): void {
    /* Serimde iki başlık şeridi var; yalnızca ilkini bağlamak sağ sayfaya
       ad verilememesi demekti. */
    for (const kap of $$('#kagit-kap .syf-baslik')) baslikSeridiBagla(kap)
  }

  function baslikSeridiBagla(kap: HTMLElement): void {
    const anahtar = kap.dataset.anahtar
    const ekle = kap.querySelector<HTMLButtonElement>('.ekle')
    if (!ekle || !anahtar) return
    ekle.onclick = () => {
      const eski = durum.basliklar.get(anahtar) ?? ''
      kap.innerHTML = `<input value="${eski.replace(/"/g, '&quot;')}" placeholder="bu sayfaya bir ad ver…">`
      const inp = kap.querySelector('input')!
      inp.focus()
      inp.select()
      let bitti = false
      const bit = async () => {
        if (bitti) return
        bitti = true
        await depo.baslikYaz(anahtar, inp.value)
        await durum.yenile()
      }
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') void bit()
        if (e.key === 'Escape') { bitti = true; ciz() }
      })
      inp.addEventListener('blur', () => void bit())
    }
  }

  /* ── yan kesit ─────────────────────────────────────────── */
  function kesitCiz(): void {
    let h = ''
    for (const c of durum.ciltler) {
      h += `<div class="cilt-bas">${S('defter.kesitCilt', { n: romen(c.no) })}</div>`
      for (const s of durum.sayfalar.filter((x) => x.cilt === c.no)) {
        const w = 7 + Math.round((s.hacim / SAYFA_HACIM) * 26)
        const ad = durum.baslik(s)
        h += `<div class="syf${durum.gorunenSayfalar.includes(s.no - 1) ? ' aktif' : ''}${ad ? ' baslikli' : ''}"
          data-i="${s.no - 1}" title="${kacir(ad ?? S('defter.sayfaEt', { n: s.ciltSayfa }))}"><i style="width:${w}px"></i></div>`
      }
    }
    $('#kesit').innerHTML = h
    for (const el of $$('#kesit .syf')) el.onclick = () => sayfayaGit(Number(el.dataset.i))
    $('#kesit-alt').innerHTML = S('defter.kesitAlt', {
      s: durum.sayfalar.length,
      c: durum.ciltler.length,
      k: durum.kayitSayisi,
    })
    const a = $('#kesit .syf.aktif')
    const k = $('#kesit')
    if (a && (a.offsetTop < k.scrollTop || a.offsetTop > k.scrollTop + k.clientHeight - 30))
      k.scrollTop = a.offsetTop - k.clientHeight / 2
  }

  /* ── yazma ─────────────────────────────────────────────── */
  function kalemBagla(): void {
    const kalem = $<HTMLTextAreaElement>('#kalem')
    if (!kalem) return
    const boyla = () => {
      kalem.style.height = 'auto'
      kalem.style.height = kalem.scrollHeight + 'px'
    }
    /*
     * Yeniden çizim öncesindeki taslağı geri koy — ve göster. Ek
     * iliştirdikten sonra sayfa başa sarıyordu: kullanıcı yazdığı cümleyi
     * göremiyordu.
     */
    if (taslak && !kalem.value) {
      kalem.value = taslak
      boyla()
      kalem.scrollIntoView({ block: 'nearest' })
    }
    kalem.addEventListener('input', () => {
      odakVer()
      taslak = kalem.value
      boyla()
      kalem.scrollIntoView({ block: 'nearest' })
    })
    /*
     * Enter satır başı yapar — paragraf yazmak bu ürünün asıl işi.
     * Bırakma kısayolu Ctrl+Enter (Mac'te Cmd+Enter). Esc yazmadan çıkar.
     * (KARARLAR.md · K-015)
     */
    kalem.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        void birak()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        kalem.blur()
        odakBirak()
      }
    })
  }

  const birak = async (): Promise<void> => {
    /* Kapanmış ya da dolmuş deftere yazılmaz. */
    if (!durum.yazilabilir) return
    const kalem = $<HTMLTextAreaElement>('#kalem')
    if (!kalem) return
    const m = kalem.value.trim()
    if (!m) return
    const gun = bugun()
    const ek = bekleyenEk
    /* Bırakılan kaydın kimliği: aşağıda hangi sayfaya düştüğünü bulmak
       için gerekiyor. */
    let yeniId = ''
    /* Kayıt ve eki tek işlemde: yarısı yazılmış bir sayfa kalmasın. */
    await depo.islem(async () => {
      const kayit = await depo.kayitEkle({
        tarih: gun,
        saat: suanSaat(),
        metin: m,
        temalar: durum.temalariCikar(m),
        soru: durum.aktifSoru,
      })
      yeniId = kayit.id
      if (ek) await depo.ekYaz({ ...ek, kayitId: kayit.id })
    })
    /*
     * İlke 2.1 — kriz işareti varsa uygulama SUSAR ve gerçek desteğe
     * yönlendirir. Kart yalnızca burada, kayıt bırakıldığı anda çıkıyor;
     * eski bir kayda dönüldüğünde çıkmıyor. Hiçbir yere yazılmıyor
     * (KARARLAR.md · K-030).
     */
    if (krizIsareti(m, dil()).var) krizKartiAcik = true

    bekleyenEk = null
    taslak = ''
    kalem.value = ''
    await durum.yonlendirmeyiIlerlet(gun)
    await durum.yenile()
    durum.soruyuTazele(gun)
    /*
     * BIRAKILAN KAYDIN DURDUĞU SAYFAYA GİDİLİYOR — son sayfaya değil.
     *
     * Yazma alanı son sayfanın altında duruyor. Kayıt sayfayı tam
     * doldurduğunda alan bir SONRAKİ sayfaya taşıyor ve son sayfada
     * yalnızca o alan kalıyor. `sonSayfa`ya gitmek o durumda "bırak"a
     * basan kullanıcıya yazdığının görünmediği bir sayfa açıyordu; iki
     * sayfalı serimde yazdığı şey bütün bir serim geride kalıyor
     * (KARARLAR.md · K-050).
     *
     * Olağan durumda kayıt zaten son sayfada ve hiçbir şey değişmiyor;
     * kalem de yerinde kalıyor.
     */
    const kayitSayfasi = durum.sayfalar.findIndex((sy) =>
      sy.ogeler.some((o) => o.tip === 'kayit' && o.kayitId === yeniId),
    )
    durum.aktifSayfa = kayitSayfasi >= 0 ? kayitSayfasi : durum.sonSayfa
    ciz()
    /* Bırakınca odak yeni kalemde kalsın: kullanıcı hemen devam edebilsin. */
    const yeni = $<HTMLTextAreaElement>('#kalem')
    if (yeni) {
      /* Kriz kartı açıksa kaydırma ona ait: kalemi göstermek için kartı
         ekrandan kaçırmak, kartı hiç göstermemekle aynı şey. */
      yeni.focus({ preventScroll: krizKartiAcik })
      if (!krizKartiAcik) yeni.scrollIntoView({ block: 'nearest' })
    }
  }

  /* ── sessiz kart — ilke 2.1 (K-030) ────────────────────── */

  /**
   * Kart KAĞIDIN İÇİNDE çiziliyor, masanın üstünde değil.
   *
   * Önce ayrı bir öge olarak kağıdın üstüne konmuştu ve koyu masa zemininde
   * okunmuyordu. Asıl mesele okunurluk da değil: PROJE.md §4 "ekranda tek
   * aydınlık yüzey olmalı ve o sayfa olmalı" diyor. Masaya ikinci bir kart
   * koymak tasarım dilini deliyordu.
   */
  const krizKartiHtml = (): string =>
    !krizKartiAcik
      ? ''
      : `<div class="kr-kagit">
          <p>${S('kriz.metin')}</p>
          <p class="kr-yol">${S('kriz.yol')}</p>
          <button id="krKapat">${S('kriz.kapat')}</button>
        </div>`

  function krizKartiniBagla(): void {
    const d = document.getElementById('krKapat')
    if (!d) return
    d.onclick = () => {
      krizKartiAcik = false
      ciz()
    }
    /*
     * Görünürlüğü garanti et. Kart sayfa akışının bütçesinde yok (geçici
     * bir öge) ve dolu bir sayfada kağıdın altına düşüyordu — ölçüldü,
     * 250px taşıyordu. Kriz anındaki kişinin görmediği bir kart, hiç
     * olmayan bir karttır.
     */
    d.closest('.kr-kagit')?.scrollIntoView({ block: 'nearest' })
  }

  /* ── silme — iz BIRAKMAZ (K-028) ───────────────────────── */

  /**
   * Silme onayı.
   *
   * "Emin misin" diye sormak yerine ne gittiğini gösteriyor: kaydın kendi
   * metni, ve varsa birlikte gidecek kenar notu ve ek. Kart K-025'in
   * refleksini izliyor — sürtünme, kullanıcıya kararı gösterilerek kuruluyor.
   *
   * Mezar taşı yok. "Düzeltme iz bırakır" kuralı düzeltme içindir; silmenin
   * karşılığı "yakılan sayfa gerçekten yanar". Sayfada kalan bir "burada bir
   * kayıt vardı" satırı, utandığı bir şeyi silen kullanıcı için hiç
   * silmemekten kötüdür.
   */
  function kayitSilSor(kayitId: string): void {
    const b = durum.kayitBul(kayitId)
    if (!b || durum.kapali) return

    const notSayisi = (durum.kenarlar.get(kayitId) ?? []).length
    const ekVar = durum.ekler.has(kayitId)
    const gidecek: string[] = []
    if (notSayisi)
      gidecek.push(S(notSayisi === 1 ? 'ks.kenarNotu1' : 'ks.kenarNotuN', { n: notSayisi }))
    if (ekVar) gidecek.push(S('ks.birEk'))

    $('#ksZaman').textContent = `${b.gun.ad} · ${tarihYaz(b.kayit.tarih)} · ${b.kayit.saat}`
    $('#ksMetin').textContent = b.kayit.metin
    /*
     * Türkçede "de/da" bağlacı ünlü uyumuna uyuyor (K-010); İngilizcede
     * böyle bir uyum yok, `{ek}` orada boş kalıyor. Cümlenin kendisi iki
     * dilde de katalogdan geliyor — kod dallanmıyor, metin dallanıyor.
     */
    const liste = gidecek.join(dil() === 'en' ? ' and ' : ' ve ')
    $('#ksUyari').textContent = !gidecek.length
      ? S('ks.geriAlinamaz')
      : S('ks.gidecek', { liste, ek: dil() === 'en' ? '' : dahiEki(liste) })

    const kart = $('#kayitSilKarti')
    const kapat = () => {
      kart.classList.remove('acik')
      removeEventListener('keydown', esc)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') kapat()
    }
    $('#ksVaz').onclick = kapat
    kart.onclick = (e) => {
      if ((e.target as HTMLElement).id === 'kayitSilKarti') kapat()
    }
    $('#ksSil').onclick = async () => {
      kapat()
      await depo.kayitSil(kayitId)
      await durum.yenile()
      if (durum.aktifSayfa > durum.sonSayfa) durum.aktifSayfa = durum.sonSayfa
      ciz()
    }
    addEventListener('keydown', esc)
    kart.classList.add('acik')
  }

  /* ── düzeltme — iz bırakır ─────────────────────────────── */
  function duzelt(kayitId: string): void {
    const b = durum.kayitBul(kayitId)
    const el = document.querySelector<HTMLElement>(`.satir[data-id="${kayitId}"]`)
    if (!b || !el) return
    /* Bileti sonradan bulan kullanıcı da koyabilsin. */
    const ekliMi = durum.ekler.has(kayitId)
    el.innerHTML = `<time>${b.kayit.saat}</time><div class="duzelt-alan">
      <textarea></textarea>
      <div class="duzelt-arac">
        <button class="kaydet">${S('defter.kaydet')}</button>
        <button class="vaz">${S('defter.vazgec')}</button>
        <button class="ek-btn">${ekliMi ? S('defter.ekiKaldir') : S('arac.ek')}</button>
        <span>${S('defter.duzeltmeIz')}</span>
      </div></div>`
    const ta = el.querySelector('textarea')!
    ta.value = b.kayit.metin
    const boyla = () => {
      ta.style.height = 'auto'
      ta.style.height = ta.scrollHeight + 'px'
    }
    boyla()
    ta.focus()
    ta.addEventListener('input', boyla)
    el.querySelector<HTMLButtonElement>('.kaydet')!.onclick = async () => {
      const y = ta.value.trim()
      if (y && y !== b.kayit.metin) await depo.kayitDuzelt(kayitId, y)
      await durum.yenile()
      ciz()
    }
    el.querySelector<HTMLButtonElement>('.vaz')!.onclick = () => ciz()
    el.querySelector<HTMLButtonElement>('.ek-btn')!.onclick = async () => {
      if (ekliMi) await depo.ekSil(kayitId)
      else {
        const ek = await ekSec()
        if (!ek) return
        await depo.ekYaz({ ...ek, kayitId })
      }
      await durum.yenile()
      ciz()
    }
  }

  /**
   * En son yazılan kaydın metni — soruya dayanak olan tek şey.
   * Kriz işaretliyse yok sayılıyor: o kayıt hiçbir yere gitmez.
   */
  const sonKayitMetni = (): string | null => {
    const gun = durum.gunler[durum.gunler.length - 1]
    const k = gun?.kayitlar[gun.kayitlar.length - 1]
    if (!k || krizIsareti(k.metin, dil()).var) return null
    return k.metin
  }

  /* ── bağlantılar ───────────────────────────────────────── */
  $('#soruYazdan').onclick = async () => {
    const metin = sonKayitMetni()
    if (!metin || !model) return
    const d = $<HTMLButtonElement>('#soruYazdan')
    d.disabled = true
    const eski = d.textContent
    d.textContent = S('arac.soruYaziliyor')
    try {
      const soru = await model.soruSor(metin)
      if (soru) {
        durum.aktifSoru = soru
        ciz()
        $<HTMLTextAreaElement>('#kalem')?.focus()
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : S('model.soruHata'))
    } finally {
      d.disabled = false
      d.textContent = eski
    }
  }
  /* Adım serim kadar: iki sayfalı kipte tek sayfa atlamak yaprağı değil
     defteri yarım kaydırırdı. */
  $('#geri').onclick = () => sayfayaGit(durum.aktifSayfa - durum.sayfaBasi)
  $('#ileri').onclick = () => sayfayaGit(durum.aktifSayfa + durum.sayfaBasi)
  $('#bugune').onclick = () => sayfayaGit(durum.sonSayfa)
  $('#soruIste').onclick = async () => {
    await durum.baskaSoruIste()
    ciz()
    $<HTMLTextAreaElement>('#kalem')?.focus()
  }
  $('#ekIlistir').onclick = async () => {
    const ek = await ekSec()
    if (!ek) return
    bekleyenEk = ek
    ciz()
    $<HTMLTextAreaElement>('#kalem')?.focus()
  }
  $('#birak').onclick = () => void birak()
  $('#birak').innerHTML = S('defter.birakKisayol', {
    k: (/Mac|iPhone|iPad/.test(navigator.userAgent) ? '\u2318' : 'Ctrl') + '\u23CE',
  })

  addEventListener('keydown', (e) => {
    if ($('#kitaplik').classList.contains('acik') || $('#yak').classList.contains('acik')) return
    const a = document.activeElement
    if (a && ['TEXTAREA', 'INPUT'].includes(a.tagName)) return
    if (e.key === 'ArrowLeft') sayfayaGit(durum.aktifSayfa - durum.sayfaBasi)
    if (e.key === 'ArrowRight') sayfayaGit(durum.aktifSayfa + durum.sayfaBasi)
  })

  let dx0: number | null = null
  let dy0 = 0
  $('#kagit-kap').addEventListener('touchstart', (e) => {
    dx0 = e.touches[0]!.clientX
    dy0 = e.touches[0]!.clientY
  }, { passive: true })
  $('#kagit-kap').addEventListener('touchend', (e) => {
    if (dx0 === null) return
    const dx = e.changedTouches[0]!.clientX - dx0
    const dy = e.changedTouches[0]!.clientY - dy0
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6)
      sayfayaGit(durum.aktifSayfa + (dx < 0 ? 1 : -1))
    dx0 = null
  }, { passive: true })

  for (const olay of ['pointermove', 'pointerdown'] as const)
    addEventListener(olay, odakBirak, { passive: true })

  dikteyiBagla()

  return { ciz, sayfayaGit }
}

/* ── sesli yazma ─────────────────────────────────────────── */
interface TanimaOlayi { resultIndex: number; results: { 0: { transcript: string } }[] }
interface Tanima {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: TanimaOlayi) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}
type TanimaKurucu = new () => Tanima

function dikteyiBagla(): void {
  const p = window as unknown as { SpeechRecognition?: TanimaKurucu; webkitSpeechRecognition?: TanimaKurucu }
  const SR = p.SpeechRecognition ?? p.webkitSpeechRecognition
  let tanima: Tanima | null = null
  let acik = false
  $('#dikte').onclick = () => {
    const kalem = $<HTMLTextAreaElement>('#kalem')
    if (!kalem) return
    if (!SR) {
      $('#dikte').textContent = S('defter.dikteYok')
      setTimeout(() => ($('#dikte').textContent = S('arac.dikte')), 2200)
      return
    }
    if (acik) return tanima?.stop()
    tanima = new SR()
    tanima.lang = S('defter.dikteDili')
    tanima.continuous = true
    tanima.interimResults = true
    const bas0 = kalem.value
    tanima.onresult = (e: TanimaOlayi) => {
      let s = ''
      for (let i = e.resultIndex; i < e.results.length; i++) s += e.results[i]![0].transcript
      kalem.value = (bas0 ? bas0 + ' ' : '') + s
      kalem.dispatchEvent(new Event('input'))
    }
    const kapat = () => {
      acik = false
      $('#dikte').classList.remove('acik')
      $('#dikte').textContent = 'sesli yaz'
    }
    tanima.onend = kapat
    tanima.onerror = kapat
    tanima.start()
    acik = true
    $('#dikte').classList.add('acik')
    $('#dikte').textContent = 'dinliyor…'
  }
}
