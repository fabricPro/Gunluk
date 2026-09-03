/**
 * SERVİS İŞÇİSİNİN KURULUMU — "ana ekrana ekle" bunun üstünde duruyor.
 *
 * İşçinin kendisi `src/sw.js`; ne önbelleğe alındığı ve neyin ALINMADIĞI
 * orada yazılı. Burada yalnızca kayıt var.
 *
 * ── Neden ilk boyamadan sonra ──
 *
 * Açılış zaten ağır: Argon2, sqlite wasm, OPFS. Kayıt `load`tan sonraya
 * bırakılıyor ki ilk açılışta bant genişliğini defterin kendisiyle
 * yarıştırmasın.
 *
 * ── Neden cihazda kurulmuyor ──
 *
 * Capacitor kabuğunda varlıklar zaten pakette; araya bir önbellek
 * katmanı koymak yalnızca bir sürüm uyuşmazlığı kaynağı olurdu.
 */
export function servisIscisiniKur(nativeMi: boolean): void {
  if (nativeMi) return
  if (!('serviceWorker' in navigator)) return
  /* Güvenli bağlam şart; `localhost` de güvenli sayılıyor. */
  if (!window.isSecureContext) return

  const kur = (): void => {
    void navigator.serviceWorker.register('/sw.js').catch((e: unknown) => {
      /*
       * Sessiz geçilmiyor ama uygulama da durmuyor: işçi kurulmazsa
       * defter bugünkü gibi çalışır, yalnızca çevrimdışı açılmaz.
       */
      console.warn('[defter] servis işçisi kurulmadı', e)
    })
  }

  if (document.readyState === 'complete') kur()
  else window.addEventListener('load', kur, { once: true })
}
