/* Türkçe biçimlendirme ve ek uyumu. Saf fonksiyonlar. */

export const AY_AD = [
  'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran',
  'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık',
] as const

export const GUN_AD = [
  'pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi',
] as const

export const AY_SIRA: Record<string, number> = Object.fromEntries(
  AY_AD.map((ad, i) => [ad, i]),
)

/** 'YYYY-MM-DD' */
export const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 'YYYY-MM-DD' -> 'YYYY-MM' */
export const ayAnahtar = (tarih: string): string => tarih.slice(0, 7)

/** 'YYYY-MM-DD' -> '12 mart 2026' */
export const tamTarih = (tarih: string): string => {
  const d = new Date(tarih + 'T12:00')
  return `${d.getDate()} ${AY_AD[d.getMonth()]} ${d.getFullYear()}`
}

/** 'YYYY-MM-DD' -> 'perşembe' */
export const gunAdi = (tarih: string): string =>
  GUN_AD[new Date(tarih + 'T12:00').getDay()]!

/** 'YYYY-MM' -> 'mart 2026' */
export const ayYaz = (ay: string): string => {
  const [, m] = ay.split('-')
  return `${AY_AD[Number(m) - 1]} ${ay.slice(0, 4)}`
}

/** İlk harfi Türkçe kurallarıyla büyüt: 'istanbul' -> 'İstanbul' */
export const bas = (s: string): string =>
  s.charAt(0).toLocaleUpperCase('tr') + s.slice(1)

/* ── sesli/sessiz ve kalın/ince ────────────────────────────── */

const KALIN = new Set(['a', 'ı', 'o', 'u'])
const INCE = new Set(['e', 'i', 'ö', 'ü'])
const SESLI = new Set([...KALIN, ...INCE])
/** Ünsüz yumuşaması olmayan sert ünsüzler (fıstıkçı şahap). */
const SERT = new Set(['f', 's', 't', 'k', 'ç', 'ş', 'h', 'p'])

/** Sözcüğün son sesli harfi; yoksa null. */
const sonSesli = (s: string): string | null => {
  const k = s.toLocaleLowerCase('tr')
  for (let i = k.length - 1; i >= 0; i--) if (SESLI.has(k[i]!)) return k[i]!
  return null
}

const sonHarf = (s: string): string => {
  const k = s.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9]/g, '')
  return k.slice(-1)
}

/** Sözcük sesliyle mi bitiyor. */
const sesliBitis = (s: string): boolean => SESLI.has(sonHarf(s))

/** Son sesliye göre iki biçimli ek seç (e/a, i/ı gibi). */
const uyum2 = (sesli: string, ince: string, kalin: string): string =>
  INCE.has(sesli) ? ince : kalin

/** Son sesliye göre dört biçimli ek seç (i/ı/u/ü). */
const uyum4 = (sesli: string): string =>
  sesli === 'e' || sesli === 'i' ? 'i'
  : sesli === 'a' || sesli === 'ı' ? 'ı'
  : sesli === 'o' || sesli === 'u' ? 'u'
  : 'ü'

/* ── ekler ─────────────────────────────────────────────────── */

/** Bulunma ekinin kendisi: 'mart' -> 'ta', 'haziran' -> 'da' */
export const bulunmaEki = (s: string): string => {
  const sesli = sonSesli(s) ?? 'a'
  return (SERT.has(sonHarf(s)) ? 't' : 'd') + uyum2(sesli, 'e', 'a')
}

/** Bulunma hâli: 'mart' -> 'martta', 'haziran' -> 'haziranda' */
export const bulunma = (s: string): string => s + bulunmaEki(s)

/** Belirtme hâli: 'kerem' -> 'keremi', 'annem' -> 'annemi' */
export const belirtme = (s: string): string => {
  const sesli = sonSesli(s) ?? 'a'
  const ek = uyum4(sesli)
  return s + (sesliBitis(s) ? 'y' : '') + ek
}

/**
 * İlgi (tamlayan) hâli: 'kerem' -> "kerem'in", 'annem' -> "annemin",
 * 'ece' -> "ece'nin". PROJE.md §7'de eksik olduğu not edilmişti.
 * Özel ad ise kesme işaretiyle ayrılır.
 */
export const tamlayan = (s: string, ozelAd = false): string => {
  const sesli = sonSesli(s) ?? 'a'
  const ek = (sesliBitis(s) ? 'n' : '') + uyum4(sesli) + 'n'
  return ozelAd ? `${s}'${ek}` : s + ek
}

/* ── sayı okunuşu ──────────────────────────────────────────
   Ek uyumu sayının son rakamına değil, okunuşundaki son sözcüğe bağlı.
   2026 "…yirmi altı" -> "2026'da" ama 2030 "…otuz" -> "2030'da",
   2020 "…yirmi" -> "2020'de". Son rakama bakan tablo bunları karıştırır. */

const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'] as const
const ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'] as const

/** Sayının okunuşundaki son sözcük: 2026 -> 'altı', 2030 -> 'otuz', 100 -> 'yüz' */
export const sonSozcuk = (n: number): string => {
  const s = Math.abs(Math.trunc(n))
  if (s === 0) return 'sıfır'
  if (s % 10) return BIRLER[s % 10]!
  if (Math.floor(s / 10) % 10) return ONLAR[Math.floor(s / 10) % 10]!
  if (Math.floor(s / 100) % 10) return 'yüz'
  return 'bin'
}

/** 'YYYY-MM' -> "mart 2026'da" */
export const ayEk = (ay: string): string =>
  `${ayYaz(ay)}'${bulunmaEki(sonSozcuk(Number(ay.slice(0, 4))))}`

/** 12 -> "12'si", 3 -> "3'ü", 10 -> "10'u" */
export const sayiEk = (n: number): string => {
  const sz = sonSozcuk(n)
  const sesli = sonSesli(sz) ?? 'ı'
  return `${n}'${sesliBitis(sz) ? 's' : ''}${uyum4(sesli)}`
}

/** Sayıya bulunma eki: 45 -> "45'te" */
export const sayiBulunmaEk = (n: number): string =>
  `${n}'${bulunmaEki(sonSozcuk(n))}`

export const ROMEN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'] as const

/** Cilt numarasını romen rakamıyla yaz; liste biterse sayıya döner. */
export const romen = (n: number): string => ROMEN[n] ?? String(n)

/** İki tarih arasındaki gün farkı. */
export const gunFark = (a: string, b: string): number =>
  Math.round((+new Date(b + 'T12:00') - +new Date(a + 'T12:00')) / 864e5)

export const saatSayi = (saat: string): number => parseInt(saat.split(':')[0]!, 10)
