/**
 * SERVİS İŞÇİSİ — "indirilebilir uygulama" sözünün karşılığı.
 *
 * Tarayıcıdaki defter bugüne kadar ağ olmadan AÇILAMIYORDU: kabuk her
 * seferinde sunucudan geliyordu. Defterin kendisi zaten cihazda (OPFS +
 * SQLite) ve çevrimdışı çalışıyor; eksik olan tek şey kabuğun kendisiydi.
 * Bu dosya onu kapatıyor — ve ana ekrana kurulabilmenin de şartı.
 *
 * ── NE ÖNBELLEĞE ALINIYOR ────────────────────────────────────
 *
 * YALNIZCA kendi kaynağımızdaki derleme çıktısı: HTML kabuğu, JS, CSS,
 * yazı tipleri, sqlite wasm. Liste derleme sırasında yazılıyor
 * (`vite.config.ts` · `sIsciEklentisi`), tahmin edilmiyor.
 *
 * ── NE ALINMIYOR (ve bu bir ilke) ────────────────────────────
 *
 *   · `/auth`, `/rest`, `/api` — hesap ve senkron. Bir yanıtın
 *     önbelleğe düşmesi, kullanıcının şifreli defterinin diske ikinci
 *     bir kopyasının çıkması demek olurdu. Bu istekler işçiye hiç
 *     UĞRAMIYOR: `respondWith` çağrılmıyor, tarayıcı doğrudan ağa
 *     gidiyor (PROJE.md · 2.3).
 *   · Başka kaynaklar. Gömü modeli CDN'den iniyor ve ~145 MB;
 *     önbelleğe alınsa cihaz dolardı (KARARLAR.md · K-029).
 *   · Kullanıcı metni. Zaten hiçbir zaman bir HTTP adresinde durmuyor;
 *     yakılan sayfa da öyle (PROJE.md · 2.2).
 *
 * ── BELGE NEDEN "ÖNCE AĞ" ────────────────────────────────────
 *
 * Kabuk önbellekten önce verilseydi kullanıcı eski bir sürüme
 * çakılırdı. Bu oturumda tam olarak bunun bedeli ödendi: bir senkron
 * düzeltmesinin kullanıcının telefonuna ULAŞMASI gerekiyordu. Gezinme
 * isteği önce ağa gidiyor, ağ yoksa önbellekteki kabuk veriliyor.
 * Özetli dosya adları değişmez olduğu için diğer varlıklar önce
 * önbellekten veriliyor.
 */

const SURUM = '__DEFTER_SURUM__'
const VARLIKLAR = __DEFTER_VARLIKLAR__

/** Bu yollar işçiye hiç uğramıyor — ağ ve hesap trafiği. */
const GECILEN = ['/auth', '/rest', '/api']

/**
 * `Vary` YOK SAYILIYOR — ve bu satır olmadan çevrimdışı açılış ÖLÜYOR.
 *
 * Sunucu varlıkları `Vary: Origin` ile veriyor. `addAll` kurulum
 * sırasında `Origin` başlığı OLMADAN istiyor; sayfa ise aynı dosyayı
 * `crossorigin` ile, yani `Origin` başlığıyla istiyor (Vite modül
 * betiklerine ve stil dosyasına onu koyuyor). İki istek `Vary` yüzünden
 * eşleşmiyor, `caches.match` boş dönüyor ve ağ yokken CSS ile JS
 * düşüyor — kabuk geliyor ama uygulama açılmıyor.
 *
 * Yok saymak burada güvenli: önbellekte YALNIZCA kendi derleme
 * çıktımız var ve her adresin tek bir karşılığı bulunuyor. `Vary`nin
 * ayırt edeceği ikinci bir temsil yok.
 *
 * Bunu hiçbir birim testi yakalamadı; `arac/muhurDenemesi.mjs`teki
 * `pwa` aşaması yakaladı (KARARLAR.md · K-049).
 */
const BAK = { ignoreVary: true }

self.addEventListener('install', (olay) => {
  olay.waitUntil(
    (async () => {
      const kap = await caches.open(SURUM)
      await kap.addAll(VARLIKLAR)
      /*
       * Beklemeden devral. Beklemek "bütün sekmeler kapanana kadar eski
       * sürüm" demek; bir düzeltmenin kullanıcıya ulaşması günler
       * sürebilirdi.
       */
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (olay) => {
  olay.waitUntil(
    (async () => {
      /* Eski sürümün varlıkları siliniyor — birikirlerse cihaz dolar. */
      for (const ad of await caches.keys()) if (ad !== SURUM) await caches.delete(ad)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (olay) => {
  const istek = olay.request
  if (istek.method !== 'GET') return
  /*
   * Parçalı istek (Range) önbelleğe ALINMAZ ve önbellekten VERİLMEZ.
   * 206 yanıtı `ok` sayılıyor; saklansaydı sonraki tam istek yarım bir
   * gövde alır ve dosya sessizce bozulurdu.
   */
  if (istek.headers.has('range')) return

  const adres = new URL(istek.url)
  if (adres.origin !== self.location.origin) return
  if (GECILEN.some((y) => adres.pathname === y || adres.pathname.startsWith(y + '/'))) return

  if (istek.mode === 'navigate') {
    olay.respondWith(
      (async () => {
        try {
          const yanit = await fetch(istek)
          if (yanit.status === 200) (await caches.open(SURUM)).put('/', yanit.clone())
          return yanit
        } catch {
          const kabuk = await caches.match('/', BAK)
          if (kabuk) return kabuk
          throw new Error('defter çevrimdışı ve kabuk önbellekte yok')
        }
      })(),
    )
    return
  }

  olay.respondWith(
    (async () => {
      const bulunan = await caches.match(istek, BAK)
      if (bulunan) return bulunan
      const yanit = await fetch(istek)
      if (yanit.status === 200 && yanit.type === 'basic')
        (await caches.open(SURUM)).put(istek, yanit.clone())
      return yanit
    })(),
  )
})
