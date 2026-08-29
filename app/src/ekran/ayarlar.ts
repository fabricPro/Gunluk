import type { Kilit } from '../kilitAkis.js'
import { $, kacir } from './ortak.js'

/**
 * Ayar kağıdı. Şimdilik tek bölüm: kilit.
 * Yedekleme (Faz 2.8) buraya eklenecek.
 */
export function ayarlariBagla(
  kilit: Kilit,
  sifreli: boolean,
  mevcutAnahtar: () => string | null,
  degisti: () => void,
): { ac: () => Promise<void> } {
  const kapat = () => $('#ayarlar').classList.remove('acik')

  /** PIN sorar; iptal edilirse null. */
  const pinSor = (baslik: string): string | null => {
    const s = prompt(baslik)
    if (s === null) return null
    const temiz = s.trim()
    if (temiz.length < 4) {
      alert('En az 4 hane ya da karakter olmalı.')
      return null
    }
    return temiz
  }

  const ciz = async (): Promise<void> => {
    const kurulu = kilit.durum !== 'kurulusuz'
    const biyoVar = await kilit.biyometriVarMi()

    $('#ayKilitDurum').textContent = kurulu
      ? kilit.biyometriAcik
        ? 'Kilit açık. PIN ya da biyometriyle açılıyor.'
        : 'Kilit açık. Yalnızca PIN ile açılıyor.'
      : 'Kilit kurulu değil — defter doğrudan açılıyor.'

    const d: string[] = []
    if (!kurulu) d.push('<button class="birincil" data-eylem="kur">kilit kur</button>')
    else {
      d.push('<button data-eylem="pin">PIN değiştir</button>')
      if (biyoVar)
        d.push(
          kilit.biyometriAcik
            ? '<button data-eylem="biyoKapat">biyometriyi kapat</button>'
            : '<button data-eylem="biyoAc">biyometriyi aç</button>',
        )
      d.push('<button data-eylem="kaldir">kilidi kaldır</button>')
    }
    $('#ayKilitDugmeler').innerHTML = d.join('')

    const notlar: string[] = []
    if (!sifreli)
      notlar.push(
        'Bu tarayıcı derlemesinde veritabanı <b>şifresiz</b>. Kilit burada ' +
          'yalnızca bir ekran; koruduğu bir şey yok. Cihaz derlemesinde ' +
          'veritabanının tamamı şifreli.',
      )
    if (kilit.biyometriAcik)
      notlar.push(
        'Biyometri hızlıdır ama anahtarın açılabilir bir kopyasını cihazda ' +
          'bırakır. Yalnızca PIN istiyorsan biyometriyi kapalı bırak.',
      )
    if (kilit.durum !== 'kurulusuz')
      notlar.push(
        'PIN’i unutursan biyometri yolu açık kaldığı sürece defterine ' +
          'erişebilirsin. İkisini de kaybedersen defter açılmaz.',
      )
    $('#ayNot').innerHTML = notlar.map((n) => `<p>${n}</p>`).join('')

    for (const b of [...document.querySelectorAll<HTMLButtonElement>('#ayKilitDugmeler button')])
      b.onclick = () => void eylem(b.dataset.eylem!)
  }

  const eylem = async (ad: string): Promise<void> => {
    if (ad === 'kur') {
      const pin = pinSor('Yeni PIN (6 hane) ya da bir parola:')
      if (!pin) return
      const tekrar = prompt('Bir daha yaz:')
      if (tekrar !== pin) return void alert('İkisi aynı değil.')
      await kilit.kur(pin, mevcutAnahtar() ?? undefined)
      if (await kilit.biyometriVarMi()) {
        if (confirm('Biyometriyle de açmak ister misin?')) await kilit.biyometriKur()
      }
    } else if (ad === 'pin') {
      const eski = pinSor('Şu anki PIN:')
      if (!eski) return
      const yeni = pinSor('Yeni PIN:')
      if (!yeni) return
      if (!(await kilit.pinDegistir(eski, yeni))) return void alert('Şu anki PIN yanlış.')
    } else if (ad === 'biyoAc') {
      if (!(await kilit.biyometriKur())) alert('Bu cihazda biyometri kullanılamıyor.')
    } else if (ad === 'biyoKapat') {
      await kilit.biyometriKaldir()
    } else if (ad === 'kaldir') {
      if (!confirm('Kilit kaldırılsın mı? Defter bundan sonra doğrudan açılır.')) return
      await kilit.kaldir()
    }
    await ciz()
    degisti()
  }

  $('#ayarlarBtn').onclick = () => void ac()
  $('#ayKapat').onclick = kapat
  $('#ayarlar').onclick = (e) => {
    if ((e.target as HTMLElement).id === 'ayarlar') kapat()
  }

  const ac = async (): Promise<void> => {
    await ciz()
    $('#ayarlar').classList.add('acik')
  }
  void kacir
  return { ac }
}
