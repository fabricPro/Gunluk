import type { DefterBilgi } from '../cekirdek/tipler.js'
import { romen, tamTarih } from '../cekirdek/tr.js'
import type { Durum } from '../durum.js'
import type { Depo } from '../veri/depo.js'
import { KAPAKLAR, VARSAYILAN_KAPAK } from './kapaklar.js'
import { $, $$, kacir } from './ortak.js'
import { markdownIndir } from './disaAktarma.js'

/** Bir rafa sığan defter sayısı — üstü sonraki rafa taşar. */
const RAF_KAPASITE = 8

/**
 * Kitaplık: defterler raflarda dik durur, sırtları görünür.
 *
 * Kullanıcı tek deftere bağlı değil; ad verip kapak seçerek yenisini açar,
 * rafta sürükleyerek kendi düzenini kurar. Aynı adla açılan defter o adın
 * bir sonraki cildi olur (KARARLAR.md · K-016).
 */
export function kitapligiBagla(
  durum: Durum,
  depo: Depo,
  defterAcildi: () => void,
): { ac: () => Promise<void> } {
  let defterler: DefterBilgi[] = []
  let secilenKapak = VARSAYILAN_KAPAK
  /* Defterin ölçüsü kullanıcıya ait: kısa bir defter de olur, uzun da. */
  const SINIRLAR = [20, 45, 90, 180]
  let secilenSinir = 45

  const kapat = () => $('#kitaplik').classList.remove('acik')

  const ac = async (): Promise<void> => {
    defterler = await depo.defterler()
    ciz()
    $('#kitaplik').classList.add('acik')
  }

  /* ── çizim ───────────────────────────────────────────────── */

  const sirtGenislik = (d: DefterBilgi): number =>
    /* Sırtın kalınlığı içindeki kayıt sayısına göre — dolu defter kalın. */
    Math.round(26 + Math.min(d.kayitSayisi, 400) / 400 * 26)

  const sirtHtml = (d: DefterBilgi): string => `
    <div class="sirt k-${kacir(d.kapak)}${d.id === durum.aktifDefter?.id ? ' aktif' : ''}"
      data-id="${d.id}" style="width:${sirtGenislik(d)}px" title="${kacir(d.ad)}">
      ${d.kapandi ? '<span class="kapali-im"></span>' : ''}
      <span class="ad">${kacir(d.ad)}</span>
      <span class="cilt">${romen(d.cilt)}</span>
    </div>`

  const ciz = (): void => {
    const toplamKayit = defterler.reduce((n, d) => n + d.kayitSayisi, 0)
    $('#kitAlt').textContent =
      `${defterler.length} defter · ${toplamKayit} kayıt`

    /* Raflar: kullanıcının verdiği raf numarasına göre gruplanır. */
    const rafSayisi = Math.max(
      1,
      ...defterler.map((d) => d.raf + 1),
      Math.ceil((defterler.length + 1) / RAF_KAPASITE),
    )
    let h = ''
    for (let r = 0; r < rafSayisi; r++) {
      const raftakiler = defterler.filter((d) => d.raf === r).sort((a, b) => a.sira - b.sira)
      h += `<div class="raf"><div class="raf-et">raf ${r + 1}</div>
        <div class="raf-tahta" data-raf="${r}">
          ${raftakiler.map(sirtHtml).join('')}
          ${r === rafSayisi - 1 ? '<button class="yeni-sirt" id="yeniSirt" title="yeni defter">+</button>' : ''}
        </div></div>`
    }
    if (!defterler.length)
      h += `<div class="kit-bos">Kitaplığın boş. Bir defter aç, adını ver, kapağını seç.</div>`
    else
      /* Basılı tutmak keşfedilmez; bir satır söylemek yeter. */
      h += `<div class="kit-ipucu">sırtı sürükleyerek diz · basılı tutunca defterin kartı açılır</div>`
    $('#raflar').innerHTML = h

    for (const el of $$('#raflar .sirt'))
      el.onclick = () => {
        if (surukleniyor) return
        void defteriSec(el.dataset.id!)
      }
    const yeni = document.getElementById('yeniSirt')
    if (yeni) yeni.onclick = () => yeniDefterAc()
    surukleyiBagla()
  }

  const defteriSec = async (id: string): Promise<void> => {
    await durum.defteriAc(id)
    kapat()
    defterAcildi()
  }

  /* ── defter kartı ve silme (K-025) ───────────────────────── */

  /**
   * Silme onayı defterin içindekiyle ölçülüyor.
   *
   * Deneme için açılıp bırakılmış boş bir defterle on yıllık bir defter
   * aynı soruyu hak etmiyor. Boş defter tek onayla gidiyor — yoksa raf
   * denemelerle dolar ve kullanıcı temizleyemez. Dolu defter ancak ADI
   * YAZILARAK gidiyor: "evet" demek refleks, bir ad yazmak karar.
   */
  const kartiAc = async (id: string): Promise<void> => {
    const d = defterler.find((x) => x.id === id)
    if (!d) return
    const oz = await depo.defterOzeti(id)
    const bos = oz.kayit === 0

    $('#dkAd').textContent = d.ad + (d.cilt > 1 ? ` · Cilt ${romen(d.cilt)}` : '')
    $('#dkOzet').innerHTML = bos
      ? 'Bu defter boş — içinde hiç kayıt yok.'
      : `İçinde <b>${oz.kayit} kayıt</b>, <b>${oz.gun} gün</b>` +
        (oz.kenar ? `, <b>${oz.kenar} kenar notu</b>` : '') +
        (oz.ek ? `, <b>${oz.ek} ek</b>` : '') +
        (oz.ilk && oz.son
          ? oz.ilk === oz.son
            ? `.<br>${tamTarih(oz.ilk)} günü.`
            : `.<br>${tamTarih(oz.ilk)} ile ${tamTarih(oz.son)} arası.`
          : '.')
    $('#dkUyari').textContent = bos
      ? ''
      : 'Bu geri alınamaz. Silmeden önce yedek almak istersen aşağıdan çıkarabilirsin.'

    const onay = $<HTMLInputElement>('#dkOnay')
    const sil = $<HTMLButtonElement>('#dkSil')
    onay.hidden = bos
    onay.value = ''
    onay.placeholder = d.ad
    $('#dkAktar').hidden = bos
    sil.textContent = bos ? 'bu defteri sil' : 'sil'
    sil.disabled = !bos

    if (!bos) {
      /* Tam ad yazılana kadar düğme kapalı. */
      onay.oninput = () => {
        sil.disabled = onay.value.trim().toLocaleLowerCase('tr') !== d.ad.toLocaleLowerCase('tr')
      }
    }

    $<HTMLButtonElement>('#dkAktar').onclick = () => void markdownIndir(depo, id)
    sil.onclick = async () => {
      if (sil.disabled) return
      await depo.defterSil(id)
      $('#defterKarti').classList.remove('acik')
      defterler = await depo.defterler()
      const sonraki = defterler[0]
      if (sonraki) await durum.defteriAc(sonraki.id)
      else await durum.yenile()
      ciz()
      defterAcildi()
    }
    $('#defterKarti').classList.add('acik')
    if (!bos) setTimeout(() => onay.focus(), 60)
  }

  const kartiKapat = () => $('#defterKarti').classList.remove('acik')

  /* ── sürükleyerek dizme ──────────────────────────────────── */

  /*
   * Pointer olaylarıyla — HTML5 sürükle-bırak dokunmatikte çalışmıyor ve
   * bu ürün telefon-öncelikli (K-007). Aynı kod fare, kalem ve parmakla
   * çalışıyor.
   */
  let surukleniyor = false

  /** Tıklama mı sürükleme mi: bu eşiği aşan hareket sürüklemedir. */
  const ESIK = 6

  function surukleyiBagla(): void {
    for (const el of $$('#raflar .sirt')) el.onpointerdown = (e) => basla(el, e)
  }

  /** Basılı tutma süresi — bunu aşan ve kıpırdamayan basış kartı açar. */
  const BASILI_TUT = 520

  function basla(el: HTMLElement, e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const x0 = e.clientX
    const y0 = e.clientY
    let basladi = false

    /*
     * Basılı tutunca defter kartı. Sırtlar dar; her birine ayrı bir silme
     * düğmesi koymak rafı arayüze çevirirdi. Basılı tutmak telefonun kendi
     * dili ve sürükleme eşiğiyle çakışmıyor: kıpırdarsan sürükleme, durursan
     * kart (K-025).
     */
    let bekleyen: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      bekleyen = undefined
      if (basladi) return
      surukleniyor = true
      void kartiAc(el.dataset.id!)
    }, BASILI_TUT)
    const zamaniDur = () => {
      if (bekleyen !== undefined) clearTimeout(bekleyen)
      bekleyen = undefined
    }

    /*
     * Dinleyiciler window'da, pointer yakalama yok.
     *
     * Yakalama denendi ve çalışmadı: sürükleme sırasında sırtı DOM'da
     * taşımak (insertBefore) öğeyi bir an için ağaçtan çıkarıyor, bu da
     * yakalamayı düşürüyor; ilk taşımadan sonra hareket olayları kesiliyordu.
     * window'da dinlemek DOM taşımalarından etkilenmiyor.
     */
    const hareket = (m: PointerEvent) => {
      if (!basladi) {
        if (Math.abs(m.clientX - x0) < ESIK && Math.abs(m.clientY - y0) < ESIK) return
        zamaniDur()
        basladi = true
        surukleniyor = true
        el.classList.add('suruklenen')
      }
      m.preventDefault()
      yerlestir(el, m.clientX, m.clientY)
    }

    const bitir = () => {
      zamaniDur()
      window.removeEventListener('pointermove', hareket)
      window.removeEventListener('pointerup', bitir)
      window.removeEventListener('pointercancel', bitir)
      if (!basladi) {
        /* Uzun basış kartı açtıysa bayrak burada düşer; yoksa takılı kalır
           ve sonraki tıklamalar defteri açmaz. */
        setTimeout(() => (surukleniyor = false), 0)
        return
      }
      el.classList.remove('suruklenen')
      for (const t of $$('#raflar .raf-tahta')) t.classList.remove('hedef')
      void diziliYaz()
      /* Bırakma anındaki tıklama defteri açmasın. */
      setTimeout(() => (surukleniyor = false), 0)
    }

    window.addEventListener('pointermove', hareket, { passive: false })
    window.addEventListener('pointerup', bitir)
    window.addEventListener('pointercancel', bitir)
  }

  /** Sürüklenen sırtı imlecin altındaki rafa ve komşuya göre yerleştirir. */
  function yerlestir(el: HTMLElement, x: number, y: number): void {
    const tahtalar = $$('#raflar .raf-tahta')
    let hedef: HTMLElement | null = null
    for (const t of tahtalar) {
      const r = t.getBoundingClientRect()
      if (y >= r.top && y <= r.bottom) hedef = t
      t.classList.remove('hedef')
    }
    if (!hedef) return
    hedef.classList.add('hedef')

    const komsular = [...hedef.querySelectorAll<HTMLElement>('.sirt')].filter((k) => k !== el)
    let onceki: HTMLElement | null = null
    for (const k of komsular) {
      const r = k.getBoundingClientRect()
      if (x > r.left + r.width / 2) onceki = k
    }
    const nereye = onceki ? onceki.nextSibling : hedef.firstElementChild
    /* Zaten doğru yerdeyse dokunma: her taşıma yeniden çizim maliyeti. */
    if (nereye === el || (el.parentElement === hedef && el.nextSibling === nereye)) return
    hedef.insertBefore(el, nereye)
    /* Yeni defter yuvası her zaman en sonda kalsın. */
    const yeniSirtDugme = hedef.querySelector('.yeni-sirt')
    if (yeniSirtDugme) hedef.appendChild(yeniSirtDugme)
  }

  /** Ekrandaki diziliş neyse onu kaydeder. */
  const diziliYaz = async (): Promise<void> => {
    const yeniDizi: { id: string; raf: number; sira: number }[] = []
    for (const tahta of $$('#raflar .raf-tahta')) {
      const r = Number(tahta.dataset.raf)
      ;[...tahta.querySelectorAll<HTMLElement>('.sirt')].forEach((el, i) => {
        yeniDizi.push({ id: el.dataset.id!, raf: r, sira: i })
      })
    }
    await depo.rafiDiz(yeniDizi)
    defterler = await depo.defterler()
  }

  /* ── yeni defter ─────────────────────────────────────────── */

  const yeniDefterAc = (): void => {
    secilenKapak = VARSAYILAN_KAPAK
    const ad = $<HTMLInputElement>('#ydAd')
    ad.value = ''
    $('#ydUyari').textContent = ''
    $('#ydKapaklar').innerHTML = KAPAKLAR.map(
      (k) =>
        `<button class="yd-kapak k-${k.anahtar}" data-kapak="${k.anahtar}"
          title="${kacir(k.ad)}" aria-pressed="${k.anahtar === secilenKapak}"></button>`,
    ).join('')
    for (const b of $$<HTMLButtonElement>('#ydKapaklar .yd-kapak'))
      b.onclick = () => {
        secilenKapak = b.dataset.kapak!
        for (const x of $$('#ydKapaklar .yd-kapak'))
          x.setAttribute('aria-pressed', String(x === b))
      }
    secilenSinir = 45
    $('#ydSinirlar').innerHTML = SINIRLAR.map(
      (n) =>
        `<button data-sinir="${n}" aria-pressed="${n === secilenSinir}">${n} sayfa</button>`,
    ).join('')
    for (const b of $$<HTMLButtonElement>('#ydSinirlar button'))
      b.onclick = () => {
        secilenSinir = Number(b.dataset.sinir)
        for (const x of $$('#ydSinirlar button'))
          x.setAttribute('aria-pressed', String(x === b))
      }
    $('#yeniDefter').classList.add('acik')
    setTimeout(() => ad.focus(), 60)
  }

  const uyariGuncelle = async (): Promise<void> => {
    const ad = $<HTMLInputElement>('#ydAd').value.trim()
    if (!ad) {
      $('#ydUyari').textContent = ''
      return
    }
    const cilt = await depo.siradakiCilt(ad)
    $('#ydUyari').textContent =
      cilt > 1 ? `Bu adda bir defterin var — yenisi Cilt ${romen(cilt)} olarak açılacak.` : ''
  }

  const yeniyiKaydet = async (): Promise<void> => {
    const ad = $<HTMLInputElement>('#ydAd').value.trim()
    if (!ad) return
    const d = await depo.defterAc(ad, secilenKapak, secilenSinir)
    $('#yeniDefter').classList.remove('acik')
    defterler = await depo.defterler()
    await defteriSec(d.id)
  }

  $('#ydAd').addEventListener('input', () => void uyariGuncelle())
  $('#ydAd').addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') void yeniyiKaydet()
    if ((e as KeyboardEvent).key === 'Escape') $('#yeniDefter').classList.remove('acik')
  })
  $('#ydAc').onclick = () => void yeniyiKaydet()
  $('#ydVaz').onclick = () => $('#yeniDefter').classList.remove('acik')
  $('#yeniDefter').onclick = (e) => {
    if ((e.target as HTMLElement).id === 'yeniDefter')
      $('#yeniDefter').classList.remove('acik')
  }
  $('#dkVaz').onclick = kartiKapat
  $('#defterKarti').onclick = (e) => {
    if ((e.target as HTMLElement).id === 'defterKarti') kartiKapat()
  }
  $('#kitKapat').onclick = kapat

  return { ac }
}
