import { kurtarmaUret } from '../cekirdek/kurtarma.js'
import type { Kilit } from '../kilitAkis.js'
import type { Depo } from '../veri/depo.js'
import { dokumAl, dokumuYukle } from '../veri/dokum.js'
import type { SqlSurucu } from '../veri/db.js'
import { muhruAc, muhurle } from '../veri/yedek.js'
import { dosyaAdi, dosyaKaydet, dosyaSec } from './dosya.js'
import { markdownIndir } from './disaAktarma.js'
import { $, kacir } from './ortak.js'

/**
 * Ayar kağıdı. Şimdilik tek bölüm: kilit.
 * Yedekleme (Faz 2.8) buraya eklenecek.
 */
export interface AyarBaglam {
  kilit: Kilit
  sifreli: boolean
  mevcutAnahtar: () => string | null
  db: SqlSurucu
  depo: Depo
  degisti: () => void
  /** Geri yükleme sonrası uygulamayı baştan kurmak için. */
  yenidenYukle: () => void
}

export function ayarlariBagla(b: AyarBaglam): { ac: () => Promise<void> } {
  const { kilit, sifreli, mevcutAnahtar, db, depo, degisti, yenidenYukle } = b
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

    for (const d of [...document.querySelectorAll<HTMLButtonElement>('#ayarlar button[data-eylem]')])
      d.onclick = () => void eylem(d.dataset.eylem!)
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
    } else if (ad === 'yedekAl') {
      await yedekAl()
      return
    } else if (ad === 'geriYukle') {
      await geriYukle()
      return
    } else if (ad === 'mdAktar') {
      await markdownIndir(depo)
      return
    }
    await ciz()
    degisti()
  }

  /* ── mühürlü yedek ─────────────────────────────────────── */

  const yedekAl = (): Promise<void> =>
    new Promise((bitti) => {
      const kod = kurtarmaUret()
      $('#kurKod').textContent = kod
      $<HTMLInputElement>('#kurOnay').checked = false
      $<HTMLButtonElement>('#kurDevam').disabled = true
      $('#kurtarmaKarti').classList.add('acik')

      $<HTMLInputElement>('#kurOnay').onchange = (e) => {
        $<HTMLButtonElement>('#kurDevam').disabled = !(e.target as HTMLInputElement).checked
      }
      $('#kurKopyala').onclick = () => {
        void navigator.clipboard?.writeText(kod)
        $('#kurKopyala').textContent = 'kopyalandı'
        setTimeout(() => ($('#kurKopyala').textContent = 'kopyala'), 1800)
      }
      const kapat = () => {
        $('#kurtarmaKarti').classList.remove('acik')
        bitti()
      }
      $('#kurVaz').onclick = kapat
      $('#kurDevam').onclick = async () => {
        const y = await muhurle(await dokumAl(db), kod)
        await dosyaKaydet(
          `${dosyaAdi('defter-yedek')}.defter`,
          JSON.stringify(y),
          'application/json',
        )
        kapat()
      }
    })

  const geriYukle = async (): Promise<void> => {
    const ham = await dosyaSec('.defter,application/json')
    if (!ham) return
    const kod = prompt('Bu yedeğin kurtarma kodu:')
    if (!kod) return
    try {
      const dokum = await muhruAc(JSON.parse(ham), kod)
      const kayitSayisi = (dokum.tablolar.kayit ?? []).length
      const mevcut = await depo.kayitSayisi()
      if (
        !confirm(
          `Yedekte ${kayitSayisi} kayıt var.\n\n` +
            (mevcut > 0
              ? `Bu cihazdaki ${mevcut} kayıt SİLİNECEK ve yerine yedek geçecek.\n\n`
              : '') +
            'Devam edilsin mi?',
        )
      )
        return
      if (mevcut > 0 && !confirm('Emin misin? Bu geri alınamaz.')) return
      await dokumuYukle(db, dokum)
      alert('Yedek geri yüklendi.')
      yenidenYukle()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Yedek açılamadı.')
    }
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
