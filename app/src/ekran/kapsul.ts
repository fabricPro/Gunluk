import { gunFark, iso, tamTarih } from '../cekirdek/tr.js'
import type { Depo } from '../veri/depo.js'
import { $, $$, bugun, kacir } from './ortak.js'

/**
 * Zaman kapsülü: kendine mektup. Açılış gününe kadar mühürlü — kullanıcı da
 * açamaz. Açıldığında cevap yazılır; mektup ve cevabı yan yana durur.
 */
export function kapsuleBagla(depo: Depo): { ciz: () => Promise<void> } {
  let secilenAy: number | null = 3
  let secilenGun: number | null = null
  let ozelGun: string | null = null

  const dugmeler = $$<HTMLButtonElement>('.kap-alt button[data-ay],.kap-alt button[data-gun]')

  const hedefTarih = (): string => {
    if (ozelGun) return ozelGun
    const d = new Date(bugun() + 'T12:00')
    if (secilenGun) d.setDate(d.getDate() + secilenGun)
    else if (secilenAy) d.setMonth(d.getMonth() + secilenAy)
    return iso(d)
  }

  const uyariGuncelle = (): void => {
    const h = hedefTarih()
    const f = gunFark(bugun(), h)
    $('#kapUyari').textContent =
      f > 0
        ? `${tamTarih(h)} günü açılacak — ${f} gün sonra. O güne kadar sen de açamazsın.`
        : 'Geçmiş bir tarih seçilemez.'
  }

  for (const b of dugmeler)
    b.onclick = () => {
      secilenAy = b.dataset.ay !== undefined ? Number(b.dataset.ay) : null
      secilenGun = b.dataset.gun !== undefined ? Number(b.dataset.gun) : null
      ozelGun = null
      $<HTMLInputElement>('#ozelTarih').value = ''
      for (const x of dugmeler) x.classList.toggle('secili', x === b)
      uyariGuncelle()
    }

  $('#ozelTarih').addEventListener('change', (e) => {
    ozelGun = (e.target as HTMLInputElement).value || null
    for (const x of dugmeler) x.classList.remove('secili')
    uyariGuncelle()
  })

  const ciz = async (): Promise<void> => {
    const kapsuller = await depo.kapsuller()
    $('#mektuplar').innerHTML = kapsuller
      .map((m) => {
        if (m.acilma > bugun()) {
          const kalan = gunFark(bugun(), m.acilma)
          const yil = Math.floor(kalan / 365)
          return `<div class="mektup muhurlu">
            <div class="m-et">mühürlü · ${tamTarih(m.yazilma)} tarihinde yazıldı</div>
            <div class="m-muhur">Bu mektubu ${tamTarih(m.acilma)} gününe kadar sen bile açamazsın.</div>
            <div class="m-sayac">${kalan} gün kaldı${yil > 0 ? ` · yaklaşık ${yil} yıl` : ''}</div></div>`
        }
        return `<div class="mektup acildi">
          <div class="m-et">açıldı · ${tamTarih(m.yazilma)} → ${tamTarih(m.acilma)} · ${gunFark(m.yazilma, m.acilma)} gün beklendi</div>
          <div class="m-govde">${kacir(m.metin)}</div>
          ${
            m.cevap
              ? `<div class="m-cevap"><div class="m-et">cevabın · ${tamTarih(m.cevapTarihi!)}</div>
                  <div class="m-govde">${kacir(m.cevap)}</div></div>`
              : `<button class="m-cevap-ac" data-id="${m.id}">bu mektuba cevap yaz</button>
                 <div class="m-cevapla" id="cev${m.id}" style="display:none">
                   <textarea placeholder="o gün yazan bana…"></textarea>
                   <button data-gonder="${m.id}">cevabı ekle</button></div>`
          }</div>`
      })
      .join('')

    for (const b of $$<HTMLButtonElement>('#mektuplar .m-cevap-ac'))
      b.onclick = () => {
        const k = document.getElementById('cev' + b.dataset.id)!
        k.style.display = 'block'
        b.style.display = 'none'
        k.querySelector('textarea')!.focus()
      }
    for (const b of $$<HTMLButtonElement>('#mektuplar [data-gonder]'))
      b.onclick = async () => {
        const k = document.getElementById('cev' + b.dataset.gonder)!
        const y = k.querySelector('textarea')!.value.trim()
        if (!y) return
        await depo.kapsuleCevapYaz(b.dataset.gonder!, y, bugun())
        await ciz()
      }
  }

  $('#muhurle').onclick = async () => {
    const alan = $<HTMLTextAreaElement>('#mektupYazi')
    const m = alan.value.trim()
    if (!m) return
    const h = hedefTarih()
    if (gunFark(bugun(), h) <= 0) return
    await depo.kapsulEkle(bugun(), h, m)
    alan.value = ''
    await ciz()
    $('#mektuplar').scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const yarin = new Date(bugun() + 'T12:00')
  yarin.setDate(yarin.getDate() + 1)
  $<HTMLInputElement>('#ozelTarih').min = iso(yarin)
  uyariGuncelle()

  return { ciz }
}
