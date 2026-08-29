import type { DefterBilgi, Gun, KenarNotu } from './tipler.js'
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
  kenarlar: Map<string, KenarNotu>
  basliklar: Map<string, string>
}

const baslik = (d: DefterBilgi): string =>
  `${d.ad}${d.cilt > 1 ? ` · Cilt ${romen(d.cilt)}` : ''}`

export function markdownAktar(defterler: DefterDokum[]): string {
  const p: string[] = ['# Defter', '']
  const tarih = new Date().toISOString().slice(0, 10)
  p.push(`*${tarih} tarihinde dışa aktarıldı.*`, '')

  for (const { defter, gunler, kenarlar, basliklar } of defterler) {
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
        const kenar = kenarlar.get(k.id)
        if (kenar) p.push(`> *Kenar notu (${kenar.tarih}):* ${kenar.metin}`, '')
      }
    }
    p.push('')
  }
  return p.join('\n')
}
