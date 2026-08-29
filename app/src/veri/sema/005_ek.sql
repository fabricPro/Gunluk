-- Defter · şema sürümü 5 — sayfaya iliştirilen ek
--
-- Bilet, ekran görüntüsü, bir fotoğraf. Galeri değil: kayıt başına BİR ek,
-- ve bunu birincil anahtar zorluyor (KARARLAR.md · K-023).
--
-- `veri` base64 METİN, BLOB değil. Üç sebebi var:
--   1. Cihaz sürücüsü ikili veri taşımıyor — @capacitor-community/sqlite
--      parametreleri Capacitor köprüsünden JSON olarak geçiriyor, bir
--      Uint8Array oradan sağ çıkmaz. Tarayıcıda çalışıp cihazda sessizce
--      bozulan bir yol olurdu.
--   2. Mühürlü yedek de JSON (veri/dokum.ts). Metin sütunu olduğu gibi
--      geçiyor; böylece fotoğraflar yedeğe ve geri yüklemeye tek satır ek
--      kod yazmadan giriyor (K-022).
--   3. Cihazda dosyanın tamamı SQLCipher altında (K-002). Diske ayrı dosya
--      yazsaydık onu kendimiz şifreleyip ikinci bir anahtar yolu açmamız
--      gerekirdi.
--
-- `kayit`'tan ayrı tablo olması da şart: KAYIT_SECIM ve FTS her okumada
-- megabaytları sürüklemesin.

CREATE TABLE ek (
  kayit_id TEXT PRIMARY KEY REFERENCES kayit (id) ON DELETE CASCADE,
  tur      TEXT NOT NULL,               -- 'image/jpeg'
  veri     TEXT NOT NULL,               -- base64 gövde, 'data:' öneki yok
  en       INTEGER NOT NULL,            -- sayfa maliyeti orana bağlı
  boy      INTEGER NOT NULL,
  bayt     INTEGER NOT NULL,
  eklenme  INTEGER NOT NULL
);
