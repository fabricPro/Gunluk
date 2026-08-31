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

/* ── İNGİLİZCE ─────────────────────────────────────────────
   Çeviri değil, karşılık: aynı yay (neden → fark et → söylemediğin →
   kişi → beklenti → gelecekteki sen → dönüp bak) ve aynı ses. Soru
   olay sorar, duygu sormaz — "how did you feel today" soyut ve hiçbir
   şey yazdırmıyor (KARARLAR.md · K-019, K-035). */

export const ILK_HAFTA_EN: readonly string[] = [
  'Why did you start this notebook?',
  "What stayed in your head today? It can be small.",
  "What happened today that you didn't tell anyone?",
  'Who have you been thinking about most lately?',
  'Were you waiting for something today? Did it come?',
  'Six months from now, reading this — what should you know about today?',
  "It's been a week. Go back over what you wrote — what repeated most?",
]

export const HAVUZ_EN: readonly string[] = [
  'What kept you busy today?',
  "Is there something you've stopped doing lately?",
  "What's the question you asked nobody this week?",
  'If you put something off today, what was it?',
  'When were you last surprised?',
  'Is there a sentence repeating in your head?',
  'Were you angry at someone? What did you want to say to them?',
  "Is there a conversation you're avoiding?",
  'What was the one thing that went well today?',
  'What do you think you were doing a year ago today?',
  'Where would you rather be at this hour tomorrow?',
  "Did someone you haven't seen in a long time cross your mind?"
]

export const ILK_HAFTA_GUN = ILK_HAFTA.length
