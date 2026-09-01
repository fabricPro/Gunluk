import { ac, kapat, type KilitParam } from './cekirdek/gizle.js'
import { kurtarmaCoz, kurtarmaYaz } from './cekirdek/kurtarma.js'
import { KASA_PARAM, kasaKimligiTuret, type KasaKimlik } from './cekirdek/kasaKimlik.js'
import type { KasaSatir } from './veri/senkronDepo.js'

/**
 * KASA AKIŞI — şifreleme burada, ağ orada.
 *
 * `veri/senkronDepo.ts`teki `Kasa` yalnızca iki dize taşıyor. Gizliyi
 * kapatan ve açan yer burası; ağ katmanı anahtarı hiç görmüyor. Senkron
 * zarfıyla aynı disiplin (KARARLAR.md · K-036, K-038).
 *
 * Sunucu somut sınıf olarak değil arayüz olarak görülüyor: testler
 * bellekte duran bir taklit koyup tam turu ağsız koşturuyor.
 */

export interface KasaSunucu {
  oku(): Promise<KasaSatir | null>
  yaz(satir: KasaSatir): Promise<void>
  sil(): Promise<void>
}

/** Kimliği verilen kasa için sunucuyu kuran şey — çağıran taraf sağlıyor. */
export type KasaYapici = (kimlik: KasaKimlik) => KasaSunucu

/**
 * Defter Kimliği'ni parolayla kilitleyip kasaya yazar.
 *
 * `false` dönüyorsa parola kısa ya da kod geçersiz — yazılmadı.
 */
export async function kasayaYaz(
  parola: string,
  kod: string,
  yap: KasaYapici,
  param: KilitParam = KASA_PARAM,
): Promise<boolean> {
  const gizli = kurtarmaCoz(kod)
  if (!gizli) return false
  const kimlik = await kasaKimligiTuret(parola, param)
  if (!kimlik) return false

  await yap(kimlik).yaz(await kapat(gizli, kimlik.sifre))
  return true
}

/**
 * Yalnızca parolayla Defter Kimliği'ni geri getirir.
 *
 * `null` dönüyorsa "bu parolayla açılacak kasa yok": parola kısa, hesap
 * yok, satır yok ya da gövde bu anahtarla açılmıyor. Dördü de kullanıcı
 * için aynı cümle — ve hiçbiri sessizce boş defter vermiyor.
 */
export async function kasadanKurtar(
  parola: string,
  yap: KasaYapici,
  param: KilitParam = KASA_PARAM,
): Promise<string | null> {
  const kimlik = await kasaKimligiTuret(parola, param)
  if (!kimlik) return null

  const satir = await yap(kimlik).oku()
  if (!satir) return null

  /*
   * GCM etiketi tutmazsa `ac` atıyor. Yakalanıyor: yanlış parola bir
   * çökme değil, cevabı "hayır" olan bir soru.
   */
  const gizli = await ac(satir, kimlik.sifre).catch(() => null)
  return gizli ? kurtarmaYaz(gizli) : null
}

/**
 * Parola değişince kasayı taşır.
 *
 * Kimlik paroladan türediği için parola değişimi kasanın HESABINI da
 * değiştiriyor. Sıra bağlayıcı: **önce yeni kasa yazılıyor, sonra eski
 * satır siliniyor.** Ters sırada, arada bir hata olsa kullanıcı hem eski
 * hem yeni kasasız kalırdı.
 *
 * Eski kasayı silmek başarısız olursa görmezden geliniyor: yeni kasa
 * yazıldığına göre kurtarma çalışıyor, geride kalan eski satır yalnızca
 * çöp — ve o da eski parolayla şifreli.
 */
export async function kasaTasi(
  eskiParola: string,
  yeniParola: string,
  kod: string,
  yap: KasaYapici,
  param: KilitParam = KASA_PARAM,
): Promise<boolean> {
  if (!(await kasayaYaz(yeniParola, kod, yap, param))) return false

  const eski = await kasaKimligiTuret(eskiParola, param)
  if (eski) await yap(eski).sil().catch(() => {})
  return true
}
