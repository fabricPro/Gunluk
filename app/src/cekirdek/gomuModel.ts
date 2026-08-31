/**
 * Model kimliği ve boyutu — saf sabitler.
 *
 * Bilerek ayrı bir dosya: `veri/gomu-isci.ts` transformers.js'i içe
 * aktarıyor ve o kütüphane onnxruntime-web ile birlikte megabaytlar
 * tutuyor. Sabitler orada dursaydı, onları okuyan her modül bütün
 * kütüphaneyi ana pakete çekerdi. Böylece model kodu YALNIZCA worker
 * parçasına giriyor ve o parça da özellik açılana kadar hiç indirilmiyor
 * (KARARLAR.md · K-029).
 */

/** Çok dilli olmak zorunda — Türkçe bir günlük için İngilizce model işe yaramaz. */
export const MODEL = 'Xenova/multilingual-e5-small'
/** Vektörler buna bağlı; değişirse indeks geçersiz sayılıp yeniden kuruluyor. */
export const MODEL_KIMLIK = `${MODEL}@q8/v1`
export const BOYUT = 384

/*
 * e5 ailesi girdiye önek bekliyor: belgeler "passage: ", sorular "query: ".
 * Önek olmadan belge-sorgu benzerlikleri bozuluyor; iki tarafa aynı öneki
 * vermek de yanlış.
 */
export const belgeOneki = (metin: string): string => `passage: ${metin}`
export const sorguOneki = (metin: string): string => `query: ${metin}`
