import { kurtarmaUret } from '../cekirdek/kurtarma.js'
import { anahtarBicimi } from '../veri/anahtarDepo.js'
import type { Kilit } from '../kilitAkis.js'
import type { Depo } from '../veri/depo.js'
import { dokumAl, dokumuYukle } from '../veri/dokum.js'
import type { SqlSurucu } from '../veri/db.js'
import { muhruAc, muhurle } from '../veri/yedek.js'
import { dosyaAdi, dosyaKaydet, dosyaSec } from './dosya.js'
import { markdownIndir } from './disaAktarma.js'
import { $, $$, kacir } from './ortak.js'

/**
 * Ayar kağıdı: kilit, yedek, anlam araması, model cevabı.
 *
 * İki isteğe bağlı bölüm (gömü ve model) denetimleri verilmezse hiç
 * çizilmiyor — testte ve önizlemede bölüm yok, kod yolu da yok.
 */
export interface AyarBaglam {
  kilit: Kilit
  sifreli: boolean
  mevcutAnahtar: () => string | null
  db: SqlSurucu
  depo: Depo
  degisti: () => void
  /** Gömü araması denetimi; yoksa bölüm hiç çizilmiyor. */
  gomu?: GomuDenetim
  /** Model cevabı denetimi; yoksa bölüm hiç çizilmiyor. */
  model?: ModelDenetim
  /** Geri yükleme sonrası uygulamayı baştan kurmak için. */
  yenidenYukle: () => void
}

/**
 * Anlam aramasının ayar kağıdındaki yüzü.
 *
 * Kapalı, indiriliyor, indeksleniyor, açık — dört durum. Boyut açıkça
 * söyleniyor: kullanıcı ~145 MB'ı bilerek indiriyor (KARARLAR.md · K-029).
 */
export interface GomuDenetim {
  acikMi: () => boolean
  durum: () => { calisiyor: boolean; bekleyen: number; toplam: number; asama: string; hata: string | null }
  ac: () => Promise<void>
  kapat: () => Promise<void>
  dinle: (f: () => void) => void
}

/**
 * Model cevabının ayar kağıdındaki yüzü.
 *
 * İki durum: anahtar yok (özellik hiç yok) ya da anahtar var. Ara durum
 * yok, çünkü açma/kapama ayrı bir düğme değil — anahtarın kendisi
 * (KARARLAR.md · K-031).
 */
export interface ModelDenetim {
  anahtarVar: () => boolean
  kuyruk: () => string
  yaz: (anahtar: string) => Promise<void>
  sil: () => Promise<void>
  /** Yazdıktan sonra tek soru — ayrı ayar (KARARLAR.md · K-032). */
  soruAcik: () => boolean
  soruDegistir: (acik: boolean) => Promise<void>
}

export function ayarlariBagla(b: AyarBaglam): { ac: () => Promise<void> } {
  const { kilit, sifreli, mevcutAnahtar, db, depo, degisti, yenidenYukle, gomu, model } = b
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

    gomuCiz()
    modelCiz()

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
    if (!sifreli && model?.anahtarVar())
      notlar.push(
        'Tarayıcı derlemesinde model anahtarı da <b>korumasız</b> duruyor ' +
          '(localStorage). Gerçek anahtarını yalnızca cihaz derlemesine gir.',
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
    } else if (ad === 'gomuAc') {
      await gomu?.ac()
      return
    } else if (ad === 'gomuKapat') {
      if (!confirm('Anlam araması kapatılsın mı? İndekslenmiş vektörler silinir.')) return
      await gomu?.kapat()
      return
    } else if (ad === 'modelAnahtar') {
      const girilen = prompt('Anthropic API anahtarın (sk-ant-… ile başlar):')
      if (girilen === null) return
      if (!anahtarBicimi(girilen)) {
        alert('Bu bir Anthropic anahtarına benzemiyor. sk-ant- ile başlaması gerekiyor.')
        return
      }
      await model?.yaz(girilen)
    } else if (ad === 'modelSil') {
      if (!confirm('Anahtar silinsin mi? Model cevabı bir daha çağrılamaz.')) return
      await model?.sil()
    } else if (ad === 'modelSoru') {
      await model?.soruDegistir(!model.soruAcik())
    }
    await ciz()
    degisti()
  }

  /* ── anlam araması ─────────────────────────────────────── */

  function gomuCiz(): void {
    const bolum = $('#ayGomuDurum').parentElement!
    if (!gomu) {
      bolum.style.display = 'none'
      return
    }
    bolum.style.display = ''
    const d = gomu.durum()
    const acik = gomu.acikMi()

    $('#ayGomuDurum').innerHTML = !acik
      ? 'Kapalı. Açarsan defterin <b>anlamca</b> aranabilir olur — “kötü hissettiğim ' +
        'günler” gibi sorular, o sözcükler kayıtta geçmese de sonuç verir.<br>' +
        'Bir kerelik <b>~145 MB</b> indirilir ve cihazda kalır. ' +
        '<b>Yazdıkların cihazdan çıkmaz</b>: model metne gelir, metin modele gitmez.'
      : d.hata
        ? `Bir sorun çıktı: ${kacir(d.hata)}<br>Arama bu sırada da çalışıyor, ` +
          'yalnızca anlam yakınlığı devre dışı.'
        : d.calisiyor
          ? `${d.asama || 'indeksleniyor'} — ${d.toplam - d.bekleyen}/${d.toplam} kayıt`
          : d.bekleyen
            ? `Açık. ${d.bekleyen} kayıt sırada.`
            : `Açık. ${d.toplam} kayıt indekslendi.`

    $('#ayGomuDugmeler').innerHTML = acik
      ? '<button data-eylem="gomuKapat">kapat ve vektörleri sil</button>'
      : '<button data-eylem="gomuAc">indir ve aç</button>'
    for (const dg of $$<HTMLButtonElement>('#ayGomuDugmeler button'))
      dg.onclick = () => void eylem(dg.dataset.eylem!)
  }

  /* ── model cevabı ──────────────────────────────────────── */

  function modelCiz(): void {
    const bolum = $('#ayModelDurum').parentElement!
    if (!model) {
      bolum.style.display = 'none'
      return
    }
    bolum.style.display = ''
    const var_ = model.anahtarVar()

    $('#ayModelDurum').innerHTML = !var_
      ? 'Kapalı. Arşivdeki cevap şu an <b>senin kayıtlarından derlenmiş bir özet</b>; ' +
        'istersen aynı kayıtlardan bir modelin cümle kurmasını isteyebilirsin.<br>' +
        'Bunun için <b>kendi Anthropic API anahtarın</b> gerekiyor — sunucumuz yok, ' +
        'çağrı doğrudan bu cihazdan gider ve faturası sana yazılır.<br>' +
        'Arşivde ayrı bir düğme çıkar; ona basmadıkça <b>hiçbir şey cihazdan çıkmaz</b>. ' +
        'Bastığında da yalnızca ekranda gördüğün <b>en fazla 4 kayıt</b> gider.'
      : `Açık. Anahtar cihazda saklı (…${kacir(model.kuyruk())}). ` +
        'Arşivde arama yaptıktan sonra “bu kayıtlardan bir cevap yaz” düğmesi çıkar. ' +
        'Düğmeye basmadıkça çağrı olmaz.<br>' +
        (model.soruAcik()
          ? 'Defterde de <b>“yazdığıma bir soru sor”</b> düğmesi var: son yazdığın kaydı ' +
            'gönderip tek bir soru getirir. Yorum değil, soru. Kriz işaretli bir kayıttan ' +
            'sonra o düğme hiç çıkmaz.'
          : 'Defterde yazdıktan sonra tek soru isteme kapalı.')

    $('#ayModelDugmeler').innerHTML = var_
      ? `<button data-eylem="modelSoru">${
          model.soruAcik() ? 'yazdıktan sonra soruyu kapat' : 'yazdıktan sonra soru iste'
        }</button>` +
        '<button data-eylem="modelAnahtar">anahtarı değiştir</button>' +
        '<button data-eylem="modelSil">anahtarı sil</button>'
      : '<button data-eylem="modelAnahtar">anahtarımı gir</button>'
    for (const dg of $$<HTMLButtonElement>('#ayModelDugmeler button'))
      dg.onclick = () => void eylem(dg.dataset.eylem!)
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

  gomu?.dinle(() => {
    if ($('#ayarlar').classList.contains('acik')) gomuCiz()
  })

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
