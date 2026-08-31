import {
  VARSAYILAN_PARAM,
  aesAnahtar,
  onaltilikOku,
  onaltilikYaz,
  rastgele,
  yavasTuret,
} from '../cekirdek/gizle.js'
import type { KilitParam } from '../cekirdek/gizle.js'

/**
 * Defterin kilidi — PIN + biyometri (KARARLAR.md · K-021).
 *
 * Karma anahtar modeli:
 *
 *   AV     = rastgele 32 bayt      → SQLCipher bunu kullanır
 *   KEK    = Argon2id(pin, tuz)    → PIN'den türeyen sarmalama anahtarı
 *   sarmal = AES-GCM(KEK, AV)      → açık depoda durabilir
 *
 * Anahtar PIN'den TÜRETİLMİYOR, PIN'le SARMALANIYOR. Sebebi: altı haneli
 * bir PIN'den türeyen anahtar, dosyayı ele geçiren biri için çevrimdışı
 * denenebilir tek engel olurdu ve PIN unutulduğunda on yıllık defter biterdi.
 * Sarmalamada AV'nin ikinci bir kopyası biyometriyle korunan depoda durur;
 * PIN unutulsa da defter açılır.
 *
 * Bu modül DOM bilmez ve depo bilmez: yalnızca bayt üretir ve çözer.
 * Kripto ilkelleri `gizle.ts`te — üç yerde üç kopya olmasın (K-036).
 */

/* Geriye dönük uyum: bu adlar buradan içe aktarılıyordu. */
export { VARSAYILAN_PARAM, onaltilikOku, onaltilikYaz }
export type { KilitParam }

/** Veritabanının dışında saklanan kilit kaydı. */
export interface KilitKaydi {
  surum: 1
  tuz: string
  param: KilitParam
  /** AES-GCM ile sarmalanmış ana anahtar. */
  sarmal: string
  iv: string
  /** Biyometri yolu kurulu mu. */
  biyometri: boolean
  /** Üst üste kaç yanlış deneme oldu. */
  hata: number
  /** Bu ana kadar yeni deneme kabul edilmez (epoch ms). */
  bekleme: number
}

/** Yeni bir ana anahtar (AV) üretir. */
export const yeniAnaAnahtar = (): string => onaltilikYaz(rastgele(32))

/* ── sarmalama ─────────────────────────────────────────────── */

const kek = (pin: string, tuz: Uint8Array, param: KilitParam): Promise<Uint8Array> =>
  yavasTuret(pin, tuz, param)

/**
 * PIN ile yeni bir kilit kaydı kurar.
 * `anaAnahtar` verilmezse yenisi üretilir; var olan defterin anahtarı
 * korunmak istendiğinde (kilit sonradan açılıyorsa) o geçilir.
 */
export async function kilidiKur(
  pin: string,
  anaAnahtar: string = yeniAnaAnahtar(),
  param: KilitParam = VARSAYILAN_PARAM,
): Promise<{ kayit: KilitKaydi; anaAnahtar: string }> {
  const tuz = rastgele(16)
  const iv = rastgele(12)
  const anahtar = await aesAnahtar(await kek(pin, tuz, param))
  const sarmal = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      anahtar,
      onaltilikOku(anaAnahtar) as BufferSource,
    ),
  )
  return {
    anaAnahtar,
    kayit: {
      surum: 1,
      tuz: onaltilikYaz(tuz),
      param,
      sarmal: onaltilikYaz(sarmal),
      iv: onaltilikYaz(iv),
      biyometri: false,
      hata: 0,
      bekleme: 0,
    },
  }
}

/**
 * PIN ile ana anahtarı çözer. Yanlış PIN'de `null` döner — atmıyor, çünkü
 * çağıran taraf hata sayacını ilerletecek.
 */
export async function pinIleAc(kayit: KilitKaydi, pin: string): Promise<string | null> {
  try {
    const anahtar = await aesAnahtar(
      await kek(pin, onaltilikOku(kayit.tuz), kayit.param),
    )
    const av = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: onaltilikOku(kayit.iv) as BufferSource },
        anahtar,
        onaltilikOku(kayit.sarmal) as BufferSource,
      ),
    )
    return onaltilikYaz(av)
  } catch {
    return null
  }
}

/* ── deneme sınırlama ──────────────────────────────────────── */

/**
 * Yanlış denemeden sonra beklenecek süre (ms).
 *
 * Sarmal blob açık depoda durduğu için çevrimdışı denenebilir; uygulama
 * düzeyindeki gecikme bunu tek başına çözmez ama en azından cihaz üstündeki
 * kaba denemeyi anlamsızlaştırır. **Veri silme yok:** yanlış PIN on yıllık
 * defteri yok edemez.
 */
export function beklemeSuresi(hata: number): number {
  if (hata < 5) return 0
  if (hata < 8) return 30_000
  if (hata < 12) return 120_000
  return 600_000
}

/** Şu an deneme kabul ediliyor mu; edilmiyorsa kaç ms kaldığı. */
export function denemeDurumu(kayit: KilitKaydi, simdi: number): { acik: boolean; kalan: number } {
  const kalan = Math.max(0, kayit.bekleme - simdi)
  return { acik: kalan === 0, kalan }
}

export const hataIsle = (kayit: KilitKaydi, simdi: number): KilitKaydi => {
  const hata = kayit.hata + 1
  return { ...kayit, hata, bekleme: simdi + beklemeSuresi(hata) }
}

export const hataSifirla = (kayit: KilitKaydi): KilitKaydi => ({
  ...kayit,
  hata: 0,
  bekleme: 0,
})
