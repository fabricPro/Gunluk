-- Defter · şema sürümü 6 — kenar notunun zaman damgası
--
-- `tarih` sütunu okunur bir dize; sıralama ve "bu not bugün mü yazıldı"
-- sorusu için gerçek bir zaman damgası gerekiyor. Kenar notu yazıldığı gün
-- silinebiliyor, ertesi gün kalıcılaşıyor (KARARLAR.md · K-024).
--
-- Varsayılan 0: göçten önceki notlar hiçbir zaman "bugün yazılmış"
-- sayılmaz, yani kalıcıdırlar. Yanlış tarafa düşen varsayılan bu değil.

ALTER TABLE kenar ADD COLUMN olusturma INTEGER NOT NULL DEFAULT 0;
