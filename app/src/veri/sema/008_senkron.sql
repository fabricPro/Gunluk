-- Senkron izi: hangi satır değişti, hangi sırayla, gönderildi mi.
--
-- Senkronlanan sekiz tablonun hiçbirinde ortak bir "değişti" damgası
-- yok (`kayit`ta guncelleme var, `tema`da hiçbir şey). Bu tablo o
-- damgayı tek yerde topluyor — ve silmeleri de tutuyor: silinen satırın
-- kendisi gittiği için "silindi" bilgisinin yaşayacağı başka yer yok.
--
-- İz TETİKLEYİCİLERLE tutuluyor, `Depo` metodlarıyla değil. Sebep: hangi
-- kod yolundan yazılırsa yazılsın iz düşsün. Elle çağrılan bir kayıt
-- fonksiyonu bir yerde unutulur; tetikleyici unutulmaz.

CREATE TABLE senkron_iz (
  varlik     TEXT    NOT NULL,
  id         TEXT    NOT NULL,
  -- Lamport saati (aşağıya bakın). Çakışmayı bu çözüyor.
  sira       INTEGER NOT NULL,
  silindi    INTEGER NOT NULL DEFAULT 0,
  gonderildi INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (varlik, id)
);

CREATE INDEX senkron_iz_bekleyen ON senkron_iz (gonderildi, sira);

-- ── Lamport saati ───────────────────────────────────────────
--
-- `deger` duvar saati DEĞİL, mantıksal saat. İki sebep:
--
--  1. Cihazın duvar saatiyle sıralama K-033'te zaten kırılmıştı: aynı
--     milisaniyede iki yazma eşit damga alıyor ve "sonra oldu" sorusu
--     yanlış cevap veriyordu.
--  2. Duvar saati sunucuya sızmamalı — gece 3'te yazdığınız kimseyi
--     ilgilendirmez. Zarfın içindeki tek sıralama alanı bu sayaç.
--
-- Cihazlar arası karşılaştırılabilir olması Lamport kuralından geliyor:
-- her yerel değişiklikte +1, her çekmede `max(yerel, çekilenlerin en
-- büyüğü)`. Böylece "A'nın gördüğü her şeyi gören B" her zaman daha
-- büyük bir sayı taşıyor.
--
-- `uygulaniyor` bayrağı: uzaktan gelen satırlar yerele yazılırken
-- tetikleyiciler susuyor. Susmasaydı çekilen her satır "gönderilecek"
-- diye işaretlenir ve iki cihaz birbirine sonsuza kadar aynı satırı
-- yollardı.

CREATE TABLE senkron_sayac (
  tek         INTEGER PRIMARY KEY CHECK (tek = 1),
  deger       INTEGER NOT NULL DEFAULT 0,
  uygulaniyor INTEGER NOT NULL DEFAULT 0
);

INSERT INTO senkron_sayac (tek, deger, uygulaniyor) VALUES (1, 0, 0);

-- ── tetikleyiciler ──────────────────────────────────────────
--
-- Sekiz tablo × üç işlem. Hepsi aynı üç adımı yapıyor:
--   1. `uygulaniyor` açıksa hiçbir şey yapma
--   2. sayacı ilerlet
--   3. ize yaz (varsa üzerine, `gonderildi`yi sıfırlayarak)
--
-- `gomu`, `kayit_fts` ve `ayar` bilerek YOK: ilk ikisi türetilmiş,
-- üçüncüsü cihaza özgü (KARARLAR.md · K-036).

CREATE TRIGGER iz_defter_ekle AFTER INSERT ON defter
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('defter', new.id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_defter_guncelle AFTER UPDATE ON defter
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('defter', new.id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_defter_sil AFTER DELETE ON defter
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('defter', old.id, (SELECT deger FROM senkron_sayac), 1, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 1, gonderildi = 0;
END;

CREATE TRIGGER iz_kayit_ekle AFTER INSERT ON kayit
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('kayit', new.id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_kayit_guncelle AFTER UPDATE ON kayit
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('kayit', new.id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_kayit_sil AFTER DELETE ON kayit
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('kayit', old.id, (SELECT deger FROM senkron_sayac), 1, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 1, gonderildi = 0;
END;

CREATE TRIGGER iz_tema_ekle AFTER INSERT ON tema
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('tema', new.id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_tema_guncelle AFTER UPDATE ON tema
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('tema', new.id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_tema_sil AFTER DELETE ON tema
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('tema', old.id, (SELECT deger FROM senkron_sayac), 1, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 1, gonderildi = 0;
END;

-- `kayit_tema` bileşik anahtarlı; iz kimliği iki parçanın birleşimi.
CREATE TRIGGER iz_kayit_tema_ekle AFTER INSERT ON kayit_tema
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('kayit_tema', new.kayit_id || '|' || new.tema_id,
            (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_kayit_tema_sil AFTER DELETE ON kayit_tema
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('kayit_tema', old.kayit_id || '|' || old.tema_id,
            (SELECT deger FROM senkron_sayac), 1, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 1, gonderildi = 0;
END;

CREATE TRIGGER iz_kenar_ekle AFTER INSERT ON kenar
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('kenar', new.id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_kenar_guncelle AFTER UPDATE ON kenar
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('kenar', new.id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_kenar_sil AFTER DELETE ON kenar
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('kenar', old.id, (SELECT deger FROM senkron_sayac), 1, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 1, gonderildi = 0;
END;

CREATE TRIGGER iz_baslik_ekle AFTER INSERT ON sayfa_baslik
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('sayfa_baslik', new.kayit_id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_baslik_guncelle AFTER UPDATE ON sayfa_baslik
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('sayfa_baslik', new.kayit_id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_baslik_sil AFTER DELETE ON sayfa_baslik
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('sayfa_baslik', old.kayit_id, (SELECT deger FROM senkron_sayac), 1, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 1, gonderildi = 0;
END;

CREATE TRIGGER iz_ek_ekle AFTER INSERT ON ek
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('ek', new.kayit_id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_ek_guncelle AFTER UPDATE ON ek
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('ek', new.kayit_id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_ek_sil AFTER DELETE ON ek
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('ek', old.kayit_id, (SELECT deger FROM senkron_sayac), 1, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 1, gonderildi = 0;
END;

CREATE TRIGGER iz_kapsul_ekle AFTER INSERT ON kapsul
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('kapsul', new.id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_kapsul_guncelle AFTER UPDATE ON kapsul
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('kapsul', new.id, (SELECT deger FROM senkron_sayac), 0, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 0, gonderildi = 0;
END;

CREATE TRIGGER iz_kapsul_sil AFTER DELETE ON kapsul
WHEN (SELECT uygulaniyor FROM senkron_sayac) = 0 BEGIN
  UPDATE senkron_sayac SET deger = deger + 1;
  INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
    VALUES ('kapsul', old.id, (SELECT deger FROM senkron_sayac), 1, 0)
    ON CONFLICT (varlik, id) DO UPDATE
      SET sira = excluded.sira, silindi = 1, gonderildi = 0;
END;

-- Mevcut satırlar için başlangıç izi: senkron açılınca defterin tamamı
-- gönderilecek. Sıra 0 — ilk gerçek değişiklik 1'den başlıyor.
INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
  SELECT 'defter', id, 0, 0, 0 FROM defter
  UNION ALL SELECT 'kayit', id, 0, 0, 0 FROM kayit
  UNION ALL SELECT 'tema', id, 0, 0, 0 FROM tema
  UNION ALL SELECT 'kayit_tema', kayit_id || '|' || tema_id, 0, 0, 0 FROM kayit_tema
  UNION ALL SELECT 'kenar', id, 0, 0, 0 FROM kenar
  UNION ALL SELECT 'sayfa_baslik', kayit_id, 0, 0, 0 FROM sayfa_baslik
  UNION ALL SELECT 'ek', kayit_id, 0, 0, 0 FROM ek
  UNION ALL SELECT 'kapsul', id, 0, 0, 0 FROM kapsul;
