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

/**
 * Sunucuda duran satır. Üç alan, biri şifreli.
 *
 * `silindi` diye bir bayrak YOK — silme de şifreli gövdenin içinde
 * (`alanlar: null`). İki sebep:
 *
 *  1. **Doğruluk.** Mezar taşı da bir sürüm taşımak zorunda. Taşımadığı
 *     ilk tasarımda, A'da silinen kayıt kendi gönderdiği satırı geri
 *     çekince diriliyordu: yerelde satır yok, uzakta var, "uzak kazanır"
 *     deniyordu. Sürüm gövdenin içine girince silme de karşılaştırılabilir
 *     oldu.
 *  2. **Gizlilik.** Bayrak olsaydı sunucu hangi satırların silindiğini
 *     bilirdi. Şimdi bilmiyor: her satır aynı görünüyor.
 */
export interface Zarf {
  satir: string
  iv: string
  govde: string
}

/** Zarfın içindeki düz metin — yalnızca cihazda var olur. */
interface Ic {
  v: Varlik
  i: string
  g: number
  /** null ise bu bir silme. */
  a: Record<string, unknown> | null
}

/** Çözülmüş zarf. `alanlar` null ise satır silinmiş. */
export interface Cozulmus {
  varlik: Varlik
  id: string
  guncelleme: number
  alanlar: Record<string, unknown> | null
}

/**
 * Yerel satırı şifreli zarfa çevirir.
 *
 * `alanlar` null verilirse mezar taşı üretiliyor — ayrı bir işleve gerek
 * yok, çünkü sunucudan bakınca ikisi ayırt edilemez.
 */
export async function zarfla(
  s: { varlik: Varlik; id: string; guncelleme: number; alanlar: Record<string, unknown> | null },
  k: SenkronKimlik,
): Promise<Zarf> {
  const ic: Ic = { v: s.varlik, i: s.id, g: s.guncelleme, a: s.alanlar }
  const kapali = await kapat(new TextEncoder().encode(JSON.stringify(ic)), k.sifre)
  return { satir: await satirKimligi(k, s.varlik, s.id), iv: kapali.iv, govde: kapali.govde }
}

/**
 * Zarfı açar. Anahtar yanlışsa ya da bayt oynanmışsa null döner —
 * GCM etiketi tutmaz ve senkron o satırı atlar, çökmez.
 */
export async function zarfiAc(z: Zarf, k: SenkronKimlik): Promise<Cozulmus | null> {
  try {
    const ham = await ac({ iv: z.iv, govde: z.govde }, k.sifre)
    const ic = JSON.parse(new TextDecoder().decode(ham)) as Ic
    if (!VARLIKLAR.includes(ic.v)) return null
    return { varlik: ic.v, id: ic.i, alanlar: ic.a ?? null, guncelleme: ic.g }
  } catch {
    return null
  }
}

/* ── çakışma ───────────────────────────────────────────────── */

export type Karar =
  /** Uzak sürüm yerele yazılacak. */
  | { tur: 'uzak'; kurtarilacakMetin?: string }
  /** Yerel duruyor; yapılacak bir şey yok. */
  | { tur: 'yerel' }

/** Yerelin bu satır hakkında bildiği her şey. */
export interface YerelDurum {
  /** Lamport sırası; iz yoksa 0. */
  sira: number
  /** Satırın alanları; silinmişse ya da hiç yoksa null. */
  alanlar: Record<string, unknown> | null
}

/**
 * Karşılaştırma için kararlı bir dize — beraberlik bozucu.
 *
 * İki cihaz aynı Lamport değerinde farklı şeyler yazmış olabilir
 * (birbirini görmeden düzelttiler). O durumda "yerel kazanır" demek
 * ıraksama demek: her cihaz kendininkinde kalır ve defter ikiye ayrılır.
 * Bu yüzden beraberlik İÇERİKLE bozuluyor — iki taraf da aynı iki
 * değeri gördüğü için aynı kazananı seçiyor ve buluşuyorlar.
 */
const damga = (a: Record<string, unknown> | null): string =>
  a === null ? '' : JSON.stringify(Object.entries(a).sort(([x], [y]) => (x < y ? -1 : 1)))

/**
 * İki sürüm arasında karar.
 *
 * Sıralama sunucunun `surum` alanıyla YAPILMIYOR — o alan yalnızca
 * "neyi henüz çekmedim" sorusunun cevabı ve sunucuya varış sırasına
 * bakıyor. Çevrimdışı bir cihaz saatler sonra eşitlenince eski
 * düzeltmesi yeni sayılırdı. Karar, şifreli gövdenin içindeki Lamport
 * damgasıyla veriliyor.
 *
 * Metin taşıyan tek varlık `kayit`; kurtarma yalnızca orada geçerli.
 */
export function catismaKarari(yerel: YerelDurum | null, uzak: Cozulmus): Karar {
  if (!yerel) return { tur: 'uzak' }

  const yd = damga(yerel.alanlar)
  const ud = damga(uzak.alanlar)
  if (yd === ud) return { tur: 'yerel' }

  if (uzak.guncelleme < yerel.sira) return { tur: 'yerel' }
  /* Beraberlikte içerik karar veriyor — iki cihaz da aynı sonuca varsın. */
  if (uzak.guncelleme === yerel.sira && ud < yd) return { tur: 'yerel' }

  const y = yerel.alanlar?.metin
  const u = uzak.alanlar?.metin
  const metinKayboluyor =
    uzak.varlik === 'kayit' && typeof y === 'string' && y.trim() !== '' && y !== u

  return metinKayboluyor ? { tur: 'uzak', kurtarilacakMetin: y } : { tur: 'uzak' }
}
