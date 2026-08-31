import { romen } from '../cekirdek/tr.js'
import type { Durum } from '../durum.js'
import type { Depo } from '../veri/depo.js'
import { $, $$, S, kacir } from './ortak.js'

/** Başlıklı sayfaların ciltlere göre listesi. */
export function fihristiBagla(
  durum: Durum,
  depo: Depo,
  sayfayaGit: (i: number, anim?: boolean) => void,
  toreniAc: () => void,
): void {
  const ciz = (): void => {
    $('#fihAlt').textContent =
      S('fih.ozet', {
        b: durum.basliklar.size,
        s: durum.sayfalar.length,
        c: durum.ciltler.length,
      })
    let h = ''
    for (const c of durum.ciltler) {
      const syf = durum.sayfalar.filter((x) => x.cilt === c.no && durum.baslik(x))
      h += `<div class="fih-cilt">Cilt ${romen(c.no)}${c.ad ? ' — ' + kacir(c.ad) : ''}
        <span>${S('fih.ciltSayfa', { n: c.sayfa })}${c.kapali ? S('fih.kapali') : ''}</span>
        <button data-cilt="${c.no}">${c.ad ? S('fih.adDegistir') : S('fih.adVer')}</button></div>`
      if (!syf.length)
        h += `<div class="fih-bos">${S('fih.ciltBos')}</div>`
      for (const s of syf)
        h += `<div class="fih-sat" data-i="${s.no - 1}">
          <span class="ad">${kacir(durum.baslik(s)!)}</span><span class="nokta"></span>
          <span class="no">s. ${s.ciltSayfa}</span></div>`
    }
    if (!durum.ciltler.length)
      h = `<div class="fih-bos">${S('fih.bos')}</div>`
    $('#fihListe').innerHTML = h

    for (const el of $$('#fihListe .fih-sat'))
      el.onclick = () => {
        $('#fihrist').classList.remove('acik')
        sayfayaGit(Number(el.dataset.i), false)
      }
    for (const b of $$<HTMLButtonElement>('#fihListe [data-cilt]'))
      b.onclick = async () => {
        const defter = durum.aktifDefter
        if (!defter) return
        const ad = prompt('Bu deftere ne ad vermek istersin?', defter.ad)
        if (ad === null) return
        await depo.defterAdiYaz(defter.id, ad)
        await durum.yenile()
        ciz()
      }
  }

  $('#fihristBtn').onclick = () => {
    ciz()
    /* Kapanmış defter zaten kapalı; boş defteri kapatmanın anlamı yok. */
    const bitir = $('#defteriBitir')
    bitir.style.display = durum.kapali || durum.bos ? 'none' : ''
    bitir.onclick = () => {
      $('#fihrist').classList.remove('acik')
      toreniAc()
    }
    $('#fihrist').classList.add('acik')
  }
  $('#fihKapat').onclick = () => $('#fihrist').classList.remove('acik')
  $('#fihrist').onclick = (e) => {
    if ((e.target as HTMLElement).id === 'fihrist') $('#fihrist').classList.remove('acik')
  }
}
