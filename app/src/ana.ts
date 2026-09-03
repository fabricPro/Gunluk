import { Durum } from './durum.js'
import { cihazDili, type Dil } from './cekirdek/dil.js'
import { S } from './cekirdek/metin.js'
import { GomuAkis } from './gomuAkis.js'
import { ModelAkis } from './modelAkis.js'
import type { SenkronAkis as SenkronAkisTip } from './senkronAkis.js'
import type { Sunucu as SunucuTip } from './veri/senkronDepo.js'
import type { KasaYapici as KasaYapiciTip } from './hesapAkis.js'
import { belgeOneki, sorguOneki } from './cekirdek/gomuModel.js'
import { Kilit } from './kilitAkis.js'
import { arsiviBagla } from './ekran/arsiv.js'
import { ayarlariBagla } from './ekran/ayarlar.js'
import { defteriBagla } from './ekran/defter.js'
import { fihristiBagla } from './ekran/fihrist.js'
import { kilidiBagla } from './ekran/kilit.js'
import { ACILMADI, kilitEkraniBagla, type HesapDurum } from './ekran/kilitEkrani.js'
import { kitapligiBagla } from './ekran/kitaplik.js'
import { kapsuleBagla } from './ekran/kapsul.js'
import { sayfaOlc } from './ekran/olcum.js'
import { dilKur } from './ekran/ortak.js'
import { toreniBagla } from './ekran/toren.js'
import { yakmayiBagla } from './ekran/yak.js'
import { defteriAc } from './veri/db.js'
import { Depo } from './veri/depo.js'
import { anahtariDayat, veritabaniAnahtari } from './veri/kripto.js'
import {
  HESAP_KIMLIGI,
  MODEL_ANAHTARI,
  SENKRON_KODU,
  anahtarDeposu,
} from './veri/anahtarDepo.js'
import { cihazDepo, tarayiciDepo } from './veri/kilitDepo.js'
import { surucuSec } from './veri/surucu.js'
import type { SqlSurucu } from './veri/db.js'

const $ = (s: string): HTMLElement => document.querySelector<HTMLElement>(s)!

/** Tek seferlik geliştirme bayrağını adresten temizler. */
function bayrakDusur(ad: string): void {
  const u = new URL(location.href)
  u.searchParams.delete(ad)
  history.replaceState(null, '', u.pathname + u.search + u.hash)
}

async function baslat(): Promise<void> {
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

  /**
   * Kasa sunucusunu kuran şey.
   *
   * Kurtarma defter AÇILMADAN önce koşuyor: elde ne veritabanı var ne
   * anahtar. Bu yüzden burada, `uygulamayiKur`un dışında
   * (KARARLAR.md · K-038).
   */
  const kasaYapici = async (): Promise<KasaYapiciTip> => {
    const [{ Kasa, sunucuAyari }] = await Promise.all([import('./veri/senkronDepo.js')])
    const ayar = sunucuAyari()
    return (kimlik) => new Kasa(ayar, kimlik)
  }

  /**
   * Defteri hesapla açar — hem giriş hem yeni hesap bunu kullanıyor.
   *
   * Sıra bağlayıcı: kod güvenli depoya ancak ana anahtar bellekteyken
   * yazılabiliyor (tarayıcıda sarmalanıyor), yani kilit kurulduktan
   * SONRA. `uygulamayiKur` da kodu oradan okuyup senkronu kuruyor ve
   * su seviyesi sıfırdan başladığı için defterin tamamı iniyor.
   */
  /**
   * Hesabın türetilmiş kimlik bilgisini saklar.
   *
   * Senkron, defter satırlarının durduğu hesapla oturum açmak zorunda;
   * yeniden yüklemede elde şifre olmadığı için türetilmiş hâli
   * saklanıyor (KARARLAR.md · K-043).
   */
  const hesapKimligiYaz = async (ad: string, sifre: string): Promise<void> => {
    const { hesapKimligiTuret } = await import('./cekirdek/hesapKimlik.js')
    const k = await hesapKimligiTuret(ad, sifre)
    if (!k) return
    await (await anahtarDeposu(nativeMi, HESAP_KIMLIGI)).yaz(`${k.eposta}\n${k.parola}`)
  }

  /** Saklanan kimlik bilgisi; yoksa `null`. */
  const hesapKimligiOku = async (): Promise<{ eposta: string; parola: string } | null> => {
    const ham = await (await anahtarDeposu(nativeMi, HESAP_KIMLIGI)).oku().catch(() => null)
    const [eposta, parola] = (ham ?? '').split('\n')
    return eposta && parola ? { eposta, parola } : null
  }

  const defteriKodla = async (kod: string, sifre: string, ad?: string): Promise<void> => {
    const av = await kilit.kur(sifre)
    anahtariDayat(av)
    await (await anahtarDeposu(nativeMi, SENKRON_KODU)).yaz(kod)
    /*
     * Hesap kimliği de BURADA yazılıyor, daha önce değil.
     *
     * Tarayıcıda güvenli depo sırları ana anahtarla sarmalıyor; ana
     * anahtar da ancak `kilit.kur` sonrası bellekte oluyor. Önce
     * yazmayı denemek sessizce atıyor ve hesap açma "bağlantını
     * kontrol et" diye düşüyordu.
     */
    if (ad) await hesapKimligiYaz(ad, sifre)
    /*
     * Ekran açılış BAŞARILI olunca gizleniyor, önce değil.
     *
     * Önce gizlenirken `uygulamayiKur` düşerse kullanıcı ölü bir
     * kabukla kalıyordu: kilit ekranı kapalı, veritabanı yok, sıfır
     * girdi — ve ekrandaki tek yazı "bağlantını kontrol et" diyerek
     * yanlış yeri gösteriyordu; oysa hesap açılmıştı, açılamayan
     * yerel defterdi (KARARLAR.md · K-039).
     */
    try {
      await uygulamayiKur()
    } catch (e) {
      console.error('[defter] hesap kuruldu ama defter acilamadi', e)
      anahtariDayat(null)
      kilit.kilitle()
      await kilitEkrani.goster('ac')
      kilitEkrani.uyar(S('kil.acilmadi'))
      const isaret = new Error('defter-acilmadi')
      isaret.name = ACILMADI
      throw isaret
    }
    kilitEkrani.gizle()
  }

  /**
   * Karşılama ekranındaki iki hesap yolu.
   *
   * `giris` hesap YARATMIYOR: şifresini yanlış yazan kullanıcıya sessizce
   * boş bir defter açmak, defterini kaybettiğini anlamadan üstüne
   * yazdırmak olurdu (KARARLAR.md · K-039).
   */
  /** Hesap açıldıysa gösterilecek Defter Kimliği; bir kez okunuyor. */
  let yeniHesapKodu: string | null = null

  const hesapYollari = {
    giris: async (ad: string, sifre: string): Promise<HesapDurum> => {
      const { girisYap } = await import('./hesapAkis.js')
      const s = await girisYap(ad, sifre, await kasaYapici())
      if (s.durum !== 'tamam') return s.durum
      await defteriKodla(s.kod, sifre, ad)
      return 'tamam'
    },
    ac: async (ad: string, sifre: string): Promise<HesapDurum> => {
      const { hesapAc } = await import('./hesapAkis.js')
      const s = await hesapAc(ad, sifre, await kasaYapici())
      if (s.durum !== 'tamam') return s.durum
      await defteriKodla(s.kod, sifre, ad)
      /* Kod bir kez gösteriliyor: şifre unutulursa tek yol bu. */
      yeniHesapKodu = s.kod
      return 'tamam'
    },
    /**
     * Açma ekranından çıkış: bu cihazı temizleyip karşılamaya döner.
     *
     * Üç şey birden siliniyor ve üçü de gerekli. Mühür yuvaları
     * kalırsa yeni kurulumdaki yeni anahtar onları açamaz ve açılış
     * "yuva var ama hiçbiri açılmadı" diye durur — uygulama bir daha
     * açılmazdı (KARARLAR.md · K-039).
     *
     * Yuvalar buradan siliniyor çünkü kilitliyken veritabanı hiç
     * açılmıyor; worker'ın `unut`u defter açıkken çalışıyor.
     */
    temizle: async (): Promise<void> => {
      const { yuvalariSil } = await import('./veri/muhurYuva.js')
      for (const ad of [SENKRON_KODU, MODEL_ANAHTARI, HESAP_KIMLIGI])
        await (await anahtarDeposu(nativeMi, ad)).sil().catch(() => {})
      await yuvalariSil()
      await kilit.kaldir()
      anahtariDayat(null)
      location.reload()
    },
  }

  const kilitEkrani = kilitEkraniBagla(kilit, async (anaAnahtar) => {
    anahtariDayat(anaAnahtar)
    kilitEkrani.gizle()
    try {
      await uygulamayiKur()
    } catch (e) {
      /*
       * Doğru parolayla bile açılamayan tek durum: mühürlü dosya bozuk.
       * Kullanıcı BOŞ bir ekranla kalmasın — kilit ekranı geri geliyor ve
       * ne olduğunu söylüyor (KARARLAR.md · K-037).
       */
      console.error('[defter] defter acilamadi', e)
      anahtariDayat(null)
      kilit.kilitle()
      await kilitEkrani.goster('ac')
      kilitEkrani.uyar(S('kil.acilmadi'))
    }
  }, nativeMi ? undefined : hesapYollari)

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
    await kilitEkrani.goster('ac')
    return
  }

  /*
   * Tarayıcıda kilit ZORUNLU (KARARLAR.md · K-037).
   *
   * Cihazda SQLCipher zaten devrede ve kilit isteğe bağlı bir ek katman.
   * Tarayıcıda öyle bir taban yok: anahtar olmadan defter diske mühürlü
   * yazılamaz, yani parola belirlemek "istersen" değil, şifrelemenin
   * kendisi. Bu ekran atlanamıyor.
   *
   * Şifresiz eski defter varsa kaybolmuyor: mühürlü sürücü açılışta onu
   * bulup taşıyor ve düz kopyayı siliyor.
   */
  if (!nativeMi && kilit.durum === 'kurulusuz') {
    await kilitEkrani.goster('karsilama')
    return
  }
  await uygulamayiKur()

  /* ── uygulamanın kendisi ─────────────────────────────────── */

  async function uygulamayiKur(): Promise<void> {
    const acilis = await surucuSec()
    surucu = acilis.surucu

    /*
     * Mühür diske borçlandırmalı yazılıyor (son yazmadan ~1.5 sn sonra).
     * Sekme kapanırken ya da arka plana geçerken bekleyen varsa hemen
     * yazılsın: aradaki yazı kaybolmasın.
     *
     * Tam güvence değil ve öyle anlatılmıyor — sekme ÇÖKERSE son mühürden
     * sonrası gider. Yakalanabilen iki an bunlar (KARARLAR.md · K-037).
     * Düz yolda `muhurleSimdi` hiçbir şey yapmıyor.
     */
    const muhurle = (): void => void acilis.muhurleSimdi()
    window.addEventListener('pagehide', muhurle)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') muhurle()
    })

    if (acilis.tasindi)
      console.info('[defter] Sifresiz eski defter muhurluye tasindi; duz kopya silindi.')
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
    /* Hesap kimliği cihazda var mı — `hesapli` bunu da sayıyor. */
    let hesapKimligiVar = !!(await hesapKimligiOku())
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
      /*
       * Oturum HESAP kimliğiyle açılıyor, şifreleme KOD kimliğiyle
       * yapılıyor. Defter satırları hesabın altında duruyor; senkron
       * koddan türeyen ayrı bir hesapla girseydi onları göremez, boş
       * bir defter açardı (KARARLAR.md · K-043).
       *
       * HESAP KİMLİĞİ YOKSA SENKRON HİÇ KURULMUYOR.
       *
       * Burada eskiden koddan türeyen kimliğe düşülüyordu ve iki ayrı
       * şey birden bozuluyordu (K-047):
       *
       *   · Yanlış hesaba yazma. Koddan türeyen kimlikle oturum
       *     açılınca sunucuda AYRI bir hesap oluşuyor ve defterin
       *     tamamı oraya gidiyordu; kullanıcı kendi ad/şifresiyle
       *     girince onu göremiyordu.
       *   · Çerez kavgası. Çerez kavanozu KAYNAĞA ait, tek tane. Kasa
       *     bir kimlikle, senkron başka bir kimlikle oturum açınca
       *     birbirlerinin çerezini eziyorlar: kasa girişi yapıyor,
       *     senkron araya girip oturumu değiştiriyor ve kasanın
       *     isteği BAŞKA hesap olarak koşuyor. Aynı şifre bir denemede
       *     "kasan yok", ötekinde "kasa açılmadı" veriyordu — mantık
       *     hatası değil, yarış.
       *
       * Bir anda tek kimlik etkin olabilir. Kimlik yoksa defter yerelde
       * açılmaya devam ediyor; kullanıcı ayarlardan hesabına bağlıyor.
       */
      const oturumKimligi = await hesapKimligiOku()
      if (!oturumKimligi) {
        console.warn('[defter] senkron kurulmadı: bu cihazda hesap kimliği yok')
        return
      }
      /*
       * Su seviyesi HESABA özgü — kurulumdan önce denkleştiriliyor.
       *
       * `senkron.sonGorulen` sunucudaki sürüm akışındaki konum, ve o dizi
       * bütün hesaplar için ortak. Başka bir hesapta yükselmiş bir seviye
       * yeni hesapta hiçbir satırı "yeni" saymıyor: cihaz yazdığını itiyor
       * ama hiçbir şey çekmiyordu — senkron tek yönlü görünüyordu
       * (KARARLAR.md · K-048).
       *
       * Buraya konuyor çünkü dört yol da (giriş, hesap aç, buluta taşı,
       * açılış) buradan geçiyor; `hesabaTasi`da tek başına durduğunda
       * ötekiler açıkta kalmıştı.
       */
      const { suSeviyesiniDenkle } = await import('./senkronKurulum.js')
      const hesapAnahtari = oturumKimligi.eposta.split('@')[0]!
      if (await suSeviyesiniDenkle(depo, hesapAnahtari))
        console.info('[defter] senkron: su seviyesi sıfırlandı, defter baştan iniyor')
      /* Cihazda doğrudan Neon, tarayıcıda kendi kaynağımızdan (K-037). */
      senkronSunucu = new SenkronDepo(sunucuAyari(), kimlik, oturumKimligi)
      senkronAkis = new SenkronAkis(depo, senkronSunucu, kimlik)
      senkronAkis.dinle(() => senkronDinleyici())
      await senkronAkis.tazele()
    }

    const senkronTur = async (): Promise<void> => {
      if (!senkronAkis || kilit.durum === 'kilitli') return
      await senkronAkis.calistir()
      /*
       * Ekran YALNIZCA gerçekten bir şey değiştiyse tazeleniyor.
       *
       * Eskiden `calistir()`in "hata almadan koştu" dönüşü "değişti"
       * diye okunuyordu ve `durum.yenile()` her turda çağrılıyordu.
       * `yenile()` de dinleyicileri uyarıyor, dinleyici senkronu
       * yeniden borçlandırıyordu: 4 saniyede bir, defter açık kaldığı
       * sürece dönen bir döngü. Hiçbir şey değişmezken bile
       * (KARARLAR.md · K-044).
       */
      if (senkronAkis.sonTurDegisti) await durum.yenile()
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
      tarayiciMi: !nativeMi,
      kaliciIzin: acilis.kaliciIzin,
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
            sonCekilen: 0, okunamayan: 0,
          },
        kullanim: () => senkronKullanim,
        /*
         * Kullanım sayısı her turda değil, ayarlar kâğıdı açılınca
         * isteniyor: istek defterin BÜTÜN şifreli gövdelerini indiriyor
         * ve bu sayı yalnızca orada görünüyor (K-044).
         */
        kullanimTazele: async () => {
          if (!senkronSunucu) return
          senkronKullanim = await senkronSunucu.kullanim().catch(() => senkronKullanim)
          senkronDinleyici()
        },
        /* Hesaplı defterde senkron ayrı bir düğme değil (K-039). */
        /*
         * "Hesaba bağlı" = kod VAR **ve** hesap kimliği var.
         *
         * Yalnızca koda bakmak yanlıştı: K-043'ten önce giriş yapmış
         * cihazlarda kod var ama hesap kimliği yok. O cihaz kendini
         * bağlı sanıyor, oysa senkron hiçbir hesaba giremiyor — ve
         * "buluta taşı" düğmesi de gizli olduğu için kullanıcının
         * defterini hesabına bağlamasının hiçbir yolu kalmıyordu
         * (KARARLAR.md · K-046).
         */
        hesapli: () => !!senkronKod && hesapKimligiVar,
        /** Hesap yeni açıldıysa gösterilecek kod; bir kez okunuyor. */
        yeniKod: () => {
          const k = yeniHesapKodu
          yeniHesapKodu = null
          return k
        },
        /**
         * Yerel defteri hesaba taşır.
         *
         * Mevcut kayıtlar kaybolmuyor: `senkronHepsiniIsaretle` defterin
         * tamamını gönderilecek diye işaretliyor ve ilk turda yükleniyor.
         */
        hesabaTasi: async (ad, sifre) => {
          const { hesapAc } = await import('./hesapAkis.js')
          const s = await hesapAc(ad, sifre, await kasaYapici())
          /* Açılamayan bir kasanın üstüne yazılmıyor; `hesapAc` de
             yazmıyor, burada da sessizce başarı denmiyor (K-042). */
          if (s.durum !== 'tamam') return null
          const kod = s.kod
          await kodDepo.yaz(kod)
          /* Senkron bu hesapla oturum açacak (K-043). Defter zaten
             açık, yani ana anahtar bellekte. */
          await hesapKimligiYaz(ad, sifre)
          hesapKimligiVar = true
          senkronKod = kod
          /* Su seviyesini `senkronuKur` sıfırlıyor: hesap değişti (K-048).
             Burada da yapmak ikinci bir doğruluk kaynağı olurdu. */
          await depo.senkronHepsiniIsaretle()
          await senkronuKur(kod)
          void senkronTur()
          senkronDinleyici()
          return kod
        },
        /**
         * Çıkış — cihazda iz bırakmıyor, sunucudaki kopya DURUYOR.
         *
         * Mühür yuvaları da siliniyor. Yalnızca kilit kaydı silinseydi
         * yuvalar yetim kalır ve yeni kurulumdaki yeni anahtar onları
         * açamayacağı için uygulama bir daha açılmazdı (K-039).
         */
        cikis: async () => {
          senkronAkis?.dur()
          indekslemeyiDurdur()
          await kodDepo.sil().catch(() => {})
          for (const ad of [MODEL_ANAHTARI, HESAP_KIMLIGI])
            await (await anahtarDeposu(nativeMi, ad)).sil().catch(() => {})
          const { defteriSifirla } = await import('./veri/sifirla.js')
          await defteriSifirla(surucu!)
          await acilis.unut()
          await kilit.kaldir()
          anahtariDayat(null)
          location.reload()
        },
        simdi: senkronTur,
        /* Seviye yanlış yerde takıldıysa kullanıcının elindeki tek yol. */
        bastanIndir: async () => {
          const { bastanIndir } = await import('./senkronKurulum.js')
          await bastanIndir(depo)
          await senkronTur()
        },
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

    /*
     * Yazdıktan sonra eşitleme — borçlandırmalı.
     *
     * Hesaplı defterde senkron ayrı bir düğme değil, işleyişin kendisi
     * (KARARLAR.md · K-039). Eskiden kullanıcı ayarlardan "şimdi eşitle"
     * diyordu; artık demiyor, o yüzden değişiklikten sonra kendiliğinden
     * dönmesi gerekiyor. Her tuşta değil: yazı bırakıldıktan bir süre
     * sonra bir kez.
     */
    let senkronZaman: ReturnType<typeof setTimeout> | null = null
    const senkronuBorclan = (): void => {
      if (!senkronAkis) return
      if (senkronZaman) clearTimeout(senkronZaman)
      senkronZaman = setTimeout(() => {
        senkronZaman = null
        void senkronTur()
      }, 4000)
    }

    durum.dinle(() => {
      defter.ciz()
      arsiv.gecenYilCiz()
      senkronuBorclan()
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
