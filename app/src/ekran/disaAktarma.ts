import { markdownAktar, type DefterDokum } from '../cekirdek/disaAktar.js'
import type { Depo } from '../veri/depo.js'
import { dosyaAdi, dosyaKaydet } from './dosya.js'

/**
 * Açık dışa aktarma — şifresiz Markdown (KARARLAR.md · K-003).
 *
 * `yalnizca` verilirse tek defter çıkar; ayarlardan çağrıldığında hepsi.
 * Defter kartında silmeden önce bir çıkış yolu sunmak için tekil hâli
 * gerekiyordu (K-025).
 */
export async function markdownIndir(depo: Depo, yalnizca?: string): Promise<void> {
  const hepsi = await depo.defterler()
  const defterler = yalnizca ? hepsi.filter((d) => d.id === yalnizca) : hepsi
  const eskiDefter = depo.aktifDefterId
  const dokumler: DefterDokum[] = []
  for (const d of defterler) {
    depo.defteriSec(d.id)
    dokumler.push({
      defter: d,
      gunler: await depo.gunler(),
      kenarlar: await depo.kenarlar(),
      basliklar: await depo.basliklar(),
      ekler: await depo.ekleriTam(),
    })
  }
  depo.defteriSec(eskiDefter)
  await dosyaKaydet(
    `${dosyaAdi('defter')}.md`,
    markdownAktar(dokumler),
    'text/markdown;charset=utf-8',
  )
}
