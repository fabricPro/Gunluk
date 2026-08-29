/**
 * Defterin sorduğu sorular.
 *
 * Hepsi burada yazılı; hiçbiri model çağrısıyla üretilmiyor. "Bana bir şey
 * sor" düğmesi de bu listeden çekiyor — çevrimdışı, ilke 2.3'e dokunmadan.
 *
 * Ses: soru olay sorar, duygu sormaz. "Bugün nasıl hissettin" soyut ve
 * hiçbir şey yazdırmıyor; "bugün kimseye söylemediğin ne oldu" yazdırıyor.
 * Duygu varsayan soru ("bugün zor muydu") varsaydığı an yorum yapmış olur.
 */

/**
 * İlk yedi yazma günü. Yay: neden → fark et → söylemediğin → kişi →
 * beklenti → gelecekteki sen → dönüp bak.
 */
export const ILK_HAFTA: readonly string[] = [
  'Bu defteri neden açtın?',
  'Bugün aklından çıkmayan şey neydi? Küçük olabilir.',
  'Bugün kimseye söylemediğin ne oldu?',
  'Bu aralar en çok kimi düşünüyorsun?',
  'Bugün beklediğin bir şey var mıydı? Oldu mu?',
  'Altı ay sonra bunu okuyan sen, bugün hakkında ne bilmeli?',
  'Bir hafta oldu. Yazdıklarına dön ve bak — en çok ne tekrar etmiş?',
]

/** İlk hafta bittikten sonra, yalnızca kullanıcı istediğinde sorulanlar. */
export const HAVUZ: readonly string[] = [
  'Bugün seni en çok ne oyaladı?',
  'Son zamanlarda bıraktığın bir şey var mı?',
  'Bu hafta kimseye sormadığın soru ne?',
  'Bugün bir şeyi ertelediysen, neydi?',
  'En son ne zaman şaşırdın?',
  'Kafanda tekrar eden bir cümle var mı?',
  'Birine kızdın mı? Ona ne demek isterdin?',
  'Kaçındığın bir konuşma var mı?',
  'Bugün iyi giden tek şey neydi?',
  'Geçen sene bugün ne yapıyordun sence?',
  'Yarın bu saatte nerede olmak isterdin?',
  'Uzun zamandır görmediğin biri aklına geldi mi?',
]

export const ILK_HAFTA_GUN = ILK_HAFTA.length
