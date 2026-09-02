import { EN_AZ_AD, EN_AZ_SIFRE } from '../cekirdek/hesapKimlik.js'
import type { Kilit } from '../kilitAkis.js'
import { $, $$, S } from './ortak.js'

/**
 * Kilit ekranı — iki kip, karşılamada üç yol.
 *
 * **`ac`**: bu cihazda defter var ve kilitli. Ana anahtar bellekte
 * olmadığı için arkada uygulama yok, veritabanı bile açılmamış
 * (KARARLAR.md · K-021).
 *
 * **`karsilama`**: bu cihazda defter yok. Üç yol var:
 *
 *   giriş yap      — kullanıcı adı + şifre; defter sunucudan iner
 *   hesap aç       — yeni defter, her cihazdan ulaşılır
 *   bu cihazda kal — hesapsız, çevrimdışı; tek bayt ışık yok
 *
 * Üçüncüsü ilke 2.3'ün ayakta kalma biçimi: sunucuya gitmek bir SEÇİM
 * (KARARLAR.md · K-039).
 *
 * Tarayıcıda bu ekran atlanamıyor: anahtar olmadan defter diske mühürlü
 * yazılamaz, yani şifre belirlemek "istersen" değil, şifrelemenin
 * kendisi (K-037).
 *
 * Yeni şifre belirlenen her yerde İKİ KEZ soruluyor. Yanlış yazılan bir
 * şifre defteri bir daha açılmamak üzere kapatır.
 */

/**
 * "Hesap tamam ama yerel defter açılamadı" işareti.
 *
 * Bu durumda uyarıyı `ana.ts` zaten koymuş oluyor (mühür açılmadı) ve
 * ekran da açma kipine dönmüş oluyor. Buradaki genel "bağlantını
 * kontrol et" mesajı üstüne yazarsa kullanıcıyı yanlış yere bakmaya
 * gönderir: hesap açılmıştır, sorun ağda değildir (KARARLAR.md · K-039).
 */
export const ACILMADI = 'DefterAcilmadi'

/**
 * Hesap yolunun nerede durduğu.
 *
 * Boolean yetmiyordu: "olmadı" dört ayrı şey olabiliyor ve kullanıcıya
 * hepsi için aynı cümle kuruluyordu. Canlıda bunun bedeli ödendi —
 * sunucu 200 dönerken ekranda "böyle bir defter yok" yazıyordu ve
 * hatanın hangi katmanda olduğu ayırt edilemiyordu (KARARLAR.md · K-042).
 */
export type HesapDurum =
  | 'tamam'
  | 'yok'
  | 'satirYok'
  | 'cozulemedi'
  | 'gecersiz'
  | 'hata'

export type KilitKipi = 'ac' | 'karsilama'
type Yol = 'secim' | 'giris' | 'hesap' | 'yerel'

/** Karşılamadaki hesap yolları; verilmezse yalnızca yerel defter. */
export interface HesapYollari {
  giris: (ad: string, sifre: string) => Promise<HesapDurum>
  ac: (ad: string, sifre: string) => Promise<HesapDurum>
  /**
   * Bu cihazı temizleyip karşılamaya döner.
   *
   * Açma ekranındaki çıkış yolu. Parolası hatırlanmayan bir defter zaten
   * açılamıyor; buradan silinen şey erişilemez bir şey (K-039).
   */
  temizle: () => Promise<void>
}

export function kilitEkraniBagla(
  kilit: Kilit,
  cozuldu: (anaAnahtar: string) => Promise<void>,
  hesap?: HesapYollari,
): {
  goster: (kip?: KilitKipi) => Promise<void>
  gizle: () => void
  uyar: (metin: string) => void
} {
  let parolaKipi = false
  let girilen = ''
  let kip: KilitKipi = 'ac'
  let yol: Yol = 'secim'
  /** Yeni şifre belirlenirken ilk yazılan; ikincisiyle karşılaştırılıyor. */
  let ilkSifre: string | null = null

  const alan = () => $<HTMLInputElement>('#kilPin')
  const adAlani = () => $<HTMLInputElement>('#kilAd')
  const uyari = (metin: string): void => void ($('#kilUyari').textContent = metin)

  const noktalariCiz = (): void => {
    if (parolaKipi) {
      $('#kilNoktalar').innerHTML = ''
      return
    }
    $('#kilNoktalar').innerHTML = Array.from({ length: 6 }, (_, i) =>
      `<i class="${i < girilen.length ? 'dolu' : ''}"></i>`,
    ).join('')
  }

  const beklemeYaz = (kalan: number): void => {
    const sn = Math.ceil(kalan / 1000)
    uyari(sn > 90 ? S('kil.beklemeDk', { n: Math.ceil(sn / 60) }) : S('kil.beklemeSn', { n: sn }))
  }

  /* ── açma ──────────────────────────────────────────────── */

  const dene = async (sifre: string): Promise<void> => {
    const s = await kilit.pinIle(sifre)
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

  /* ── karşılama ─────────────────────────────────────────── */

  /** Yeni şifreyi iki kez alır; ikisi tutunca `kur`u çağırır. */
  const ikiKez = async (
    yazilan: string,
    kur: (sifre: string) => Promise<void>,
  ): Promise<void> => {
    alan().value = ''
    if (ilkSifre === null) {
      if (yazilan.length < EN_AZ_SIFRE) return uyari(S('kil.kurKisa', { n: EN_AZ_SIFRE }))
      ilkSifre = yazilan
      return uyari(S('kil.kurTekrar'))
    }
    if (yazilan !== ilkSifre) {
      ilkSifre = null
      return uyari(S('kil.kurUymadi'))
    }
    const sifre = ilkSifre
    ilkSifre = null
    await kur(sifre)
  }

  const yerelKur = (yazilan: string): Promise<void> =>
    ikiKez(yazilan, async (sifre) => {
      uyari(S('kil.kurBekle'))
      await cozuldu(await kilit.kur(sifre))
    })

  /**
   * Hesap yolunu koşturur ve DURUMA GÖRE doğru uyarıyı bırakır.
   *
   * `yoksa` her yol için ayrı: girişte "böyle bir defter yok", hesap
   * açmada "hesap açılamadı". Geri kalan durumlar ikisinde de aynı
   * cümleyi hak ediyor, çünkü aynı şeyi anlatıyorlar.
   */
  const hesapYolu = async (
    calis: () => Promise<HesapDurum>,
    yoksa: string,
  ): Promise<void> => {
    let d: HesapDurum
    try {
      d = await calis()
    } catch (h) {
      /* Defter açılamadıysa uyarı zaten yerinde: üstüne yazma. */
      if (h instanceof Error && h.name === ACILMADI) return
      d = 'hata'
    }
    if (d === 'tamam') return
    if (d === 'satirYok') return uyari(S('kil.kasaBos'))
    if (d === 'cozulemedi') return uyari(S('kil.kasaAcilmadi'))
    if (d === 'gecersiz') return uyari(S('kil.kurKisa', { n: EN_AZ_SIFRE }))
    uyari(yoksa)
  }

  const hesapAc = (yazilan: string): Promise<void> =>
    ikiKez(yazilan, async (sifre) => {
      const ad = adAlani().value
      if (ad.trim().length < EN_AZ_AD) return uyari(S('kil.adKisa', { n: EN_AZ_AD }))
      uyari(S('kil.hesapBekle'))
      await hesapYolu(() => hesap!.ac(ad, sifre), S('kil.hesapOlmadi'))
    })

  const girisDene = async (yazilan: string): Promise<void> => {
    const ad = adAlani().value
    if (ad.trim().length < EN_AZ_AD) return uyari(S('kil.adKisa', { n: EN_AZ_AD }))
    alan().value = ''
    uyari(S('kil.girisBekle'))
    await hesapYolu(() => hesap!.giris(ad, yazilan), S('kil.girisOlmadi'))
  }

  /* ── giriş olayları ────────────────────────────────────── */

  alan().addEventListener('input', () => {
    girilen = alan().value
    if (parolaKipi) return
    girilen = girilen.replace(/\D/g, '').slice(0, 6)
    alan().value = girilen
    noktalariCiz()
    /* Altı hane dolunca kendiliğinden dener — ayrıca düğmeye gerek yok. */
    if (girilen.length === 6) void dene(girilen)
  })

  const gonder = (): void => {
    const yazilan = alan().value
    if (!yazilan) return
    if (kip === 'ac') return void dene(yazilan)
    if (yol === 'giris') return void girisDene(yazilan)
    if (yol === 'hesap') return void hesapAc(yazilan)
    if (yol === 'yerel') return void yerelKur(yazilan)
  }

  for (const e of [alan(), adAlani()])
    e.addEventListener('keydown', (k) => {
      if ((k as KeyboardEvent).key !== 'Enter') return
      if (e === adAlani()) return alan().focus()
      gonder()
    })

  /* PIN kipinde alan görünmez; noktalara dokunmak klavyeyi geri getirsin. */
  $('#kilNoktalar').onclick = () => alan().focus()
  $('.kil-kapak').onclick = () => (kip === 'ac' ? alan() : adAlani()).focus()

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

  /* ── çizim ─────────────────────────────────────────────── */

  const yolaGec = (istenen: Yol): void => {
    yol = istenen
    ilkSifre = null
    alan().value = ''
    adAlani().value = ''
    const hesapYolu = yol === 'giris' || yol === 'hesap'

    $('#kilYollar').hidden = yol !== 'secim'
    adAlani().hidden = !hesapYolu
    $('#kilGeri').hidden = yol === 'secim'
    /*
     * Karşılamada her yol METİN girişi; PIN noktaları yalnızca açmada.
     * `parolaKipi` burada da kurulmak zorunda: yalnızca sınıf eklenip
     * bayrak unutulunca giriş alanı PIN gibi davranıyor ve şifredeki
     * harfleri siliyordu (KARARLAR.md · K-039).
     */
    parolaKipi = true
    $('#kilitEkrani').classList.add('parola')
    alan().hidden = yol === 'secim'
    alan().type = 'password'

    $('#kilAlt').textContent = S(
      yol === 'secim'
        ? 'kilit.karsilamaAlt'
        : yol === 'giris'
          ? 'kilit.girisAlt'
          : yol === 'hesap'
            ? 'kilit.hesapAlt'
            : 'kilit.kurAlt',
    )
    uyari(
      yol === 'secim'
        ? S('kil.karsilama')
        : yol === 'giris'
          ? S('kil.girisSor')
          : yol === 'hesap'
            ? S('kil.hesapSor', { n: EN_AZ_SIFRE })
            : S('kil.kurSor', { n: EN_AZ_SIFRE }),
    )
    setTimeout(() => (hesapYolu ? adAlani() : alan()).focus(), 60)
  }

  /*
   * Açma ekranının tek çıkış yolu.
   *
   * Bu düğme olmadan, parolasını hatırlamayan bir kullanıcı tarayıcıda TAM
   * ÇIKMAZDA kalıyordu: hesap ekranına geçiş yok, `?sifirla=1` de
   * kurtarmıyor (o bayrak defter açıldıktan sonra işliyor). K-039'un
   * getirdiği bir gerilemeydi.
   */
  $('#kilHesabim').onclick = () => {
    if (!confirm(S('kil.temizleOnay'))) return
    void hesap!.temizle()
  }

  $('#kilGiris').onclick = () => yolaGec('giris')
  $('#kilHesap').onclick = () => yolaGec('hesap')
  $('#kilYerel').onclick = () => yolaGec('yerel')
  $('#kilGeri').onclick = () => yolaGec('secim')

  const goster = async (istenen: KilitKipi = 'ac'): Promise<void> => {
    kip = istenen
    /*
     * Çözülmüş metin DOM'da kalmasın. Kilit ekranı üstünü örtüyor ama
     * defterin içeriği ağaçta durmaya devam ederdi; kilitlemek onu da
     * silmek demek.
     */
    for (const s of ['#kagit-kap', '#kesit', '#kesit-alt', '#cevapAlan', '#gecenYil', '#mektuplar'])
      $$(s).forEach((e) => (e.innerHTML = ''))
    for (const s of ['#ciltAd', '#sayfaNo', '#kalanYazi']) $(s).textContent = ''

    girilen = ''
    alan().value = ''
    ilkSifre = null
    $('#kilitEkrani').classList.add('acik')
    /* Diğer katmanlar kapalı kalsın: kilitliyken hiçbiri anlamlı değil. */
    for (const k of ['#toren', '#kitaplik', '#yeniDefter', '#fihrist', '#yak', '#ayarlar'])
      $$(k).forEach((e) => e.classList.remove('acik'))

    if (kip === 'karsilama') {
      $('#kilBiyo').hidden = true
      $('#kilParola').hidden = true
      $('#kilHesabim').hidden = true
      /* Hesap yolları yoksa (cihaz) doğrudan yerel kuruluma gidiliyor. */
      yolaGec(hesap ? 'secim' : 'yerel')
      if (!hesap) $('#kilGeri').hidden = true
      return
    }

    /*
     * Tarayıcıda PIN diye bir şey yok: kilit parolası en az on iki
     * karakter. Buna rağmen ekran PIN kipinde (altı nokta) açılıyordu ve
     * kullanıcı parolasını yazmadan önce bir düğmeye basmak zorundaydı.
     * Cihazda PIN gerçek bir şey, orada değişmiyor (K-039).
     */
    parolaKipi = !!hesap
    $('#kilitEkrani').classList.toggle('parola', parolaKipi)
    alan().type = parolaKipi ? 'password' : 'text'
    alan().setAttribute('inputmode', parolaKipi ? 'text' : 'numeric')
    alan().hidden = false
    adAlani().hidden = true
    $('#kilYollar').hidden = true
    $('#kilGeri').hidden = true
    $('#kilAlt').textContent = S('kilit.alt')
    $('#kilParola').hidden = false
    $('#kilParola').textContent = S(parolaKipi ? 'kilit.pin' : 'kilit.parola')
    $('#kilHesabim').hidden = !hesap
    $('#kilBiyo').hidden = !kilit.biyometriAcik
    uyari('')
    noktalariCiz()
    setTimeout(() => alan().focus(), 80)
    if (kilit.biyometriAcik) void biyometriDene()
  }

  const gizle = (): void => void $('#kilitEkrani').classList.remove('acik')

  return { goster, gizle, uyar: uyari }
}
