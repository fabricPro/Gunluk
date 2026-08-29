-- Defter · şema sürümü 3 — defterin kendi sayfa sınırı
--
-- Sayfa sayısı artık tek bir sabit değil, her defterin kendi ölçüsü.
-- Kullanıcı yeni defter açarken seçiyor, dolunca törende uzatabiliyor
-- (KARARLAR.md · K-017).

ALTER TABLE defter ADD COLUMN sayfa_siniri INTEGER NOT NULL DEFAULT 45;
