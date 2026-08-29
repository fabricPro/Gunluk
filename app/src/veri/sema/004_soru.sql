-- Defter · şema sürümü 4 — kayda eşlik eden soru
--
-- Defterin sorduğu soru kayıtla birlikte saklanıyor ama METİN SÜTUNUNA
-- KARIŞMIYOR (KARARLAR.md · K-020). Sebebi ilkesel: FTS indeksi ve
-- soruCoz yalnızca `metin`'i görür. Soru `metin`'in içinde olsaydı arşiv,
-- uygulamanın kendi cümlelerinden cevap kurmaya başlardı — "arşiv
-- uydurmaz" ilkesi tam orada aşınırdı.

ALTER TABLE kayit ADD COLUMN soru TEXT;
