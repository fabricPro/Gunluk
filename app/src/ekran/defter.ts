import { SAYFA_HACIM } from '../cekirdek/sayfa.js'
import type { Sayfa } from '../cekirdek/tipler.js'
import { romen, saatSayi, tamTarih } from '../cekirdek/tr.js'
import type { Durum } from '../durum.js'
import type { Depo } from '../veri/depo.js'
import { $, $$, bugun, isikAyarla, kacir, odakBirak, odakVer, sayfaIsigiBagla, suanSaat } from './ortak.js'

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
    return `<div id="yazma"><div class="bosluk"></div><textarea id="kalem" placeholder="yaz…"></textarea></div>`
  }

  /* Faz 1.2'nin ekranı değil — yalnızca sıfır kayıtta çıplak kalmasın. */
  const bosSayfaHtml = (): string => `<div class="kagit"><div class="kagit-ic">
      <div class="bos-sayfa">
        <p>Defter boş. İlk sayfa aşağıda başlıyor.</p>
        <small>yaz, sonra bırak</small>
      </div>
      ${altHtml()}
    </div><div class="kagit-alt">1</div></div>`

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
        const duzeltilebilir = bas && !durum.kapali
        const iz = bas && b.kayit.duzenlendi ? ' <span class="duz">· düzeltildi</span>' : ''
        ic += `<div class="satir${bas ? '' : ' devam'}" data-id="${o.kayitId}">
          <time>${bas ? b.kayit.saat : ''}</time><p>${vurgu(o.metin)}${o.sonParca ? iz : ''}</p>
          ${duzeltilebilir ? '<button class="kalem-btn">düzelt</button>' : ''}</div>`
      } else {
        ic += `<div class="kenar">${kacir(o.metin)}<span>kenar notu · ${kacir(o.tarih)}</span></div>`
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
    $('#birak').style.display = son ? '' : 'none'
    $('#dikte').style.display = son ? '' : 'none'
    $('#bugune').style.display = son ? 'none' : ''

    kalemBagla()
    baslikBagla()
    for (const b of $$('#kagit-kap .kalem-btn'))
      b.onclick = (e) => {
        const el = (e.target as HTMLElement).closest<HTMLElement>('.satir')
        if (el?.dataset.id) duzelt(el.dataset.id)
      }
    const torenBtn = document.getElementById('torenAc')
    if (torenBtn) torenBtn.onclick = () => toreniAc()
    const ozetBtn = document.getElementById('ozetGor')
    if (ozetBtn) ozetBtn.onclick = () => toreniAc()

    kesitCiz()
    sayfaIsik()
  }

  const sayfayaGit = (i: number, anim = true): void => {
    if (i < 0 || i > durum.sonSayfa || i === durum.aktifSayfa) return
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
    kalem.addEventListener('input', () => {
      odakVer()
      kalem.style.height = 'auto'
      kalem.style.height = kalem.scrollHeight + 'px'
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
    await depo.kayitEkle({
      tarih: bugun(),
      saat: suanSaat(),
      metin: m,
      temalar: durum.temalariCikar(m),
    })
    kalem.value = ''
    await durum.yenile()
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
    el.innerHTML = `<time>${b.kayit.saat}</time><div class="duzelt-alan">
      <textarea></textarea>
      <div class="duzelt-arac">
        <button class="kaydet">kaydet</button>
        <button class="vaz">vazgeç</button>
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
  }

  /* ── bağlantılar ───────────────────────────────────────── */
  $('#geri').onclick = () => sayfayaGit(durum.aktifSayfa - 1)
  $('#ileri').onclick = () => sayfayaGit(durum.aktifSayfa + 1)
  $('#bugune').onclick = () => sayfayaGit(durum.sonSayfa)
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
