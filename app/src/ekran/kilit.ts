import { $ } from './ortak.js'

/**
 * "kapat" düğmesi: defter kapanır ve kitaplık açılır (KARARLAR.md · K-016).
 *
 * Eskiden tek bir kapak gösteriliyordu; kullanıcı tek deftere bağlı olmadığı
 * için o ekranın yerini kitaplık aldı. Gerçek kilit — PIN ve biyometri —
 * Faz 2.7'de; buradaki kapanma yalnızca görsel.
 */
export function kilidiBagla(kitapligiAc: () => Promise<void>): void {
  $('#kilitle').onclick = () => {
    document.body.classList.add('kapandi')
    setTimeout(() => {
      document.body.classList.remove('kapandi')
      void kitapligiAc()
    }, 470)
  }
}
