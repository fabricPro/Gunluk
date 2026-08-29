-- Defter · şema sürümü 2 — kitaplık
--
-- Kullanıcı tek deftere bağlı kalmıyor: birden çok defter tutabiliyor, ad
-- verebiliyor, kapak seçebiliyor, rafta dizebiliyor.
--
-- Cilt artık soyut bir bölüm değil: aynı adlı defterin devamı. Bir defter
-- dolunca kapanır ve aynı adla "Cilt II" doğar, rafa yanına dizilir
-- (KARARLAR.md · K-016).

CREATE TABLE defter (
  id        TEXT PRIMARY KEY,
  ad        TEXT NOT NULL,
  cilt      INTEGER NOT NULL DEFAULT 1,
  kapak     TEXT NOT NULL DEFAULT 'deri',
  raf       INTEGER NOT NULL DEFAULT 0,
  sira      INTEGER NOT NULL DEFAULT 0,
  olusturma INTEGER NOT NULL,
  kapandi   INTEGER NOT NULL DEFAULT 0,
  kapanma   INTEGER,
  UNIQUE (ad, cilt)
);
CREATE INDEX defter_raf ON defter (raf, sira);

-- Var olan bütün kayıtları taşıyacak defter. Adı eski cilt tablosundan
-- gelir; yoksa "Defter". Kayıt yoksa bile açılır: kullanıcı boş bir
-- deftere yazmaya devam edebilsin.
INSERT INTO defter (id, ad, cilt, kapak, raf, sira, olusturma, kapandi)
SELECT
  'defter-1',
  coalesce((SELECT ad FROM cilt WHERE no = 1 AND ad IS NOT NULL), 'Defter'),
  1, 'deri', 0, 0,
  coalesce((SELECT min(olusturma) FROM kayit), unixepoch() * 1000),
  0;

-- kayit.defter_id — SQLite'ta NOT NULL sütun eklemek için tablo yeniden
-- kuruluyor. FTS tetikleyicileri tabloya bağlı olduğu için önce onlar
-- düşürülüp sonra yeniden kuruluyor.
DROP TRIGGER kayit_fts_ekle;
DROP TRIGGER kayit_fts_sil;
DROP TRIGGER kayit_fts_guncelle;

CREATE TABLE kayit_yeni (
  id          TEXT PRIMARY KEY,
  defter_id   TEXT NOT NULL REFERENCES defter (id) ON DELETE CASCADE,
  tarih       TEXT NOT NULL,
  saat        TEXT NOT NULL,
  metin       TEXT NOT NULL,
  sira        INTEGER NOT NULL DEFAULT 0,
  olusturma   INTEGER NOT NULL,
  guncelleme  INTEGER NOT NULL,
  duzenlendi  INTEGER NOT NULL DEFAULT 0
);
INSERT INTO kayit_yeni (id, defter_id, tarih, saat, metin, sira, olusturma, guncelleme, duzenlendi)
SELECT id, 'defter-1', tarih, saat, metin, sira, olusturma, guncelleme, duzenlendi FROM kayit;

DROP TABLE kayit;
ALTER TABLE kayit_yeni RENAME TO kayit;
CREATE INDEX kayit_tarih ON kayit (tarih, sira, saat);
CREATE INDEX kayit_defter ON kayit (defter_id, tarih, sira, saat);

-- FTS indeksini yeni tablodan yeniden kur.
DROP TABLE kayit_fts;
CREATE VIRTUAL TABLE kayit_fts USING fts5 (
  metin,
  content = 'kayit',
  content_rowid = 'rowid',
  tokenize = "unicode61 remove_diacritics 0"
);
INSERT INTO kayit_fts (rowid, metin) SELECT rowid, metin FROM kayit;

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

-- Eski cilt tablosunun işi bitti; bilgisi defter tablosuna taşındı.
DROP TABLE cilt;

-- Açık defter, uygulama yeniden açıldığında geri gelsin.
INSERT INTO ayar (anahtar, deger) VALUES ('aktifDefter', 'defter-1')
  ON CONFLICT (anahtar) DO UPDATE SET deger = excluded.deger;
