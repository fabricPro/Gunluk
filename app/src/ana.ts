import { Durum } from './durum.js'
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
import { toreniBagla } from './ekran/toren.js'
import { yakmayiBagla } from './ekran/yak.js'
import { defteriAc } from './veri/db.js'
import { Depo } from './veri/depo.js'
import { anahtariDayat } from './veri/kripto.js'
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
   * Kilit, veritabanının ÖNÜNDE. Kayıt güvenli depodan okunuyor; kilitliyken
   * ana anahtar bellekte olmadığı için veritabanı açılamıyor bile
   * (KARARLAR.md · K-021).
   */
  const nativeMi = !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    ?.isNativePlatform?.()
  const kilit = new Kilit(nativeMi ? await cihazDepo() : tarayiciDepo())
  await kilit.yukle()

  let surucu: SqlSurucu | null = null

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
    const bayrak = new URLSearchParams(location.search)

    if (bayrak.has('sifirla')) {
      const { defteriSifirla } = await import('./veri/sifirla.js')
      await defteriSifirla(surucu)
      bayrakDusur('sifirla')
      console.info('[defter] sıfırlandı — defter boş.')
    }
    if (bayrak.has('tohum')) {
      const { tohumEk } = await import('./veri/tohum.js')
      await tohumEk(depo)
    }

    const durum = new Durum(depo)
    durum.sifreli = acilis.sifreli

    const sonDefter = await depo.ayarOku('aktifDefter')
    if (sonDefter && (await depo.defterGetir(sonDefter))) depo.defteriSec(sonDefter)

    await durum.yenile()
    durum.aktifSayfa = durum.sonSayfa
    durum.soruyuTazele(new Date().toISOString().slice(0, 10))

    let toren: { ac: () => void } | null = null
    const defter = defteriBagla(durum, depo, () => toren?.ac())
    const arsiv = arsiviBagla(durum, defter.sayfayaGit)
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
    ayarlariBagla(kilit, acilis.sifreli, () => kilit.anaAnahtar, () => defter.ciz())

    durum.dinle(() => {
      defter.ciz()
      arsiv.gecenYilCiz()
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
