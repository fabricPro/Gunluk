import { S } from '../cekirdek/metin.js'
import type { Gomucu } from '../cekirdek/gomucu.js'
import { BOYUT, MODEL_KIMLIK } from '../cekirdek/gomuModel.js'
/* YALNIZCA tip: değer olarak içe aktarmak transformers.js'i ana pakete çeker. */
import type { GomuIstek, GomuYanit } from '../veri/gomu-isci.js'

/** İndirme ve kurulum ilerlemesi; ayar kağıdı bunu gösteriyor. */
export type Ilerleme = (asama: string, oran: number) => void

/**
 * Worker'ı saran gerçek gömücü.
 *
 * Model ilk `goc` çağrısında indiriliyor (~130 MB) ve tarayıcının önbelleğinde
 * kalıyor. İndirme başarısız olursa hata yukarı çıkıyor ve arama gövdelemeyle
 * (K-027) çalışmaya devam ediyor — gömü bir EK, bir bağımlılık değil.
 */
export function gercekGomucu(ilerleme?: Ilerleme): Gomucu & { kapat: () => void } {
  const isci = new Worker(new URL('../veri/gomu-isci.ts', import.meta.url), { type: 'module' })
  const bekleyen = new Map<number, { coz: (v: Float32Array[]) => void; kir: (e: Error) => void }>()
  let sonId = 0

  isci.onmessage = (e: MessageEvent<GomuYanit>) => {
    const { id, vektorler, hata, anahtar, hazir, ilerleme: i } = e.data
    if (i) return void ilerleme?.(i.asama, i.oran)
    const b = bekleyen.get(id)
    if (!b) return
    bekleyen.delete(id)
    /* Worker dili bilmiyor; anahtar geldiyse çeviri burada. */
    if (hata) b.kir(new Error(anahtar ? S(anahtar) : hata))
    else b.coz(vektorler ?? (hazir ? [] : []))
  }
  isci.onerror = (e) => {
    for (const b of bekleyen.values()) b.kir(new Error(e.message || 'gömü worker hatası'))
    bekleyen.clear()
  }

  const cagir = (tip: GomuIstek['tip'], metinler?: string[]): Promise<Float32Array[]> =>
    new Promise((coz, kir) => {
      const id = ++sonId
      bekleyen.set(id, { coz, kir })
      isci.postMessage({ id, tip, metinler } satisfies GomuIstek)
    })

  return {
    kimlik: MODEL_KIMLIK,
    boyut: BOYUT,
    goc: (metinler) => (metinler.length ? cagir('goc', metinler) : Promise.resolve([])),
    kapat: () => isci.terminate(),
  }
}
