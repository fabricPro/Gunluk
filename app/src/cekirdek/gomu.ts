/**
 * Gömü vektörleri üstündeki saf matematik.
 *
 * Vektörler L2 normalize edilip int8'e iniyor: 384 boyut = 384 bayt, base64
 * ile 512 karakter. 5000 kayıt ≈ 2,5 MB. Normalize edildikleri için ayrı
 * bir ölçek sütunu gerekmiyor — kosinüs benzerliği, int8 iç çarpımının
 * sabit bir katı (KARARLAR.md · K-029).
 *
 * Metin olarak saklanmalarının sebebi K-023 ile aynı: Capacitor köprüsü
 * ikili veri taşımıyor.
 */

/** int8 ölçeği. Normalize vektörün değerleri [-1, 1] aralığında. */
const OLCEK = 127

/** Vektörü birim uzunluğa getirir. Sıfır vektör olduğu gibi döner. */
export function normalize(v: Float32Array): Float32Array {
  let kare = 0
  for (const x of v) kare += x * x
  if (kare === 0) return v
  const b = 1 / Math.sqrt(kare)
  const c = new Float32Array(v.length)
  for (let i = 0; i < v.length; i++) c[i] = v[i]! * b
  return c
}

/** Normalize edip int8'e indirir ve base64 yazar. */
export function paketle(v: Float32Array): string {
  const n = normalize(v)
  const bayt = new Uint8Array(n.length)
  for (let i = 0; i < n.length; i++) {
    /* Yuvarlama sonrası taşmayı kırp: 1.0 * 127 = 127, sınırda kalsın. */
    const q = Math.max(-OLCEK, Math.min(OLCEK, Math.round(n[i]! * OLCEK)))
    bayt[i] = q < 0 ? q + 256 : q
  }
  let s = ''
  for (const b of bayt) s += String.fromCharCode(b)
  return btoa(s)
}

/** base64'ten int8 vektöre. Bozuk girdide null. */
export function paketiAc(kod: string): Int8Array | null {
  try {
    const s = atob(kod)
    const v = new Int8Array(s.length)
    for (let i = 0; i < s.length; i++) {
      const b = s.charCodeAt(i)
      v[i] = b > 127 ? b - 256 : b
    }
    return v
  } catch {
    return null
  }
}

/**
 * İki nicelenmiş vektörün kosinüs benzerliği (yaklaşık).
 *
 * İkisi de normalize edilmiş olduğu için iç çarpım doğrudan kosinüs;
 * ölçek karesine bölmek [-1, 1] aralığına geri getiriyor. Boyları
 * tutmuyorsa 0 — farklı modellerin vektörleri karşılaştırılamaz.
 */
export function benzerlik(a: Int8Array, b: Int8Array): number {
  if (a.length !== b.length || !a.length) return 0
  let t = 0
  for (let i = 0; i < a.length; i++) t += a[i]! * b[i]!
  return t / (OLCEK * OLCEK)
}

export interface Yakin {
  kayitId: string
  puan: number
}

/**
 * Sorgu vektörüne en yakın kayıtlar, eşiği geçenler.
 *
 * Kaba kuvvet tarama: 5000 kayıt × 384 boyut birkaç milisaniye. Yaklaşık
 * komşu indeksi (HNSW gibi) bu ölçekte çözdüğünden çok karmaşıklık
 * getirirdi.
 */
export function enYakinlar(
  sorgu: Int8Array,
  kayitlar: Iterable<readonly [string, Int8Array]>,
  { esik = 0.35, sinir = 12 }: { esik?: number; sinir?: number } = {},
): Yakin[] {
  const cikti: Yakin[] = []
  for (const [kayitId, v] of kayitlar) {
    const puan = benzerlik(sorgu, v)
    if (puan >= esik) cikti.push({ kayitId, puan })
  }
  cikti.sort((a, b) => b.puan - a.puan)
  return cikti.slice(0, sinir)
}
