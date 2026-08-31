/**
 * Uygulamanın dili.
 *
 * İki dil var ve ikisi de **birinci sınıf**: Türkçe için yazılmış her
 * makine (tarih, gövdeleme, kriz sınıflandırıcısı, arşiv cümleleri)
 * İngilizce için de yazıldı. Yarım yerelleştirme, arayüzü çevirip
 * altındaki dil makinesini Türkçe bırakmak olurdu; o durumda İngilizce
 * yazan bir kullanıcı için kriz sınıflandırıcısı sessizce hiç
 * çalışmazdı (KARARLAR.md · K-035).
 */
export type Dil = 'tr' | 'en'

export const DILLER: readonly Dil[] = ['tr', 'en']

/** Cihaz dilinden başlangıç dilini seçer; tanımadığı her dilde Türkçe. */
export function cihazDili(diller: readonly string[] = navigator.languages ?? []): Dil {
  for (const d of diller) {
    const k = d.toLowerCase()
    if (k === 'tr' || k.startsWith('tr-')) return 'tr'
    if (k === 'en' || k.startsWith('en-')) return 'en'
  }
  return 'tr'
}
