import type { DefterBilgi, Ek, Gun, KenarNotu } from './tipler.js'
import { romen, tamTarih } from './tr.js'

/**
 * Açık dışa aktarma (KARARLAR.md · K-003).
 *
 * Şifresiz, düz Markdown. Sebebi tek: on yıl sonra bu uygulama var
 * olmayabilir ve günlüğün okunabilirliği uygulamanın ömrüne bağlanamaz.
 * Yalnızca kullanıcının açık eylemiyle üretilir.
 */

export interface DefterDokum {
  defter: DefterBilgi
  gunler: Gun[]
  kenarlar: Map<string, KenarNotu[]>
  basliklar: Map<string, string>
  /**
   * Ekler gövdesiyle birlikte — `data:` URI olarak gömülüyorlar.
   *
   * Dosyayı şişiriyor ama K-003'ün sözü bunu gerektiriyor: bu uygulama
   * var olmasa da günlük okunabilmeli. Ayrı klasöre yazılan görseller
   * .md'den kolayca ayrı düşer; gömülü olan on yıl sonra da açılır.
   */
  ekler?: Map<string, Ek>
}

const baslik = (d: DefterBilgi): string =>
  `${d.ad}${d.cilt > 1 ? ` · Cilt ${romen(d.cilt)}` : ''}`

export function markdownAktar(defterler: DefterDokum[]): string {
  const p: string[] = ['# Defter', '']
  const tarih = new Date().toISOString().slice(0, 10)
  p.push(`*${tarih} tarihinde dışa aktarıldı.*`, '')

  for (const { defter, gunler, kenarlar, basliklar, ekler } of defterler) {
    p.push(`## ${baslik(defter)}`, '')
    const kayitSayisi = gunler.reduce((n, g) => n + g.kayitlar.length, 0)
    p.push(`*${gunler.length} gün · ${kayitSayisi} kayıt${defter.kapandi ? ' · kapalı' : ''}*`, '')

    for (const gun of gunler) {
      if (!gun.kayitlar.length) continue
      p.push(`### ${gun.ad}, ${tamTarih(gun.tarih)}`, '')
      for (const k of gun.kayitlar) {
        const ad = basliklar.get(k.id)
        if (ad) p.push(`**${ad}**`, '')
        if (k.soru) p.push(`> ${k.soru}`, '')
        p.push(`**${k.saat}** — ${k.metin}${k.duzenlendi ? ' *(düzeltildi)*' : ''}`, '')
        const ek = ekler?.get(k.id)
        if (ek) p.push(`![ek](data:${ek.tur};base64,${ek.veri})`, '')
        for (const kenar of kenarlar.get(k.id) ?? [])
          p.push(`> *Kenar notu (${kenar.tarih}):* ${kenar.metin}`, '')
      }
    }
    p.push('')
  }
  return p.join('\n')
}
