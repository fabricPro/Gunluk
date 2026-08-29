import { Durum } from './durum.js'
import { arsiviBagla } from './ekran/arsiv.js'
import { defteriBagla } from './ekran/defter.js'
import { fihristiBagla } from './ekran/fihrist.js'
import { kapsuleBagla } from './ekran/kapsul.js'
import { kilidiBagla } from './ekran/kilit.js'
import { yakmayiBagla } from './ekran/yak.js'
import { defteriAc } from './veri/db.js'
import { Depo } from './veri/depo.js'
import { surucuSec } from './veri/surucu.js'

/** Tek seferlik geliştirme bayrağını adresten temizler. */
function bayrakDusur(ad: string): void {
  const u = new URL(location.href)
  u.searchParams.delete(ad)
  history.replaceState(null, '', u.pathname + u.search + u.hash)
}

async function baslat(): Promise<void> {
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
  await durum.yenile()
  durum.aktifSayfa = durum.sonSayfa

  const defter = defteriBagla(durum, depo)
  const arsiv = arsiviBagla(durum, defter.sayfayaGit)
  const kapsul = kapsuleBagla(depo)
  fihristiBagla(durum, depo, defter.sayfayaGit)
  kilidiBagla(durum)
  yakmayiBagla()

  durum.dinle(() => {
    defter.ciz()
    arsiv.gecenYilCiz()
  })

  defter.ciz()
  arsiv.gecenYilCiz()
  await kapsul.ciz()
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
