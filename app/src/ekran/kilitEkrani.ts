import type { Kilit } from '../kilitAkis.js'
import { $, $$, S } from './ortak.js'

/**
 * Kilit ekranı.
 *
 * Defter kilitliyken ana anahtar bellekte olmadığı için arkada uygulama
 * yok — veritabanı bile açılmamış durumda (KARARLAR.md · K-021).
 */
export function kilitEkraniBagla(
  kilit: Kilit,
  cozuldu: (anaAnahtar: string) => Promise<void>,
): { goster: () => Promise<void>; gizle: () => void } {
  let parolaKipi = false
  let girilen = ''

  const alan = () => $<HTMLInputElement>('#kilPin')

  const noktalariCiz = (): void => {
    if (parolaKipi) {
      $('#kilNoktalar').innerHTML = ''
      return
    }
    $('#kilNoktalar').innerHTML = Array.from({ length: 6 }, (_, i) =>
      `<i class="${i < girilen.length ? 'dolu' : ''}"></i>`,
    ).join('')
  }

  const uyari = (metin: string): void => {
    $('#kilUyari').textContent = metin
  }

  const beklemeYaz = (kalan: number): void => {
    const sn = Math.ceil(kalan / 1000)
    uyari(
      sn > 90
        ? S('kil.beklemeDk', { n: Math.ceil(sn / 60) })
        : S('kil.beklemeSn', { n: sn }),
    )
  }

  const dene = async (pin: string): Promise<void> => {
    const s = await kilit.pinIle(pin)
    girilen = ''
    noktalariCiz()
    alan().value = ''
    if (s.oldu) {
      uyari('')
      await cozuldu(s.anaAnahtar!)
      return
    }
    if (s.sebep === 'bekleme') return beklemeYaz(s.kalan ?? 0)
    if (s.kalan) return beklemeYaz(s.kalan)
    uyari(S('kil.yanlis'))
  }

  alan().addEventListener('input', () => {
    girilen = alan().value
    if (!parolaKipi) {
      girilen = girilen.replace(/\D/g, '').slice(0, 6)
      alan().value = girilen
      noktalariCiz()
      /* Altı hane dolunca kendiliğinden dener — ayrıca düğmeye gerek yok. */
      if (girilen.length === 6) void dene(girilen)
    }
  })

  alan().addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter' && alan().value) void dene(alan().value)
  })

  /* PIN kipinde alan görünmez; noktalara dokunmak klavyeyi geri getirsin. */
  $('#kilNoktalar').onclick = () => alan().focus()
  $('.kil-kapak').onclick = () => alan().focus()

  $('#kilParola').onclick = () => {
    parolaKipi = !parolaKipi
    $('#kilitEkrani').classList.toggle('parola', parolaKipi)
    alan().value = ''
    girilen = ''
    alan().type = parolaKipi ? 'password' : 'text'
    alan().setAttribute('inputmode', parolaKipi ? 'text' : 'numeric')
    $('#kilParola').textContent = parolaKipi ? 'PIN kullan' : 'parola kullan'
    noktalariCiz()
    alan().focus()
  }

  const biyometriDene = async (): Promise<void> => {
    const s = await kilit.biyometriIle()
    if (s.oldu) {
      uyari('')
      await cozuldu(s.anaAnahtar!)
    }
  }
  $('#kilBiyo').onclick = () => void biyometriDene()

  const goster = async (): Promise<void> => {
    /*
     * Çözülmüş metin DOM'da kalmasın. Kilit ekranı üstünü örtüyor ama
     * defterin içeriği ağaçta durmaya devam ederdi; kilitlemek onu da
     * silmek demek.
     */
    for (const s of ['#kagit-kap', '#kesit', '#kesit-alt', '#cevapAlan', '#gecenYil', '#mektuplar'])
      $$(s).forEach((e) => (e.innerHTML = ''))
    $('#ciltAd').textContent = ''
    $('#sayfaNo').textContent = ''
    $('#kalanYazi').textContent = ''

    girilen = ''
    alan().value = ''
    uyari('')
    noktalariCiz()
    $('#kilBiyo').style.display = kilit.biyometriAcik ? '' : 'none'
    $('#kilitEkrani').classList.add('acik')
    /* Diğer katmanlar kapalı kalsın: kilitliyken hiçbiri anlamlı değil. */
    for (const k of ['#toren', '#kitaplik', '#yeniDefter', '#fihrist', '#yak', '#ayarlar'])
      $$(k).forEach((e) => e.classList.remove('acik'))
    setTimeout(() => alan().focus(), 80)
    if (kilit.biyometriAcik) void biyometriDene()
  }

  const gizle = (): void => {
    $('#kilitEkrani').classList.remove('acik')
  }

  return { goster, gizle }
}
