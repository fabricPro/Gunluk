import { Durum } from './durum.js'
import { cihazDili, type Dil } from './cekirdek/dil.js'
import { GomuAkis } from './gomuAkis.js'
import { ModelAkis } from './modelAkis.js'
import type { SenkronAkis as SenkronAkisTip } from './senkronAkis.js'
import type { Sunucu as SunucuTip } from './veri/senkronDepo.js'
import { belgeOneki, sorguOneki } from './cekirdek/gomuModel.js'
import { Kilit } from './kilitAkis.js'
import { arsiviBagla } from './ekran/arsiv.js'
import { ayarlariBagla } from './ekran/ayarlar.js'
import { defteriBagla } from './ekran/defter.js'
import { fihristiBagla } from './ekran/fihrist.js'
import { kilidiBagla } from './ekran/kilit.js'
import { kilitEkraniBagla } from './ekran/kilitEkrani.js'
import { kitapligiBagla } from './ekran/kitaplik.js'
import { kapsuleBagla } from './ekran/kapsul.js'
import { sayfaOlc } from './ekran/olcum.js'
import { dilKur } from './ekran/ortak.js'
import { toreniBagla } from './ekran/toren.js'
import { yakmayiBagla } from './ekran/yak.js'
import { defteriAc } from './veri/db.js'
import { Depo } from './veri/depo.js'
import { anahtariDayat, veritabaniAnahtari } from './veri/kripto.js'
import { MODEL_ANAHTARI, SENKRON_KODU, anahtarDeposu } from './veri/anahtarDepo.js'
import { cihazDepo, tarayiciDepo } from './veri/kilitDepo.js'
import { surucuSec } from './veri/surucu.js'
import type { SqlSurucu } from './veri/db.js'

const $ = (s: string): HTMLElement => document.querySelector<HTMLElement>(s)!

/**
 * Önizleme derlemesini işaretler.
 *
 * Tarayıcı derlemesinde veritabanı şifresiz; bu, adresi bilen herkesin
 * açabildiği bir yerde söylenmeden geçilemez (KARARLAR.md · K-013).
 */
function onizlemeyiIsaretle(): void {
  if (!import.meta.env.VITE_ONIZLEME) return
  const marka = document.querySelector('.marka')
  if (marka) marka.textContent = 'defter · önizleme'
  console.warn(
    '[defter] Önizleme derlemesi: veritabanı şifresiz, kilit yok. Gerçek günlük için değil.',
  )
}

/** Tek seferlik geliştirme bayrağını adresten temizler. */
function bayrakDusur(ad: string): void {
  const u = new URL(location.href)
  u.searchParams.delete(ad)
  history.replaceState(null, '', u.pathname + u.search + u.hash)
}

async function baslat(): Promise<void> {
  onizlemeyiIsaretle()

  /*
   * Dil, veritabanından ÖNCE kuruluyor: kilit ekranı da çevrilmiş olsun.
   * Seçim yoksa cihaz diline bakılıyor; tanımadığı her dilde Türkçe
   * (KARARLAR.md · K-035). Ayarlarda değişince sayfa yeniden yükleniyor,
   * bu yüzden saklandığı yer localStorage: veritabanı henüz açık değil.
   */
  const secilenDil = (localStorage.getItem('defter.dil') as Dil | null) ?? cihazDili()
  dilKur(secilenDil)

  /*
   * Kilit, veritabanının ÖNÜNDE. Kayıt güvenli depodan okunuyor; kilitliyken
   * ana anahtar bellekte olmadığı için veritabanı açılamıyor bile
   * (KARARLAR.md · K-021).
   */
  const nativeMi = !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    ?.isNativePlatform?.()
  const kilit = new Kilit(nativeMi ? await cihazDepo() : tarayiciDepo())
  await kilit.yukle()

  let surucu: SqlSurucu | null = null
  /* Kilitlenmede çağrılıyor; uygulama kurulunca gerçek durdurucuya bağlanır. */
  let indekslemeyiDurdur: () => void = () => {}

  const kilitEkrani = kilitEkraniBagla(kilit, async (anaAnahtar) => {
    anahtariDayat(anaAnahtar)
    kilitEkrani.gizle()
    await uygulamayiKur()
  })

  /*
   * Arka plana geçince kilitlen. Dinleyici erken dönüşten ÖNCE bağlanıyor:
   * kilitli açılışta aşağıdaki `return` çalışıyor ve dinleyici sonrada
   * kalırsa hiç bağlanmıyor — kilit açıldıktan sonra bir daha kilitlenmiyordu.
   */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    if (kilit.durum !== 'acik') return
    /* Anahtar bellekten silinir, veritabanı kapanır, kilit ekranı gelir. */
    indekslemeyiDurdur()
    kilit.kilitle()
    anahtariDayat(null)
    const kapanan = surucu
    surucu = null
    void kapanan?.kapat()
    void kilitEkrani.goster()
  })

  if (kilit.durum === 'kilitli') {
    await kilitEkrani.goster()
    return
  }
  await uygulamayiKur()

  /* ── uygulamanın kendisi ─────────────────────────────────── */

  async function uygulamayiKur(): Promise<void> {
    const acilis = await surucuSec()
    surucu = acilis.surucu
    const depo = new Depo(await defteriAc(surucu))
    depo.dil = secilenDil
    const bayrak = new URLSearchParams(location.search)

    if (bayrak.has('sifirla')) {
      const { defteriSifirla } = await import('./veri/sifirla.js')
      await defteriSifirla(surucu)
      bayrakDusur('sifirla')
      console.info('[defter] sıfırlandı — defter boş.')
    }
    if (bayrak.has('tohum')) {
      const { tohumEk } = await import('./veri/tohum.js')
      await tohumEk(depo, undefined, secilenDil)
    }

    const durum = new Durum(depo)
    durum.sifreli = acilis.sifreli
    durum.dil = secilenDil

    const sonDefter = await depo.ayarOku('aktifDefter')
    if (sonDefter && (await depo.defterGetir(sonDefter))) depo.defteriSec(sonDefter)

    await durum.yenile()
    durum.aktifSayfa = durum.sonSayfa
    durum.soruyuTazele(new Date().toISOString().slice(0, 10))

    /*
     * Model cevabı — anahtar yoksa hiçbir yerde düğme çıkmıyor. Çağrı
     * kodu ayrı parçada: anahtar girilmemişse SDK inmiyor (K-031).
     */
    const model = new ModelAkis(await anahtarDeposu(nativeMi, MODEL_ANAHTARI))
    await model.yukle((await depo.ayarOku('model.soru')) === '1')

    let toren: { ac: () => void } | null = null
    const defter = defteriBagla(durum, depo, () => toren?.ac(), model)
    const arsiv = arsiviBagla(durum, depo, defter.sayfayaGit, model)
    const kapsul = kapsuleBagla(depo)
    const kitaplik = kitapligiBagla(durum, depo, () => {
      defter.ciz()
      arsiv.gecenYilCiz()
    })
    toren = toreniBagla(durum, depo, () => {
      defter.ciz()
      arsiv.gecenYilCiz()
    })
    fihristiBagla(durum, depo, defter.sayfayaGit, () => toren?.ac())
    kilidiBagla(kitaplik.ac)
    yakmayiBagla()
    /*
     * Anlam araması — varsayılan KAPALI. Açıksa gömücü yükleniyor ve eksik
     * kayıtlar arka planda indeksleniyor. Model kodu ayrı bir parçada:
     * özellik kapalıyken tek bayt inmiyor (KARARLAR.md · K-029).
     */
    let akis: GomuAkis | null = null
    let gomucuKapat: (() => void) | null = null
    let gomuDinleyici: () => void = () => {}

    const gomuyuKur = async (): Promise<void> => {
      if (akis) return
      const { gercekGomucu } = await import('./ekran/gomucuIsci.js')
      const g = gercekGomucu((asama, oran) =>
        akis?.asamaYaz(oran > 0 && oran < 1 ? `${asama} %${Math.round(oran * 100)}` : asama),
      )
      gomucuKapat = g.kapat
      akis = new GomuAkis(depo, g, belgeOneki)
      akis.dinle(() => gomuDinleyici())
      durum.sorguGom = (metin) => g.goc([sorguOneki(metin)]).then((v) => v[0] ?? null)
      await akis.tazele()
      gomuDinleyici()
      void akis.calistir()
    }

    indekslemeyiDurdur = () => {
      akis?.dur()
      gomucuKapat?.()
      /* Kilitlenince senkron da duruyor: anahtar bellekten silinecek
         ve veritabanı kapanacak (K-021). */
      senkronAkis?.dur()
    }
    if ((await depo.ayarOku('gomu.acik')) === '1') void gomuyuKur()

    /*
     * Cihazlar arası senkron — varsayılan KAPALI (KARARLAR.md · K-036).
     *
     * Defter Kimliği girilmemişse tek bayt inmiyor ve tek istek
     * çıkmıyor: hem `senkronDepo` hem `senkronAkis` dinamik import'la
     * geliyor. Kapalıyken uygulama bugünkü gibi çevrimdışı.
     */
    const kodDepo = await anahtarDeposu(nativeMi, SENKRON_KODU)
    let senkronKod: string | null = null
    try {
      senkronKod = await kodDepo.oku()
    } catch {
      senkronKod = null
    }
    let senkronAkis: SenkronAkisTip | null = null
    let senkronKullanim: { satir: number; bayt: number } | null = null
    let senkronDinleyici: () => void = () => {}
    let senkronSunucu: SunucuTip | null = null

    const senkronuKur = async (kod: string): Promise<void> => {
      const [{ kimlikTuret }, { SenkronDepo, sunucuAyari }, { SenkronAkis }] = await Promise.all([
        import('./cekirdek/senkronKimlik.js'),
        import('./veri/senkronDepo.js'),
        import('./senkronAkis.js'),
      ])
      const kimlik = await kimlikTuret(kod)
      if (!kimlik) throw new Error('Defter Kimliği geçersiz.')
      /* Cihazda doğrudan Neon, tarayıcıda kendi kaynağımızdan (K-037). */
      senkronSunucu = new SenkronDepo(sunucuAyari(), kimlik)
      senkronAkis = new SenkronAkis(depo, senkronSunucu, kimlik)
      senkronAkis.dinle(() => senkronDinleyici())
      await senkronAkis.tazele()
    }

    const senkronTur = async (): Promise<void> => {
      if (!senkronAkis || kilit.durum === 'kilitli') return
      const oldu = await senkronAkis.calistir()
      if (oldu) {
        senkronKullanim = await senkronSunucu!.kullanim().catch(() => senkronKullanim)
        /* Uzaktan gelen kayıtlar ekrana düşsün. */
        await durum.yenile()
      }
      senkronDinleyici()
    }

    if (senkronKod) {
      try {
        await senkronuKur(senkronKod)
        void senkronTur()
      } catch (e) {
        console.warn('[defter] senkron kurulamadı', e)
      }
    }

    ayarlariBagla({
      kilit,
      sifreli: acilis.sifreli,
      /*
       * Kilit kurulurken sarmalanacak anahtar: defterin ŞU AN şifreli
       * olduğu anahtar.
       *
       * Burada `kilit.anaAnahtar` yalnız başınaydı ve kilit
       * 'kurulusuz' iken o her zaman null dönüyor. Sonuç: kilit kuran
       * kullanıcıya YENİ bir ana anahtar üretiliyor, ama cihazdaki
       * SQLCipher dosyası hâlâ Keychain'deki eski anahtarla şifreli ve
       * kodda hiçbir yerde rekey yok. Hata o oturumda görünmüyordu;
       * bir sonraki açılışta doğru PIN'le bile defter açılmıyordu
       * (KARARLAR.md · K-021, K-036).
       */
      mevcutAnahtar: async () =>
        kilit.anaAnahtar ?? (acilis.sifreli ? (await veritabaniAnahtari()).anahtar : null),
      db: surucu,
      depo,
      degisti: () => defter.ciz(),
      yenidenYukle: () => location.reload(),
      gomu: {
        acikMi: () => !!akis,
        durum: () =>
          akis?.durum ?? { calisiyor: false, bekleyen: 0, toplam: 0, asama: '', hata: null },
        ac: async () => {
          await depo.ayarYaz('gomu.acik', '1')
          await gomuyuKur()
        },
        kapat: async () => {
          indekslemeyiDurdur()
          akis = null
          gomucuKapat = null
          durum.sorguGom = null
          await depo.ayarYaz('gomu.acik', '0')
          await depo.gomulariSil()
          gomuDinleyici()
        },
        dinle: (f) => {
          gomuDinleyici = f
        },
      },
      senkron: {
        acikMi: () => !!senkronAkis,
        kod: () => senkronKod,
        durum: () =>
          senkronAkis?.durum ?? {
            calisiyor: false, bekleyen: 0, asama: '', hata: null, sonSenkron: null,
          },
        kullanim: () => senkronKullanim,
        ac: async (kod) => {
          await kodDepo.yaz(kod)
          senkronKod = kod
          await senkronuKur(kod)
          senkronDinleyici()
        },
        kapat: async () => {
          senkronAkis?.dur()
          /* Sunucudaki şifreli kopya siliniyor — "bizden talep etmenize
             gerek yok" sözünün karşılığı. */
          await senkronSunucu?.hepsiniSil().catch(() => {})
          await kodDepo.sil().catch(() => {})
          await depo.ayarYaz('senkron.sonGorulen', '0')
          await depo.senkronHepsiniIsaretle()
          senkronAkis = null
          senkronSunucu = null
          senkronKod = null
          senkronKullanim = null
          senkronDinleyici()
        },
        simdi: senkronTur,
        dinle: (f) => {
          senkronDinleyici = f
        },
      },
      dil: {
        simdiki: () => secilenDil,
        degistir: async (d) => {
          localStorage.setItem('defter.dil', d)
          location.reload()
        },
      },
      model: {
        anahtarVar: () => model.acik,
        kuyruk: () => model.kuyruk,
        yaz: (a) => model.anahtarYaz(a),
        sil: () => model.anahtarSil(),
        soruAcik: () => model.soruAcik,
        soruDegistir: async (a) => {
          model.soruAcik = a
          await depo.ayarYaz('model.soru', a ? '1' : '0')
          defter.ciz()
        },
      },
    })

    /*
     * Hiç defter yoksa kitaplık açılır. Son defter silindiğinde ya da
     * kayıt hiç açılmadığında yazma alanı yetim bir defter kimliğine
     * yazmaya çalışırdı (K-025).
     */
    if (!durum.aktifDefter) void kitaplik.ac()

    durum.dinle(() => {
      defter.ciz()
      arsiv.gecenYilCiz()
    })

    /* Öne gelince eşitle — arka planda sessizce değil, uygulama açıkken. */
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void senkronTur()
    })
    defter.ciz()
    arsiv.gecenYilCiz()
    await kapsul.ciz()

    const olcVeYenile = async (): Promise<void> => {
      const yeni = sayfaOlc()
      const eski = durum.olcu
      if (
        yeni.hacim === eski.hacim &&
        yeni.gunBasligi === eski.gunBasligi &&
        yeni.kayitSabit === eski.kayitSabit &&
        yeni.kenarSabit === eski.kenarSabit &&
        yeni.soruSabit === eski.soruSabit &&
        yeni.yazmaAlani === eski.yazmaAlani
      )
        return
      durum.olcu = yeni
      const sondaydi = durum.aktifSayfa === durum.sonSayfa
      await durum.yenile()
      if (sondaydi) durum.aktifSayfa = durum.sonSayfa
      defter.ciz()
    }
    await olcVeYenile()

    let olcumZaman: ReturnType<typeof setTimeout> | undefined
    addEventListener('resize', () => {
      clearTimeout(olcumZaman)
      olcumZaman = setTimeout(() => void olcVeYenile(), 220)
    })

    await kilitTeklifi(durum, depo, kilit)
  }
}

/**
 * Üçüncü yazma gününden sonra bir kez sessizce teklif.
 * İlk açılışta kurulum sormuyoruz: o an boş sayfa ve soru var (K-019).
 */
async function kilitTeklifi(
  durum: Durum,
  depo: Depo,
  kilit: Kilit,
): Promise<void> {
  if (kilit.durum !== 'kurulusuz') return
  if (durum.yonlendirme.gun < 3) return
  if (await depo.ayarOku('kilit.teklifEdildi')) return

  const kart = $('#kilitTeklif')
  const kapat = async () => {
    kart.classList.remove('acik')
    await depo.ayarYaz('kilit.teklifEdildi', '1')
  }
  $('#tekSonra').onclick = () => void kapat()
  $('#tekKur').onclick = async () => {
    await kapat()
    $('#ayarlarBtn').click()
  }
  kart.classList.add('acik')
}

void baslat().catch((e: unknown) => {
  console.error('[defter] açılamadı', e)
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div style="position:fixed;inset:auto 16px 16px;z-index:99;font-family:system-ui;
      font-size:13px;color:#E0D4BA;background:#241D14;border:1px solid #6155447a;
      border-radius:6px;padding:12px 14px;max-width:34ch">
      Defter açılamadı. Ayrıntı konsolda.</div>`,
  )
})
