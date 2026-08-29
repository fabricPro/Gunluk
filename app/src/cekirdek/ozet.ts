import type { TemaTanim } from './sorgu.js'
import type { Gun, Kayit, Sayfa } from './tipler.js'
import { gunFark, tamTarih } from './tr.js'

/**
 * Kapanan bir defterin özeti.
 *
 * Yorum yok, skor yok, grafik yok, teşhis yok — PROJE.md §5 bunları
 * kapatıyor. Burada yalnızca kullanıcının kendi yazdıklarından çıkan
 * olgular var: ne kadar sürdü, ne kadar yazıldı, en sık ne geçti, hangi
 * sayfalara ad verildi, ilk ve son cümle ne.
 */
export interface DefterOzeti {
  ilkTarih: string | null
  sonTarih: string | null
  /** İlk kayıttan son kayda kaç gün geçti. */
  surenGun: number
  /** Kaç ayrı günde yazıldı. */
  yazilanGun: number
  kayitSayisi: number
  sayfaSayisi: number
  /** En sık geçen temalar: [ad, kaç kez]. */
  enSik: [string, number][]
  /** Kullanıcının ad verdiği sayfalar. */
  baslikliSayfalar: { baslik: string; ciltSayfa: number }[]
  ilkKayit: Kayit | null
  sonKayit: Kayit | null
  /**
   * Okunur tarih aralığı: "3 haziran 2025 — 28 ağustos 2026".
   * Tek günde açılıp kapanan defterde tek tarih.
   */
  aralik: string
}

const BOS: DefterOzeti = {
  ilkTarih: null,
  sonTarih: null,
  surenGun: 0,
  yazilanGun: 0,
  kayitSayisi: 0,
  sayfaSayisi: 0,
  enSik: [],
  baslikliSayfalar: [],
  ilkKayit: null,
  sonKayit: null,
  aralik: '',
}

export function defterOzeti(
  gunler: Gun[],
  sayfalar: Sayfa[],
  basliklar: Map<string, string>,
  temalar: TemaTanim[],
): DefterOzeti {
  const dolu = gunler.filter((g) => g.kayitlar.length)
  if (!dolu.length) return { ...BOS, sayfaSayisi: sayfalar.length }

  const ilkGun = dolu[0]!
  const sonGun = dolu[dolu.length - 1]!
  const ilkKayit = ilkGun.kayitlar[0]!
  const sonKayit = sonGun.kayitlar[sonGun.kayitlar.length - 1]!

  const temaAdi = new Map(temalar.map((t) => [t.id, t.ad]))
  const say = new Map<string, number>()
  let kayitSayisi = 0
  for (const g of dolu)
    for (const k of g.kayitlar) {
      kayitSayisi++
      for (const id of k.temalar) say.set(id, (say.get(id) ?? 0) + 1)
    }

  const enSik = [...say.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))
    .slice(0, 5)
    .map(([id, n]) => [temaAdi.get(id) ?? id, n] as [string, number])

  const baslikliSayfalar = sayfalar
    .filter((s) => s.anahtar && basliklar.has(s.anahtar))
    .map((s) => ({ baslik: basliklar.get(s.anahtar!)!, ciltSayfa: s.ciltSayfa }))

  return {
    ilkTarih: ilkGun.tarih,
    sonTarih: sonGun.tarih,
    surenGun: gunFark(ilkGun.tarih, sonGun.tarih),
    yazilanGun: dolu.length,
    kayitSayisi,
    sayfaSayisi: sayfalar.length,
    enSik,
    baslikliSayfalar,
    ilkKayit,
    sonKayit,
    aralik:
      ilkGun.tarih === sonGun.tarih
        ? tamTarih(ilkGun.tarih)
        : `${tamTarih(ilkGun.tarih)} — ${tamTarih(sonGun.tarih)}`,
  }
}
