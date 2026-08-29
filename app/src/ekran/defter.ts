import { SAYFA_HACIM } from '../cekirdek/sayfa.js'
import type { Ek, KenarNotu, Sayfa } from '../cekirdek/tipler.js'
import { ekKaynak, gorseliHazirla } from './gorsel.js'
import { resimSec } from './dosya.js'
import { iso, romen, saatSayi, tamTarih } from '../cekirdek/tr.js'
import type { Durum } from '../durum.js'
import type { Depo } from '../veri/depo.js'
import { $, $$, bugun, isikAyarla, kacir, odakBirak, odakVer, sayfaIsigiBagla, suanSaat } from './ortak.js'

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

  const vurgu = (m: string): string => {
    const g = kacir(m)
    if (!durum.aramaTerim) return g
    const kacan = durum.aramaTerim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return g.replace(new RegExp('(' + kacan + ')', 'gi'), '<mark>$1</mark>')
  }

  /**
   * Son sayfanın altı: yazma alanı, ya da defter dolduysa törene çağrı,
   * ya da defter kapandıysa sessiz bir not.
   */
  const altHtml = (): string => {
    if (durum.kapali)
      return `<div class="dolu-cagri"><p>Bu defter kapandı. Buraya bir daha yazılmaz.</p>
        <button id="ozetGor">cildin özetini gör</button></div>`
    if (durum.dolu)
      return `<div class="dolu-cagri"><p>Bu defter doldu.</p>
        <button id="torenAc">defteri kapat ya da uzat</button></div>`
    const soru = durum.aktifSoru ? `<div id="yazma-soru">${kacir(durum.aktifSoru)}</div>` : ''
    /* Bekleyen ek yalnızca bellekte — bırakılmadıkça diske değmiyor. */
    const on = bekleyenEk
      ? `<div class="ek-onizleme"><img src="${ekKaynak(bekleyenEk.tur, bekleyenEk.veri)}" alt="">
          <button id="ekKaldir">kaldır</button></div>`
      : ''
    return `${soru}<div id="yazma"><div class="bosluk"></div>` +
      `<div class="yazma-govde">${on}` +
      `<textarea id="kalem" placeholder="${soru ? 'buraya yaz…' : 'yaz…'}"></textarea></div></div>`
  }

  /*
   * Boş defterin ilk sayfası.
   *
   * "Defter boş" yazısı yalnızca kullanıcı daha hiçbir şey yapmadıysa
   * duruyor: taslak ya da bekleyen bir ek varsa iş başlamıştır, o yazının
   * söyleyeceği kalmamıştır — ve sayfanın yarısını kaplayıp yazılanı
   * aşağı itiyordu.
   */
  const bosSayfaHtml = (): string => {
    const basladi = !!taslak || !!bekleyenEk
    const not = basladi
      ? ''
      : `<div class="bos-sayfa">
        <p>Defter boş. İlk sayfa aşağıda başlıyor.</p>
        <small>yaz, sonra bırak</small>
      </div>`
    return `<div class="kagit"><div class="kagit-ic">${not}${altHtml()}
    </div><div class="kagit-alt">1</div></div>`
  }

  const sayfaHtml = (i: number): string => {
    const s = durum.sayfalar[i]
    if (!s) return bosSayfaHtml()
    const baslik = durum.baslik(s)
    let ic = `<div class="syf-baslik" data-anahtar="${s.anahtar ?? ''}">
      ${baslik ? `<h3>${kacir(baslik)}</h3>` : ''}
      <button class="ekle">${baslik ? 'başlığı değiştir' : 'başlık ekle'}</button></div>`
    for (const o of s.ogeler) {
      if (o.tip === 'gun') {
        ic += `<div class="g-bas">${o.ad}, ${tamTarih(o.tarih)}</div>`
      } else if (o.tip === 'kayit') {
        const b = durum.kayitBul(o.kayitId)
        if (!b) continue
        /* Sayfaya düşen parça yazılır, kaydın tamamı değil (K-014).
           Saat ve düzelt düğmesi yalnızca kaydın başladığı parçada. */
        const bas = o.parcaNo === 0
        /* Soru kaydın başladığı yerde, gövdesinin üstünde. */
        if (bas && b.kayit.soru) ic += `<div class="kayit-soru">${kacir(b.kayit.soru)}</div>`
        const duzeltilebilir = bas && !durum.kapali
        const iz = bas && b.kayit.duzenlendi ? ' <span class="duz">· düzeltildi</span>' : ''
        /*
         * Kenar notu düğmesi kapalı ve dolu defterde de duruyor: kapattığın
         * şey kapanır ama kenarına yazabilirsin (K-018).
         */
        const arac = bas
          ? `<div class="satir-arac">
              ${duzeltilebilir ? '<button class="kalem-btn">düzelt</button>' : ''}
              <button class="kenar-btn">kenar notu</button></div>`
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
    if (i === durum.sonSayfa) ic += altHtml()
    return `<div class="kagit"><div class="kagit-ic">${ic}</div>
      <div class="kagit-alt">${s.ciltSayfa}</div></div>`
  }

  const ciz = (): void => {
    const s: Sayfa | undefined = durum.sayfalar[durum.aktifSayfa]
    const c = s ? durum.ciltler.find((x) => x.no === s.cilt) : undefined

    /* Defterin adı önce; cilt yalnızca birden fazlaysa anlamlı (K-016). */
    const d = durum.aktifDefter
    $('#ciltAd').textContent = d
      ? d.ad + (d.cilt > 1 ? ` · Cilt ${romen(d.cilt)}` : '')
      : (c?.ad ?? 'Defter')
    $('#sayfaNo').textContent = s
      ? `sayfa ${s.no}/${durum.sayfaSiniri}${d?.kapandi ? ' · kapalı defter' : ''}`
      : `sayfa 1/${durum.sayfaSiniri}`

    const kalan = durum.sayfaSiniri - durum.sayfalar.length
    $('#kalanYazi').textContent =
      durum.aktifSayfa === durum.sonSayfa
        ? kalan > 3
          ? ''
          : kalan > 0
            ? `bu defterde ${kalan} sayfa kaldı`
            : 'bu defter doldu'
        : ''

    $('#kagit-kap').innerHTML = sayfaHtml(durum.aktifSayfa)
    $<HTMLButtonElement>('#geri').disabled = durum.aktifSayfa === 0
    $<HTMLButtonElement>('#ileri').disabled = durum.aktifSayfa >= durum.sonSayfa

    const son = durum.aktifSayfa === durum.sonSayfa
    $('#birak').style.display = son && durum.yazilabilir ? '' : 'none'
    $('#dikte').style.display = son && durum.yazilabilir ? '' : 'none'
    $('#ekIlistir').style.display = son && durum.yazilabilir ? '' : 'none'
    $('#ekIlistir').textContent = bekleyenEk ? 'başka bir şey iliştir' : 'bir şey iliştir'
    $('#soruIste').style.display = son && durum.soruIstenebilir ? '' : 'none'
    $('#soruIste').textContent = durum.aktifSoru ? 'başka bir şey sor' : 'bana bir şey sor'
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
  const kenarTarih = (t: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(t) ? tamTarih(t) : t)

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
        placeholder="bugünden bu kayda bir not düş…"></textarea>
      <div class="kenar-arac">
        <button class="kaydet">kaydet</button>
        <button class="vaz">vazgeç</button>
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
     * Aynı sayfaya "gitmek" de bir iş yapar: arşivden bir kayda tıklandığında
     * arama terimi değişmiş olabilir. Eskiden burada kayıtsız dönülüyordu ve
     * kayıt zaten açık sayfadaysa vurgu hiç görünmüyordu — kullanıcı neden
     * o kaydın geldiğini göremiyordu.
     */
    if (i === durum.aktifSayfa) {
      ciz()
      return
    }
    const yon = i > durum.aktifSayfa ? 'ileri' : 'geri'
    if (anim) {
      const eski = $('#kagit-kap .kagit')
      if (eski) {
        const kl = eski.cloneNode(true) as HTMLElement
        kl.classList.add('cevir-' + yon)
        $('#kagit-kap').appendChild(kl)
        setTimeout(() => kl.remove(), 700)
      }
    }
    durum.aktifSayfa = i
    ciz()
  }

  /* ── sayfa başlığı — kayıt kimliğine bağlı (K-005) ─────── */
  function baslikBagla(): void {
    const kap = $('#kagit-kap .syf-baslik')
    if (!kap) return
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
      h += `<div class="cilt-bas">cilt <b>${romen(c.no)}</b></div>`
      for (const s of durum.sayfalar.filter((x) => x.cilt === c.no)) {
        const w = 7 + Math.round((s.hacim / SAYFA_HACIM) * 26)
        const ad = durum.baslik(s)
        h += `<div class="syf${s.no - 1 === durum.aktifSayfa ? ' aktif' : ''}${ad ? ' baslikli' : ''}"
          data-i="${s.no - 1}" title="${kacir(ad ?? 'sayfa ' + s.ciltSayfa)}"><i style="width:${w}px"></i></div>`
      }
    }
    $('#kesit').innerHTML = h
    for (const el of $$('#kesit .syf')) el.onclick = () => sayfayaGit(Number(el.dataset.i))
    $('#kesit-alt').innerHTML =
      `${durum.sayfalar.length} sayfa<br>${durum.ciltler.length} cilt<br>${durum.kayitSayisi} kayıt`
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
    /* Kayıt ve eki tek işlemde: yarısı yazılmış bir sayfa kalmasın. */
    await depo.islem(async () => {
      const kayit = await depo.kayitEkle({
        tarih: gun,
        saat: suanSaat(),
        metin: m,
        temalar: durum.temalariCikar(m),
        soru: durum.aktifSoru,
      })
      if (ek) await depo.ekYaz({ ...ek, kayitId: kayit.id })
    })
    bekleyenEk = null
    taslak = ''
    kalem.value = ''
    await durum.yonlendirmeyiIlerlet(gun)
    await durum.yenile()
    durum.soruyuTazele(gun)
    durum.aktifSayfa = durum.sonSayfa
    ciz()
    /* Bırakınca odak yeni kalemde kalsın: kullanıcı hemen devam edebilsin. */
    const yeni = $<HTMLTextAreaElement>('#kalem')
    if (yeni) {
      yeni.focus()
      yeni.scrollIntoView({ block: 'nearest' })
    }
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
        <button class="kaydet">kaydet</button>
        <button class="vaz">vazgeç</button>
        <button class="ek-btn">${ekliMi ? 'eki kaldır' : 'bir şey iliştir'}</button>
        <span>düzeltme iz bırakır</span>
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

  /* ── bağlantılar ───────────────────────────────────────── */
  $('#geri').onclick = () => sayfayaGit(durum.aktifSayfa - 1)
  $('#ileri').onclick = () => sayfayaGit(durum.aktifSayfa + 1)
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
  $('#birak').innerHTML =
    `bırak <kbd>${/Mac|iPhone|iPad/.test(navigator.userAgent) ? '\u2318' : 'Ctrl'}\u23CE</kbd>`

  addEventListener('keydown', (e) => {
    if ($('#kitaplik').classList.contains('acik') || $('#yak').classList.contains('acik')) return
    const a = document.activeElement
    if (a && ['TEXTAREA', 'INPUT'].includes(a.tagName)) return
    if (e.key === 'ArrowLeft') sayfayaGit(durum.aktifSayfa - 1)
    if (e.key === 'ArrowRight') sayfayaGit(durum.aktifSayfa + 1)
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
      $('#dikte').textContent = 'bu tarayıcıda yok'
      setTimeout(() => ($('#dikte').textContent = 'sesli yaz'), 2200)
      return
    }
    if (acik) return tanima?.stop()
    tanima = new SR()
    tanima.lang = 'tr-TR'
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
