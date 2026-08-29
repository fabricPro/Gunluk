import { romen } from '../cekirdek/tr.js'
import type { Durum } from '../durum.js'
import type { Depo } from '../veri/depo.js'
import { $, $$, kacir } from './ortak.js'

/** Başlıklı sayfaların ciltlere göre listesi. */
export function fihristiBagla(
  durum: Durum,
  depo: Depo,
  sayfayaGit: (i: number, anim?: boolean) => void,
): void {
  const ciz = (): void => {
    $('#fihAlt').textContent =
      `${durum.basliklar.size} başlıklı sayfa · ${durum.sayfalar.length} sayfa · ${durum.ciltler.length} cilt`
    let h = ''
    for (const c of durum.ciltler) {
      const syf = durum.sayfalar.filter((x) => x.cilt === c.no && durum.baslik(x))
      h += `<div class="fih-cilt">Cilt ${romen(c.no)}${c.ad ? ' — ' + kacir(c.ad) : ''}
        <span>${c.sayfa} sayfa${c.kapali ? ' · kapalı' : ''}</span>
        <button data-cilt="${c.no}">${c.ad ? 'adı değiştir' : 'cilde ad ver'}</button></div>`
      if (!syf.length)
        h += `<div class="fih-bos">Bu ciltte başlık yok. Bir sayfanın üstüne dokunup ad verebilirsin.</div>`
      for (const s of syf)
        h += `<div class="fih-sat" data-i="${s.no - 1}">
          <span class="ad">${kacir(durum.baslik(s)!)}</span><span class="nokta"></span>
          <span class="no">s. ${s.ciltSayfa}</span></div>`
    }
    if (!durum.ciltler.length)
      h = `<div class="fih-bos">Defter henüz boş. İlk sayfayı yazdığında burada görünecek.</div>`
    $('#fihListe').innerHTML = h

    for (const el of $$('#fihListe .fih-sat'))
      el.onclick = () => {
        $('#fihrist').classList.remove('acik')
        sayfayaGit(Number(el.dataset.i), false)
      }
    for (const b of $$<HTMLButtonElement>('#fihListe [data-cilt]'))
      b.onclick = async () => {
        const c = Number(b.dataset.cilt)
        const ad = prompt('Bu cilde ne ad vermek istersin?', durum.ciltAdlari.get(c) ?? '')
        if (ad === null) return
        await depo.ciltAdiYaz(c, ad)
        await durum.yenile()
        ciz()
      }
  }

  $('#fihristBtn').onclick = () => {
    ciz()
    $('#fihrist').classList.add('acik')
  }
  $('#fihKapat').onclick = () => $('#fihrist').classList.remove('acik')
  $('#fihrist').onclick = (e) => {
    if ((e.target as HTMLElement).id === 'fihrist') $('#fihrist').classList.remove('acik')
  }
}
