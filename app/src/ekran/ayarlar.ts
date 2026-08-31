import { kurtarmaCoz, kurtarmaUret } from '../cekirdek/kurtarma.js'
import { DILLER, type Dil } from '../cekirdek/dil.js'
import { anahtarBicimi } from '../veri/anahtarDepo.js'
import { anahtariDayat } from '../veri/kripto.js'
import type { Kilit } from '../kilitAkis.js'
import type { Depo } from '../veri/depo.js'
import { dokumAl, dokumuYukle } from '../veri/dokum.js'
import type { SqlSurucu } from '../veri/db.js'
import { muhruAc, muhurle } from '../veri/yedek.js'
import { dosyaAdi, dosyaKaydet, dosyaSec } from './dosya.js'
import { markdownIndir } from './disaAktarma.js'
import { $, $$, S, kacir } from './ortak.js'

/**
 * Ayar kağıdı: kilit, yedek, anlam araması, model cevabı.
 *
 * İki isteğe bağlı bölüm (gömü ve model) denetimleri verilmezse hiç
 * çizilmiyor — testte ve önizlemede bölüm yok, kod yolu da yok.
 */
export interface AyarBaglam {
  kilit: Kilit
  sifreli: boolean
  /** Tarayıcı mı — mühür notu yalnızca orada anlamlı. */
  tarayiciMi: boolean
  /** Tarayıcı depoyu kalıcı saydı mı; saymadıysa defter silinebilir. */
  kaliciIzin: boolean
  /**
   * Defterin şu an şifreli olduğu anahtar; kilit kurulurken bu sarmalanır.
   * Yeni anahtar ÜRETİLMEZ — üretilirse cihazdaki veritabanı bir daha
   * açılmaz (KARARLAR.md · K-036).
   */
  mevcutAnahtar: () => Promise<string | null>
  db: SqlSurucu
  depo: Depo
  degisti: () => void
  /** Gömü araması denetimi; yoksa bölüm hiç çizilmiyor. */
  gomu?: GomuDenetim
  /** Model cevabı denetimi; yoksa bölüm hiç çizilmiyor. */
  model?: ModelDenetim
  /** Dil denetimi; yoksa bölüm hiç çizilmiyor. */
  dil?: DilDenetim
  /** Senkron denetimi; yoksa bölüm hiç çizilmiyor. */
  senkron?: SenkronDenetim
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

/**
 * Dil seçimi.
 *
 * Değiştirince sayfa yeniden yükleniyor: yarı yarıya çevrilmiş bir ekran
 * hiç olmuyor ve ölçüm (`sayfaOlc`) yeni dilin metniyle baştan yapılıyor
 * (KARARLAR.md · K-035).
 */
export interface DilDenetim {
  simdiki: () => Dil
  degistir: (d: Dil) => Promise<void>
}

const DIL_ADI: Record<Dil, string> = { tr: 'Türkçe', en: 'English' }

/**
 * Cihazlar arası senkronun ayar kağıdındaki yüzü.
 *
 * Kapalı, açık — iki durum. Hesap açma diye bir adım yok: Defter
 * Kimliği ya üretiliyor ya giriliyor (KARARLAR.md · K-036).
 */
export interface SenkronDenetim {
  acikMi: () => boolean
  kod: () => string | null
  durum: () => { calisiyor: boolean; bekleyen: number; asama: string; hata: string | null; sonSenkron: number | null }
  kullanim: () => { satir: number; bayt: number } | null
  /** Yeni kimlik üretip senkronu başlatır. */
  ac: (kod: string) => Promise<void>
  kapat: () => Promise<void>
  simdi: () => Promise<void>
  dinle: (f: () => void) => void
}

/** Bayt sayısını okunur hâle getirir. */
const boyutYaz = (b: number): string =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`

export function ayarlariBagla(b: AyarBaglam): { ac: () => Promise<void> } {
  const { kilit, sifreli, tarayiciMi, kaliciIzin, mevcutAnahtar, db, depo, degisti, yenidenYukle, gomu, model } =
    b
  const dilD = b.dil
  const senkron = b.senkron
  const kapat = () => $('#ayarlar').classList.remove('acik')

  /** PIN sorar; iptal edilirse null. */
  const pinSor = (baslik: string): string | null => {
    const s = prompt(baslik)
    if (s === null) return null
    const temiz = s.trim()
    if (temiz.length < 4) {
      alert(S('ay.pinKisa'))
      return null
    }
    return temiz
  }

  const ciz = async (): Promise<void> => {
    const kurulu = kilit.durum !== 'kurulusuz'
    const biyoVar = await kilit.biyometriVarMi()

    gomuCiz()
    modelCiz()
    senkronCiz()
    dilCiz()

    $('#ayKilitDurum').textContent = kurulu
      ? kilit.biyometriAcik
        ? S('ay.kilitAcikBiyo')
        : S('ay.kilitAcikPin')
      : S('ay.kilitYok')

    const d: string[] = []
    if (!kurulu)
      d.push(`<button class="birincil" data-eylem="kur">${S('ay.kilitKur')}</button>`)
    else {
      d.push(`<button data-eylem="pin">${S('ay.pinDegistir')}</button>`)
      if (biyoVar)
        d.push(
          kilit.biyometriAcik
            ? `<button data-eylem="biyoKapat">${S('ay.biyoKapat')}</button>`
            : `<button data-eylem="biyoAc">${S('ay.biyoAc')}</button>`,
        )
      d.push(`<button data-eylem="kaldir">${S('ay.kilitKaldir')}</button>`)
    }
    $('#ayKilitDugmeler').innerHTML = d.join('')

    const notlar: string[] = []
    if (!sifreli)
      notlar.push(
        S('ay.notSifresiz'),
      )
    /* Tarayıcıda şifreleme kilidin kendisi; unutulan parolanın bedeli
       cihazdakinden ağır ve söylenmek zorunda (KARARLAR.md · K-037). */
    if (sifreli && tarayiciMi) notlar.push(S('ay.notTarayiciMuhur'))
    /* Tarayıcı defteri silebiliyorsa bu en önce söylenmeli. */
    if (tarayiciMi && !kaliciIzin) notlar.unshift(S('ay.notKaliciDegil'))
    if (kilit.biyometriAcik)
      notlar.push(
        S('ay.notBiyo'),
      )
    if (!sifreli && senkron?.acikMi()) notlar.push(S('ay.senkronTarayici'))
    if (kilit.durum !== 'kurulusuz' && senkron?.acikMi())
      notlar.push(S('ay.senkronKilitli'))
    if (!sifreli && model?.anahtarVar())
      notlar.push(
        S('ay.notModelAnahtar'),
      )
    if (kilit.durum !== 'kurulusuz')
      notlar.push(
        S('ay.notPinUnutma'),
      )
    $('#ayNot').innerHTML = notlar.map((n) => `<p>${n}</p>`).join('')

    for (const d of [...document.querySelectorAll<HTMLButtonElement>('#ayarlar button[data-eylem]')])
      d.onclick = () => void eylem(d.dataset.eylem!)
  }

  const eylem = async (ad: string): Promise<void> => {
    if (ad === 'kur') {
      const pin = pinSor(S('ay.yeniPin'))
      if (!pin) return
      const tekrar = prompt(S('ay.pinTekrar'))
      if (tekrar !== pin) return void alert(S('ay.pinFarkli'))
      const anahtar = await mevcutAnahtar()
      const yeniAv = await kilit.kur(pin, anahtar ?? undefined)
      /* Bellekteki dayatılmış anahtar da tazelensin: kilit açıkken
         veritabanı bunu kullanıyor. */
      anahtariDayat(yeniAv)
      if (await kilit.biyometriVarMi()) {
        if (confirm(S('ay.biyoSor'))) await kilit.biyometriKur()
      }
    } else if (ad === 'pin') {
      const eski = pinSor(S('ay.pinSuanki'))
      if (!eski) return
      const yeni = pinSor(S('ay.pinYeni'))
      if (!yeni) return
      if (!(await kilit.pinDegistir(eski, yeni))) return void alert(S('ay.pinYanlis'))
    } else if (ad === 'biyoAc') {
      if (!(await kilit.biyometriKur())) alert(S('ay.biyoYok'))
    } else if (ad === 'biyoKapat') {
      await kilit.biyometriKaldir()
    } else if (ad === 'kaldir') {
      if (!confirm(S('ay.kilitKaldirOnay'))) return
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
      if (!confirm(S('ay.gomuKapatOnay'))) return
      await gomu?.kapat()
      return
    } else if (ad === 'modelAnahtar') {
      const girilen = prompt(S('ay.modelAnahtarSor'))
      if (girilen === null) return
      if (!anahtarBicimi(girilen)) {
        alert(S('ay.modelAnahtarBicim'))
        return
      }
      await model?.yaz(girilen)
    } else if (ad === 'modelSil') {
      if (!confirm(S('ay.modelAnahtarSilOnay'))) return
      await model?.sil()
    } else if (ad === 'senkronAc') {
      if (!senkron) return
      const kod = kurtarmaUret()
      if (!(await kimlikKarti(kod, true))) return
      await senkron.ac(kod)
      void senkron.simdi()
    } else if (ad === 'senkronBagla') {
      if (!senkron) return
      const girilen = prompt(S('ay.senkronKodSor'))
      if (girilen === null) return
      if (!kurtarmaCoz(girilen)) {
        alert(S('ay.senkronKodGecersiz'))
        return
      }
      await senkron.ac(girilen)
      void senkron.simdi()
    } else if (ad === 'senkronKimlik') {
      const kod = senkron?.kod()
      if (kod) await kimlikKarti(kod, false)
      return
    } else if (ad === 'senkronSimdi') {
      await senkron?.simdi()
      return
    } else if (ad === 'senkronKapat') {
      if (!confirm(S('ay.senkronKapatOnay'))) return
      await senkron?.kapat()
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
      ? S('ay.gomuKapaliMetin')
      : d.hata
        ? S('ay.gomuHata', { hata: kacir(d.hata) })
        : d.calisiyor
          ? S('ay.gomuIsliyor', {
              asama: d.asama || S('ay.gomuIndeksleniyor'),
              biten: d.toplam - d.bekleyen,
              toplam: d.toplam,
            })
          : d.bekleyen
            ? S('ay.gomuSirada', { n: d.bekleyen })
            : S('ay.gomuBitti', { n: d.toplam })

    $('#ayGomuDugmeler').innerHTML = acik
      ? `<button data-eylem="gomuKapat">${S('ay.gomuKapatBtn')}</button>`
      : `<button data-eylem="gomuAc">${S('ay.gomuAcBtn')}</button>`
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
      ? S('ay.modelKapaliMetin')
      : S('ay.modelAcikMetin', { kuyruk: kacir(model.kuyruk()) }) +
        (model.soruAcik() ? S('ay.modelSoruAcik') : S('ay.modelSoruKapali'))

    $('#ayModelDugmeler').innerHTML = var_
      ? `<button data-eylem="modelSoru">${
          model.soruAcik() ? S('ay.modelSoruKapatBtn') : S('ay.modelSoruAcBtn')
        }</button>` +
        `<button data-eylem="modelAnahtar">${S('ay.modelAnahtarDegistir')}</button>` +
        `<button data-eylem="modelSil">${S('ay.modelAnahtarSil')}</button>`
      : `<button data-eylem="modelAnahtar">${S('ay.modelAnahtarGir')}</button>`
    for (const dg of $$<HTMLButtonElement>('#ayModelDugmeler button'))
      dg.onclick = () => void eylem(dg.dataset.eylem!)
  }

  /* ── senkron ───────────────────────────────────────────── */

  function senkronCiz(): void {
    const bolum = $('#aySenkronDurum').parentElement!
    if (!senkron) {
      bolum.style.display = 'none'
      return
    }
    bolum.style.display = ''
    const acik = senkron.acikMi()

    if (!acik) {
      $('#aySenkronDurum').innerHTML = S('ay.senkronKapali')
      $('#aySenkronDugmeler').innerHTML =
        `<button class="birincil" data-eylem="senkronAc">${S('ay.senkronAc')}</button>` +
        `<button data-eylem="senkronBagla">${S('ay.senkronBagla')}</button>`
    } else {
      const d = senkron.durum()
      const k = senkron.kullanim()
      let m = S('ay.senkronAcik', {
        n: k?.satir ?? 0,
        boyut: boyutYaz(k?.bayt ?? 0),
      })
      if (d.calisiyor) m += S('ay.senkronCalisiyor', { asama: kacir(d.asama) })
      else if (d.bekleyen) m += S('ay.senkronBekleyen', { n: d.bekleyen })
      if (d.hata) m += S('ay.senkronHata', { hata: kacir(d.hata) })
      m += d.sonSenkron
        ? S('ay.senkronSonSenkron', { zaman: new Date(d.sonSenkron).toLocaleTimeString() })
        : S('ay.senkronHicSenkron')
      $('#aySenkronDurum').innerHTML = m
      $('#aySenkronDugmeler').innerHTML =
        `<button data-eylem="senkronSimdi"${d.calisiyor ? ' disabled' : ''}>${S('ay.senkronSimdi')}</button>` +
        `<button data-eylem="senkronKimlik">${S('ay.senkronKimlikGoster')}</button>` +
        `<button data-eylem="senkronKapat">${S('ay.senkronKapat')}</button>`
    }
    for (const dg of $$<HTMLButtonElement>('#aySenkronDugmeler button'))
      dg.onclick = () => void eylem(dg.dataset.eylem!)
  }

  /**
   * Defter Kimliği kartı. Kurtarma kodu kartıyla aynı dil: kod bir kez
   * gösteriliyor ve kullanıcı yazdığını onaylamadan devam edemiyor.
   */
  const kimlikKarti = (kod: string, baslatilacak: boolean): Promise<boolean> =>
    new Promise((bitti) => {
      $('#skKod').textContent = kod
      $<HTMLInputElement>('#skOnay').checked = false
      $<HTMLButtonElement>('#skDevam').disabled = true
      $('#skDevam').textContent = baslatilacak ? S('sk.devam') : S('sk.kapat')
      $('#skVaz').style.display = baslatilacak ? '' : 'none'
      $('#senkronKimlikKarti').classList.add('acik')

      $<HTMLInputElement>('#skOnay').onchange = (e) => {
        $<HTMLButtonElement>('#skDevam').disabled = !(e.target as HTMLInputElement).checked
      }
      $('#skKopyala').onclick = () => {
        void navigator.clipboard?.writeText(kod)
        $('#skKopyala').textContent = S('sk.kopyalandi')
        setTimeout(() => ($('#skKopyala').textContent = S('sk.kopyala')), 1800)
      }
      const kapat = (sonuc: boolean) => {
        $('#senkronKimlikKarti').classList.remove('acik')
        bitti(sonuc)
      }
      $('#skVaz').onclick = () => kapat(false)
      $('#skDevam').onclick = () => kapat(true)
    })

  /* ── dil ───────────────────────────────────────────────── */

  function dilCiz(): void {
    const bolum = $('#ayDilDugmeler').parentElement!
    if (!dilD) {
      bolum.style.display = 'none'
      return
    }
    bolum.style.display = ''
    const simdi = dilD.simdiki()
    $('#ayDilDugmeler').innerHTML = DILLER.map(
      (d) =>
        `<button data-dil="${d}"${d === simdi ? ' class="birincil"' : ''}>${DIL_ADI[d]}</button>`,
    ).join('')
    for (const dg of $$<HTMLButtonElement>('#ayDilDugmeler button'))
      dg.onclick = () => {
        const yeni = dg.dataset.dil as Dil
        if (yeni !== simdi) void dilD.degistir(yeni)
      }
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
        $('#kurKopyala').textContent = S('kur.kopyalandi')
        setTimeout(() => ($('#kurKopyala').textContent = S('kur.kopyala')), 1800)
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
    const kod = prompt(S('ay.yedekKod'))
    if (!kod) return
    try {
      const dokum = await muhruAc(JSON.parse(ham), kod)
      const kayitSayisi = (dokum.tablolar.kayit ?? []).length
      const mevcut = await depo.kayitSayisi()
      if (
        !confirm(
          S('ay.yedekIcerik', { n: kayitSayisi }) +
            '\n\n' +
            (mevcut > 0 ? S('ay.yedekSilinecek', { n: mevcut }) + '\n\n' : '') +
            S('ay.yedekDevam'),
        )
      )
        return
      if (mevcut > 0 && !confirm(S('ay.yedekEmin'))) return
      await dokumuYukle(db, dokum)
      alert(S('ay.yedekYuklendi'))
      yenidenYukle()
    } catch (e) {
      alert(e instanceof Error ? e.message : S('ay.yedekAcilmadi'))
    }
  }

  gomu?.dinle(() => {
    if ($('#ayarlar').classList.contains('acik')) gomuCiz()
  })
  senkron?.dinle(() => {
    if ($('#ayarlar').classList.contains('acik')) senkronCiz()
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
