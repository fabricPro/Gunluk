/**
 * Kurtarma kodu — mühürlü yedeğin anahtarı (KARARLAR.md · K-022).
 *
 * Kullanıcı bunu bir yere elle yazacak, belki yıllar sonra okuyacak. O
 * yüzden Crockford base32: I, L, O, U yok — 1/I ve 0/O karışmıyor. Okurken
 * yapılan yaygın hatalar (I→1, L→1, O→0) çözerken sessizce düzeltiliyor,
 * kalan yazım hataları sağlamaya takılıyor.
 *
 * 128 bit gizli + 10 bit sağlama = 28 karakter, dörtlü yedi öbek:
 *   X4K7-M2QF-9B3T-R6NW-Z8PD-J5HT-A3CV
 */

const ALFABE = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const GIZLI_BAYT = 16
const GIZLI_KARAKTER = 26
const SAGLAMA_KARAKTER = 2
export const KOD_UZUNLUK = GIZLI_KARAKTER + SAGLAMA_KARAKTER

/** Yazım hatalarını yakalayan basit sağlama — güvenlik değil, düzeltme için. */
function saglama(baytlar: Uint8Array): number {
  let s = 0
  for (let i = 0; i < baytlar.length; i++) s = (s * 31 + baytlar[i]!) % 1024
  return s
}

function base32Yaz(baytlar: Uint8Array, karakter: number): string {
  let bit = 0
  let deger = 0
  let cikti = ''
  for (const b of baytlar) {
    deger = (deger << 8) | b
    bit += 8
    while (bit >= 5) {
      cikti += ALFABE[(deger >>> (bit - 5)) & 31]
      bit -= 5
    }
  }
  if (bit > 0) cikti += ALFABE[(deger << (5 - bit)) & 31]
  return cikti.slice(0, karakter).padEnd(karakter, '0')
}

function base32Oku(kod: string, bayt: number): Uint8Array {
  let bit = 0
  let deger = 0
  const cikti = new Uint8Array(bayt)
  let i = 0
  for (const c of kod) {
    const n = ALFABE.indexOf(c)
    if (n < 0) continue
    deger = (deger << 5) | n
    bit += 5
    if (bit >= 8) {
      if (i < bayt) cikti[i++] = (deger >>> (bit - 8)) & 255
      bit -= 8
    }
  }
  return cikti
}

/** Kullanıcının yazdığını normalleştirir: büyük harf, I/L→1, O→0, ayraçsız. */
export function normalize(girdi: string): string {
  return girdi
    .toUpperCase()
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
    .split('')
    .filter((c) => ALFABE.includes(c))
    .join('')
}

/** Okunur biçim: dörtlü öbekler, aralarında tire. */
export const bicimle = (kod: string): string =>
  (kod.match(/.{1,4}/g) ?? []).join('-')

/** Yeni bir kurtarma kodu üretir. */
export function kurtarmaUret(): string {
  const gizli = new Uint8Array(GIZLI_BAYT)
  crypto.getRandomValues(gizli)
  return bicimle(kodYaz(gizli))
}

/**
 * Baytlardan kodu geri yazar — `kurtarmaCoz`un tersi.
 *
 * Kasa yalnızca 16 baytlık gizliyi tutuyor; kullanıcıya gösterilecek olan
 * ise kodun kendisi. Kurtarmadan sonra "Defter Kimliğini göster" hâlâ
 * çalışsın diye bu yön de gerekiyor (KARARLAR.md · K-038).
 *
 * Yanlış uzunlukta bayt gelirse `null`: sessizce geçerli görünen ama
 * yanlış bir kod üretmektense hiç üretmemek doğru.
 */
export function kurtarmaYaz(gizli: Uint8Array): string | null {
  if (gizli.length !== GIZLI_BAYT) return null
  return bicimle(kodYaz(gizli))
}

function kodYaz(gizli: Uint8Array): string {
  /*
   * Sağlama 10 bit ve tam olarak iki base32 karakterine sığıyor. Baytlara
   * çevirip base32Yaz'a vermek bitlerin çoğunu düşürüyordu (10 bit yerine
   * 4 bit taşıyordu) ve yazım hatalarının bir kısmı sızıyordu.
   */
  const s = saglama(gizli)
  const sag = ALFABE[(s >>> 5) & 31]! + ALFABE[s & 31]!
  return base32Yaz(gizli, GIZLI_KARAKTER) + sag
}

/**
 * Kullanıcının yazdığı kodu çözer.
 * Uzunluk ya da sağlama tutmuyorsa `null` — yanlış yazılmış demektir.
 */
export function kurtarmaCoz(girdi: string): Uint8Array | null {
  const kod = normalize(girdi)
  if (kod.length !== KOD_UZUNLUK) return null
  const gizli = base32Oku(kod.slice(0, GIZLI_KARAKTER), GIZLI_BAYT)
  if (kodYaz(gizli) !== kod) return null
  return gizli
}

/** Girdinin geçerli bir kod olup olmadığını söyler. */
export const kurtarmaGecerli = (girdi: string): boolean => kurtarmaCoz(girdi) !== null
