/**
 * MÜHÜR YUVALARI — adları tek yerde.
 *
 * Defter tarayıcıda OPFS'e mühürlü yazılıyor ve iki yuva dönüşümlü
 * kullanılıyor: yazma eskisine gidiyor, okuma yeniden eskiye doğru
 * deneniyor. Yarım kalan bir yazma yalnızca bir yuvayı bozuyor
 * (KARARLAR.md · K-037).
 *
 * İki taraf da bu adları bilmek zorunda: yuvaları YAZAN worker
 * (`sqlite-isci.ts`) ve kilitliyken SİLEN temizleyici. İkinci kopya
 * konsaydı biri değişip diğeri kalabilirdi.
 */
export const YUVALAR = ['defter.muhur.1', 'defter.muhur.2'] as const

/**
 * Yuvaları siler — veritabanı AÇIK OLMADAN.
 *
 * Çıkışta worker'ın `unut`u kullanılıyor, ama o defter açıkken çalışıyor.
 * Kilitli bir defterden çıkış yolunda veritabanı hiç açılmıyor: yuvaların
 * buradan silinmesi gerekiyor.
 *
 * Silinmezlerse yeni kurulumdaki yeni ana anahtar onları açamaz ve açılış
 * "yuva var ama hiçbiri açılmadı" diye durur — uygulama bir daha açılmaz
 * (KARARLAR.md · K-039).
 */
export async function yuvalariSil(): Promise<void> {
  const kok = await navigator.storage?.getDirectory?.()
  if (!kok) return
  for (const ad of YUVALAR) await kok.removeEntry(ad).catch(() => {})
}
