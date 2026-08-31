/* İngilizce biçimlendirme. `tr.ts`nin karşılığı — çok daha kısa, çünkü
   İngilizcede ek uyumu yok. Saf fonksiyonlar. */

export const AY_AD_EN = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const

export const GUN_AD_EN = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const

/** 'YYYY-MM-DD' -> '12 March 2026' — gün önce, Türkçe biçimle aynı ritim. */
export const tamTarihEn = (tarih: string): string => {
  const d = new Date(tarih + 'T12:00')
  return `${d.getDate()} ${bas(AY_AD_EN[d.getMonth()]!)} ${d.getFullYear()}`
}

export const gunAdiEn = (tarih: string): string =>
  GUN_AD_EN[new Date(tarih + 'T12:00').getDay()]!

/** 'YYYY-MM' -> 'March 2026' */
export const ayYazEn = (ay: string): string =>
  `${bas(AY_AD_EN[Number(ay.split('-')[1]) - 1]!)} ${ay.slice(0, 4)}`

/** 'YYYY-MM' -> 'in March 2026' — Türkçedeki `ayEk`in karşılığı. */
export const ayEkEn = (ay: string): string => `in ${ayYazEn(ay)}`

/**
 * "2 of them", "one of them" — Türkçedeki `sayiEk`in karşılığı.
 *
 * Türkçede ek uyumu vardı ("38'i", "3'ü"); İngilizcede tek biçim, ama
 * bir/çok ayrımı var ve o ayrım cümlede duyuluyor.
 */
export const sayiEkEn = (n: number): string => (n === 1 ? 'one of them' : `${n} of them`)

export const bas = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
