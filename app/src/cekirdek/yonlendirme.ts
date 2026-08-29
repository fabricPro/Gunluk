import { HAVUZ, ILK_HAFTA, ILK_HAFTA_GUN } from './sorular.js'

/**
 * İlk hafta yönlendirmesi.
 *
 * "İlk 7 gün" takvimle değil **yazılan günle** sayılır: bir hafta uğramayan
 * biri döndüğünde 2. soruyla karşılaşır, 7. soruyla değil. Hedef kitle
 * "günlük tutmak isteyip tutamayan" insanlar; takvimle sayarsak soruların
 * çoğunu hiç görmezler (KARARLAR.md · K-019).
 */
export interface YonlendirmeDurum {
  /** Tamamlanmış yazma günü sayısı. */
  gun: number
  /** Son yazılan gün ('YYYY-MM-DD'), hiç yazılmadıysa null. */
  sonTarih: string | null
  /** Havuzdan kaçıncı sorunun sorulacağı. */
  havuzIndeks: number
}

export const BASLANGIC: YonlendirmeDurum = { gun: 0, sonTarih: null, havuzIndeks: 0 }

/**
 * Bugün gösterilecek soru.
 *
 * `null` dönerse soru yok: ya ilk hafta bitti, ya bugün zaten yazıldı.
 * `kriz` true ise her hâlükârda susulur — ilke 2.1 "kriz anında uygulama
 * susar", soru sormak da konuşmaktır. (Sınıflandırıcı Faz 3.11; kanca
 * şimdiden burada.)
 */
export function gununSorusu(
  d: YonlendirmeDurum,
  bugun: string,
  kriz = false,
): string | null {
  if (kriz) return null
  if (d.gun >= ILK_HAFTA_GUN) return null
  if (d.sonTarih === bugun) return null
  return ILK_HAFTA[d.gun] ?? null
}

/** Kullanıcı "bana bir şey sor" dediğinde havuzdan sıradaki soru. */
export function havuzdanSor(d: YonlendirmeDurum, kriz = false): string | null {
  if (kriz) return null
  return HAVUZ[d.havuzIndeks % HAVUZ.length] ?? null
}

/** Havuzda bir sonrakine geçer. */
export const havuzuIlerlet = (d: YonlendirmeDurum): YonlendirmeDurum => ({
  ...d,
  havuzIndeks: (d.havuzIndeks + 1) % HAVUZ.length,
})

/**
 * Bir kayıt yazıldığında durumu ilerletir.
 * Aynı güne ikinci kayıt sayacı ilerletmez: gün sayılır, kayıt değil.
 */
export function kayitYazildi(d: YonlendirmeDurum, tarih: string): YonlendirmeDurum {
  if (d.sonTarih === tarih) return d
  return { ...d, gun: d.gun + 1, sonTarih: tarih }
}

/** İlk hafta bitti mi — "bana bir şey sor" düğmesi bundan sonra anlamlı. */
export const ilkHaftaBitti = (d: YonlendirmeDurum): boolean => d.gun >= ILK_HAFTA_GUN
