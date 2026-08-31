import { ac, kapat } from './gizle.js'
import { satirKimligi, type SenkronKimlik } from './senkronKimlik.js'

/**
 * SENKRON ZARFI — yerel satır ile sunucudaki şifreli blob arasındaki
 * çeviri, ve çakışma kararı.
 *
 * Saf: ağ yok, DOM yok, veri katmanı yok. Sunucuya giden baytların
 * tamamı buradan çıkıyor, o yüzden "ne gidiyor" sorusu tek dosyada
 * cevaplanabiliyor — `cekirdek/anlatim.ts`in model çağrısında yaptığı
 * işin aynısı (KARARLAR.md · K-036).
 */

/** Senkronlanan tablolar. Türetilmiş olanlar bilerek dışarıda. */
export const VARLIKLAR = [
  'defter',
  'kayit',
  'tema',
  'kayit_tema',
  'kenar',
  'sayfa_baslik',
  'ek',
  'kapsul',
] as const

export type Varlik = (typeof VARLIKLAR)[number]

/**
 * Senkronlanmayanlar ve sebepleri:
 *   gomu      — türetilmiş; ~145 MB'lık modelin çıktısı, her cihaz kendi
 *               üretir (K-029). Şifreli bile olsa taşımak israf.
 *   kayit_fts — türetilmiş, SQLite'a özgü.
 *   ayar      — cihaza özgü (hangi defter açık, gömü açık mı, dil).
 *               Senkronlansaydı bir cihazın ayarı diğerini bozardı.
 */
export const SENKRONSUZ = ['gomu', 'kayit_fts', 'ayar'] as const

export interface YerelSatir {
  varlik: Varlik
  id: string
  /** Kaydın bütün sütunları. Şifreli gövdenin içine olduğu gibi giriyor. */
  alanlar: Record<string, unknown>
  /** Cihazın tekdüze artan damgası (K-033). Çakışmayı bu çözüyor. */
  guncelleme: number
}

/** Sunucuda duran satır. `govde` dışında hiçbir şey içerik taşımıyor. */
export interface Zarf {
  satir: string
  iv: string | null
  govde: string | null
  silindi: boolean
}

/** Zarfın içindeki düz metin — yalnızca cihazda var olur. */
interface Ic {
  v: Varlik
  i: string
  g: number
  a: Record<string, unknown>
}

/** Yerel satırı şifreli zarfa çevirir. */
export async function zarfla(s: YerelSatir, k: SenkronKimlik): Promise<Zarf> {
  const ic: Ic = { v: s.varlik, i: s.id, g: s.guncelleme, a: s.alanlar }
  const kapali = await kapat(new TextEncoder().encode(JSON.stringify(ic)), k.sifre)
  return {
    satir: await satirKimligi(k, s.varlik, s.id),
    iv: kapali.iv,
    govde: kapali.govde,
    silindi: false,
  }
}

/**
 * Mezar taşı — silinmiş satır.
 *
 * İçerik taşımıyor: `govde` null. Sunucuda kalan tek şey opak satır
 * kimliği ve "silindi" bilgisi. K-028 "silinen kayıt sayfada iz
 * bırakmaz" diyor; sayfada bırakmıyor, ama diğer cihazın silmeyi
 * öğrenmesinin başka yolu yok. Bu bir bedel ve belgeleniyor.
 */
export async function mezarTasi(
  varlik: Varlik,
  id: string,
  k: SenkronKimlik,
): Promise<Zarf> {
  return { satir: await satirKimligi(k, varlik, id), iv: null, govde: null, silindi: true }
}

/**
 * Zarfı açar. Anahtar yanlışsa ya da bayt oynanmışsa null döner —
 * GCM etiketi tutmaz ve senkron o satırı atlar, çökmez.
 */
export async function zarfiAc(z: Zarf, k: SenkronKimlik): Promise<YerelSatir | null> {
  if (z.silindi || !z.iv || !z.govde) return null
  try {
    const ham = await ac({ iv: z.iv, govde: z.govde }, k.sifre)
    const ic = JSON.parse(new TextDecoder().decode(ham)) as Ic
    if (!VARLIKLAR.includes(ic.v)) return null
    return { varlik: ic.v, id: ic.i, alanlar: ic.a, guncelleme: ic.g }
  } catch {
    return null
  }
}

/* ── çakışma ───────────────────────────────────────────────── */

export type Karar =
  /** Uzak sürüm yerele yazılacak. */
  | { tur: 'uzak' }
  /** Yerel duruyor; uzak eski, yapılacak bir şey yok. */
  | { tur: 'yerel' }
  /**
   * Uzak kazanıyor ama yerel metin KAYBOLMUYOR: kenar notuna dönüyor.
   * Bir günlükte sessiz "son yazan kazanır" kabul edilemez.
   */
  | { tur: 'uzak', kurtarilacakMetin: string }

/**
 * İki sürüm arasında karar.
 *
 * Sıralama sunucunun `surum` alanıyla YAPILMIYOR — o alan yalnızca
 * "neyi henüz çekmedim" sorusunun cevabı ve sunucuya varış sırasına
 * bakıyor. Çevrimdışı bir cihaz saatler sonra eşitlenince eski
 * düzeltmesi yeni sayılırdı. Karar, şifreli gövdenin içindeki cihaz
 * damgasıyla veriliyor.
 *
 * Metin taşıyan tek varlık `kayit`; kurtarma yalnızca orada geçerli.
 */
export function catismaKarari(yerel: YerelSatir | null, uzak: YerelSatir): Karar {
  if (!yerel) return { tur: 'uzak' }
  if (uzak.guncelleme <= yerel.guncelleme) return { tur: 'yerel' }

  const y = yerel.alanlar.metin
  const u = uzak.alanlar.metin
  const metinKayboluyor =
    uzak.varlik === 'kayit' && typeof y === 'string' && y.trim() !== '' && y !== u

  return metinKayboluyor ? { tur: 'uzak', kurtarilacakMetin: y as string } : { tur: 'uzak' }
}
