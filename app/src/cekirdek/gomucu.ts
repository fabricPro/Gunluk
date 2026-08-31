/**
 * Gömücü arayüzü — metni sayı vektörüne çeviren şey.
 *
 * Çekirdek katmanda duruyor ve DOM da ağ da bilmiyor. Gerçek uygulaması
 * `ekran/` katmanında, bir Web Worker içinde çalışan transformers.js;
 * testlerde deterministik bir sahte gömücü aynı arayüzü karşılıyor.
 *
 * Bu ayrım gerçek: model ağırlıkları ~130 MB ve bu geliştirme ortamında
 * indirilemiyor. Arayüz sayesinde boru hattının tamamı — niceleme,
 * indeksleme, melez sıralama — modelsiz test edilebiliyor
 * (KARARLAR.md · K-029).
 */
export interface Gomucu {
  /**
   * Model kimliği ve sürümü.
   *
   * Vektörler buna bağlı: kimlik değişirse eski satırlar geçersiz sayılıp
   * yeniden gömülüyor. İki farklı modelin vektörlerini karşılaştırmak
   * anlamsız sonuç üretir.
   */
  readonly kimlik: string
  /** Vektör boyutu. */
  readonly boyut: number
  /** Metinleri gömer. Sıra korunur. */
  goc(metinler: string[]): Promise<Float32Array[]>
}
