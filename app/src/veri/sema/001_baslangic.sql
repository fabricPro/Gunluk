-- Defter · şema sürümü 1
-- Bütün dosya SQLCipher ile şifreli. FTS indeksi de bu şifreli dosyanın
-- içinde durur; arama ile şifreleme bu yüzden çakışmıyor (KARARLAR.md · K-002).

CREATE TABLE kayit (
  id          TEXT PRIMARY KEY,
  tarih       TEXT NOT NULL,              -- 'YYYY-MM-DD'
  saat        TEXT NOT NULL,              -- 'HH:MM'
  metin       TEXT NOT NULL,
  sira        INTEGER NOT NULL DEFAULT 0, -- aynı gün içindeki sıra
  olusturma   INTEGER NOT NULL,
  guncelleme  INTEGER NOT NULL,
  duzenlendi  INTEGER NOT NULL DEFAULT 0  -- düzeltme iz bırakır
);
CREATE INDEX kayit_tarih ON kayit (tarih, sira, saat);

CREATE TABLE tema (
  id  TEXT PRIMARY KEY,
  ad  TEXT NOT NULL
);

CREATE TABLE kayit_tema (
  kayit_id TEXT NOT NULL REFERENCES kayit (id) ON DELETE CASCADE,
  tema_id  TEXT NOT NULL REFERENCES tema (id) ON DELETE CASCADE,
  PRIMARY KEY (kayit_id, tema_id)
);
CREATE INDEX kayit_tema_tema ON kayit_tema (tema_id);

-- Kenar notu ve sayfa başlığı kalıcı kayıt kimliğine bağlı (K-005).
CREATE TABLE kenar (
  id       TEXT PRIMARY KEY,
  kayit_id TEXT NOT NULL REFERENCES kayit (id) ON DELETE CASCADE,
  metin    TEXT NOT NULL,
  tarih    TEXT NOT NULL
);
CREATE INDEX kenar_kayit ON kenar (kayit_id);

CREATE TABLE sayfa_baslik (
  kayit_id TEXT PRIMARY KEY REFERENCES kayit (id) ON DELETE CASCADE,
  baslik   TEXT NOT NULL
);

-- Cilt kapandığında son_kayit_id ile aralığı dondurulur (K-006).
CREATE TABLE cilt (
  no           INTEGER PRIMARY KEY,
  ad           TEXT,
  kapandi      INTEGER NOT NULL DEFAULT 0,
  kapanma      INTEGER,
  son_kayit_id TEXT REFERENCES kayit (id) ON DELETE SET NULL
);

CREATE TABLE kapsul (
  id           TEXT PRIMARY KEY,
  yazilma      INTEGER NOT NULL,
  acilma       TEXT NOT NULL,    -- 'YYYY-MM-DD', o güne kadar mühürlü
  metin        TEXT NOT NULL,
  cevap        TEXT,
  cevap_tarihi INTEGER
);

CREATE TABLE ayar (
  anahtar TEXT PRIMARY KEY,
  deger   TEXT NOT NULL
);

-- Arama. Türkçe karakterler için remove_diacritics kapalı: 'açık' ile
-- 'acik' aynı sözcük değil.
CREATE VIRTUAL TABLE kayit_fts USING fts5 (
  metin,
  content = 'kayit',
  content_rowid = 'rowid',
  tokenize = "unicode61 remove_diacritics 0"
);

CREATE TRIGGER kayit_fts_ekle AFTER INSERT ON kayit BEGIN
  INSERT INTO kayit_fts (rowid, metin) VALUES (new.rowid, new.metin);
END;
CREATE TRIGGER kayit_fts_sil AFTER DELETE ON kayit BEGIN
  INSERT INTO kayit_fts (kayit_fts, rowid, metin) VALUES ('delete', old.rowid, old.metin);
END;
CREATE TRIGGER kayit_fts_guncelle AFTER UPDATE OF metin ON kayit BEGIN
  INSERT INTO kayit_fts (kayit_fts, rowid, metin) VALUES ('delete', old.rowid, old.metin);
  INSERT INTO kayit_fts (rowid, metin) VALUES (new.rowid, new.metin);
END;
