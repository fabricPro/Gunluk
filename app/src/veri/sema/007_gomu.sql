-- Defter · şema sürümü 7 — gömü vektörleri
--
-- Anlamsal arama için her kaydın vektörü. Vektör CİHAZDA hesaplanıyor:
-- ilke 2.3 ham metnin cihazdan çıkmasını yasaklıyor, o yüzden model metne
-- gidiyor, metin modele değil (KARARLAR.md · K-029).
--
-- `vektor` base64 METİN, BLOB değil — K-023'teki gerekçe: Capacitor
-- köprüsü ikili veri taşımıyor. İçerik L2 normalize edilip int8'e inmiş
-- 384 sayı; ayrı bir ölçek sütunu gerekmiyor.
--
-- `model` sütunu vektörün hangi modelle üretildiğini söylüyor. Model
-- değişirse eski satırlar geçersiz sayılıp yeniden gömülüyor; iki farklı
-- modelin vektörlerini karşılaştırmak anlamsız sonuç üretir.
--
-- Bu tablo YEDEĞE GİRMİYOR (veri/dokum.ts · ATLA). Vektör türetilmiş veri,
-- kullanıcının yazdığı şey değil: yedeği şişirir ve onu bir model sürümüne
-- bağlardı. Geri yüklemeden sonra indeks yeniden kuruluyor.

CREATE TABLE gomu (
  kayit_id   TEXT PRIMARY KEY REFERENCES kayit (id) ON DELETE CASCADE,
  model      TEXT NOT NULL,
  vektor     TEXT NOT NULL,
  guncelleme INTEGER NOT NULL
);
CREATE INDEX gomu_model ON gomu (model);
