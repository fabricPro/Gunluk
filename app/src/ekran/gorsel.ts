import { S } from './ortak.js'
import type { Ek } from '../cekirdek/tipler.js'

/**
 * Seçilen görseli deftere girecek hâle getirir.
 *
 * Ham dosya olduğu gibi saklanmıyor. İki sebep var, ikisi de ürünle ilgili:
 *
 * 1. **Boyut.** Ek base64 metin olarak veritabanında duruyor (K-023) ve
 *    mühürlü yedeğe olduğu gibi giriyor. Telefondan gelen 4 MB'lık bir
 *    fotoğraf yedeği tek başına şişirirdi. Uzun kenar kısaltılıp yeniden
 *    kodlanınca defterde duracağı boyuta iniyor.
 * 2. **EXIF.** Canvas'a yeniden çizmek bütün üstveriyi düşürür — konum,
 *    cihaz modeli, çekim zamanı. Bu bir yan etki değil, istenen şey:
 *    kullanıcının bir fotoğrafı deftere koyması GPS izini de koyması
 *    anlamına gelmemeli.
 */

/** Gösterim için yeterli; bunun ötesi sayfada görünmüyor, yalnızca şişiriyor. */
const UZUN_KENAR = 1400
const KALITE = 0.82
/** Kalite kademeli düşürülür; bunun altına inilmez. */
const EN_DUSUK_KALITE = 0.5
const HEDEF_BAYT = 400 * 1024

export class GorselHatasi extends Error {}

const olcekle = (en: number, boy: number): [number, number] => {
  const uzun = Math.max(en, boy)
  if (uzun <= UZUN_KENAR) return [en, boy]
  const k = UZUN_KENAR / uzun
  return [Math.max(1, Math.round(en * k)), Math.max(1, Math.round(boy * k))]
}

function yukle(dosya: Blob): Promise<HTMLImageElement> {
  return new Promise((coz, kir) => {
    const bag = URL.createObjectURL(dosya)
    const g = new Image()
    g.onload = () => {
      URL.revokeObjectURL(bag)
      coz(g)
    }
    g.onerror = () => {
      URL.revokeObjectURL(bag)
      kir(new GorselHatasi(S('gor.okunmadi')))
    }
    g.src = bag
  })
}

const base64 = (u: string): string => u.slice(u.indexOf(',') + 1)

/**
 * Görseli küçültüp yeniden kodlar; sonuç doğrudan `depo.ekYaz`'a verilebilir.
 * `kayitId` henüz bilinmiyor olabilir — yazarken kayıt sonra doğuyor.
 */
export async function gorseliHazirla(dosya: Blob, kayitId = ''): Promise<Ek> {
  const g = await yukle(dosya)
  const [en, boy] = olcekle(g.naturalWidth, g.naturalHeight)

  const tuval = document.createElement('canvas')
  tuval.width = en
  tuval.height = boy
  const ctx = tuval.getContext('2d')
  if (!ctx) throw new GorselHatasi(S('gor.islenemiyor'))
  ctx.drawImage(g, 0, 0, en, boy)

  /* Hedef boyutun altına inene kadar kaliteyi kademeli düşür. */
  let kalite = KALITE
  let veri = base64(tuval.toDataURL('image/jpeg', kalite))
  while (veri.length * 0.75 > HEDEF_BAYT && kalite > EN_DUSUK_KALITE) {
    kalite -= 0.12
    veri = base64(tuval.toDataURL('image/jpeg', kalite))
  }

  return { kayitId, tur: 'image/jpeg', veri, en, boy, bayt: Math.round(veri.length * 0.75) }
}

/** Ekten gösterime hazır kaynak. */
export const ekKaynak = (tur: string, veri: string): string => `data:${tur};base64,${veri}`
