import type { Kilit } from '../kilitAkis.js'
import { $, $$, S } from './ortak.js'

/**
 * Kilit ekranı — iki kip.
 *
 * **`ac`**: defter kilitli. Ana anahtar bellekte olmadığı için arkada
 * uygulama yok, veritabanı bile açılmamış durumda (KARARLAR.md · K-021).
 *
 * **`kur`**: kilit hiç kurulmamış. Tarayıcıda bu ekran atlanamıyor:
 * anahtar olmadan defter diske MÜHÜRLÜ yazılamaz, yani parola belirlemek
 * "istersen" değil, şifrelemenin kendisi (KARARLAR.md · K-037). Cihazda
 * durum değişmedi — orada SQLCipher zaten devrede ve kilit isteğe bağlı.
 *
 * Kurulumda parola İKİ KEZ soruluyor. Yanlış yazılan bir parola, defteri
 * bir daha açılmamak üzere kapatır; tek yazımla geçmek kabul edilemez.
 */
const EN_AZ = 8

export type KilitKipi = 'ac' | 'kur'

export function kilitEkraniBagla(
  kilit: Kilit,
  cozuldu: (anaAnahtar: string) => Promise<void>,
): {
  goster: (kip?: KilitKipi) => Promise<void>
  gizle: () => void
  uyar: (metin: string) => void
} {
  let parolaKipi = false
  let girilen = ''
  let kip: KilitKipi = 'ac'
  /** Kurulumda ilk yazılan parola; ikincisiyle karşılaştırılıyor. */
  let ilkParola: string | null = null

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

  /** Kurulum: parolayı iki kez alır, sonra kilidi kurar. */
  const kur = async (yazilan: string): Promise<void> => {
    alan().value = ''
    if (ilkParola === null) {
      if (yazilan.length < EN_AZ) return uyari(S('kil.kurKisa', { n: EN_AZ }))
      ilkParola = yazilan
      return uyari(S('kil.kurTekrar'))
    }
    if (yazilan !== ilkParola) {
      ilkParola = null
      return uyari(S('kil.kurUymadi'))
    }
    uyari(S('kil.kurBekle'))
    const av = await kilit.kur(ilkParola)
    ilkParola = null
    uyari('')
    await cozuldu(av)
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
    if ((e as KeyboardEvent).key !== 'Enter' || !alan().value) return
    void (kip === 'kur' ? kur(alan().value) : dene(alan().value))
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
    $('#kilParola').textContent = S(parolaKipi ? 'kilit.pin' : 'kilit.parola')
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

  const goster = async (istenen: KilitKipi = 'ac'): Promise<void> => {
    kip = istenen
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
    ilkParola = null

    /* Kurulumda ekran parola kipinde açılıyor; PIN'e geçiş ve biyometri
       burada anlamsız, ikisi de gizli. */
    parolaKipi = kip === 'kur'
    $('#kilitEkrani').classList.toggle('parola', parolaKipi)
    alan().type = parolaKipi ? 'password' : 'text'
    alan().setAttribute('inputmode', parolaKipi ? 'text' : 'numeric')
    $('#kilAlt').textContent = S(kip === 'kur' ? 'kilit.kurAlt' : 'kilit.alt')
    uyari(kip === 'kur' ? S('kil.kurSor', { n: EN_AZ }) : '')
    noktalariCiz()

    $('#kilBiyo').style.display =
      kip === 'ac' && kilit.biyometriAcik ? '' : 'none'
    $('#kilParola').style.display = kip === 'kur' ? 'none' : ''
    $('#kilitEkrani').classList.add('acik')
    /* Diğer katmanlar kapalı kalsın: kilitliyken hiçbiri anlamlı değil. */
    for (const k of ['#toren', '#kitaplik', '#yeniDefter', '#fihrist', '#yak', '#ayarlar'])
      $$(k).forEach((e) => e.classList.remove('acik'))
    setTimeout(() => alan().focus(), 80)
    if (kip === 'ac' && kilit.biyometriAcik) void biyometriDene()
  }

  const gizle = (): void => {
    $('#kilitEkrani').classList.remove('acik')
  }

  return { goster, gizle, uyar: uyari }
}
