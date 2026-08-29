import { romen } from '../cekirdek/tr.js'
import { CILT_SAYFA } from '../cekirdek/sayfa.js'
import type { Durum } from '../durum.js'
import { $ } from './ortak.js'

/**
 * Defter kapanır, kapak görünür. Gerçek kilit — PIN ve biyometri —
 * Faz 2.7'de; bu yalnızca görsel kapanma.
 */
export function kilidiBagla(durum: Durum): void {
  $('#kilitle').onclick = () => {
    document.body.classList.add('kapandi')
    setTimeout(() => {
      $('#kilit').classList.add('acik')
      document.body.classList.remove('kapandi')
      const c = durum.ciltler[durum.ciltler.length - 1]
      $('#kapakCilt').textContent = c ? (c.ad ?? 'Cilt ' + romen(c.no)) : 'Cilt I'
      $('#kapakAlt').textContent = `${c?.sayfa ?? 0}/${CILT_SAYFA} sayfa`
    }, 470)
  }
  $('#kapak').onclick = () => $('#kilit').classList.remove('acik')
}
