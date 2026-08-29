import { Durum } from './durum.js'
import { arsiviBagla } from './ekran/arsiv.js'
import { defteriBagla } from './ekran/defter.js'
import { fihristiBagla } from './ekran/fihrist.js'
import { kapsuleBagla } from './ekran/kapsul.js'
import { kilidiBagla } from './ekran/kilit.js'
import { kitapligiBagla } from './ekran/kitaplik.js'
import { sayfaOlc } from './ekran/olcum.js'
import { toreniBagla } from './ekran/toren.js'
import { yakmayiBagla } from './ekran/yak.js'
import { defteriAc } from './veri/db.js'
import { Depo } from './veri/depo.js'
import { surucuSec } from './veri/surucu.js'

/**
 * Yayınlanan önizleme derlemesini işaretler.
 *
 * Tarayıcı derlemesinde veritabanı şifresiz ve kilit yok; bu, adresi bilen
 * herkesin açabildiği bir yerde söylenmeden geçilemez. Yeni bir kutu ya da
 * uyarı çubuğu değil — üst şeritteki mevcut marka yazısına eklenen iki
 * kelime (KARARLAR.md · K-013).
 */
function onizlemeyiIsaretle(): void {
  if (!import.meta.env.VITE_ONIZLEME) return
  const marka = document.querySelector('.marka')
  if (marka) marka.textContent = 'defter · önizleme'
  console.warn(
    '[defter] Önizleme derlemesi: veritabanı şifresiz, kilit yok. ' +
      'Gerçek günlük için değil.',
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
  const { surucu, sifreli } = await surucuSec()
  const depo = new Depo(await defteriAc(surucu))
  const bayrak = new URLSearchParams(location.search)

  /* Geliştirme aracı: defteri boşalt. Uygulamada düğmesi yok. */
  if (bayrak.has('sifirla')) {
    const { defteriSifirla } = await import('./veri/sifirla.js')
    await defteriSifirla(surucu)
    /* Bayrağı adresten düşür: yoksa her yenileme defteri tekrar siler. */
    bayrakDusur('sifirla')
    console.info('[defter] sıfırlandı — defter boş.')
  }

  /* Demo verisi yalnızca geliştirici bayrağıyla. Gerçek açılış sıfır kayıt. */
  if (bayrak.has('tohum')) {
    const { tohumEk } = await import('./veri/tohum.js')
    await tohumEk(depo)
  }

  const durum = new Durum(depo)
  durum.sifreli = sifreli

  /* Son açık defter geri gelsin. */
  const sonDefter = await depo.ayarOku('aktifDefter')
  if (sonDefter && (await depo.defterGetir(sonDefter))) depo.defteriSec(sonDefter)

  await durum.yenile()
  durum.aktifSayfa = durum.sonSayfa
  durum.soruyuTazele(new Date().toISOString().slice(0, 10))

  let toren: { ac: () => void } | null = null
  const defter = defteriBagla(durum, depo, () => toren?.ac())
  const arsiv = arsiviBagla(durum, defter.sayfayaGit)
  const kapsul = kapsuleBagla(depo)
  fihristiBagla(durum, depo, defter.sayfayaGit, () => toren?.ac())
  const kitaplik = kitapligiBagla(durum, depo, () => {
    defter.ciz()
    arsiv.gecenYilCiz()
  })
  toren = toreniBagla(durum, depo, () => {
    defter.ciz()
    arsiv.gecenYilCiz()
  })
  kilidiBagla(kitaplik.ac)
  yakmayiBagla()

  durum.dinle(() => {
    defter.ciz()
    arsiv.gecenYilCiz()
  })

  defter.ciz()
  arsiv.gecenYilCiz()
  await kapsul.ciz()

  /*
   * Sayfa kapasitesi ekran ölçülerine bağlı. İlk çizimden sonra kağıt
   * DOM'da olduğu için ölçülebiliyor; ölçüm değiştiyse sayfalar yeniden
   * akıtılıyor. Ekran döndüğünde ya da pencere boyutlandığında tekrar.
   */
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
