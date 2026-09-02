-- ════════════════════════════════════════════════════════════
--  SUNUCU ŞEMASI — Neon Postgres (senkron)
-- ════════════════════════════════════════════════════════════
--
--  Bu dosya BAŞTAN SONA, İSTENDİĞİ KADAR ÇOK KEZ çalıştırılabilir:
--  her ifade `if not exists` / `or replace` / `drop ... if exists` ile
--  yazıldı. Neon konsolundaki SQL Editor'e olduğu gibi yapıştırılır.
--
--  Bu dosyayı uygulamanın göç makinesi ÇALIŞTIRMAZ. `001..008` yerel
--  SQLite'ın şeması; bu ise sunucudaki tek tablonun kaydı. Burada
--  durmasının sebebi: sunucu şeması da koddur ve gözden geçirilebilir
--  olmalı. Neon'a elle uygulanır (Neon MCP / SQL Editor).
--
--  TEK CÜMLE: sunucu defteri okuyamaz. `govde` cihazda AES-GCM ile
--  şifrelendi ve anahtar hiçbir zaman buraya gelmiyor
--  (KARARLAR.md · K-036).
--
--  Sunucunun gördüğü üstveri — dürüst liste:
--    · opak hesap kimliği   (kurtarma kodundan türetilmiş, kişisel veri değil)
--    · opak satır kimliği   (HMAC; varlık tipi bile görünmüyor)
--    · sürüm sayacı         (duvar saati DEĞİL)
--    · şifreli gövdenin boyutu
--    · sunucunun aldığı an
--  Yani: kaç kaydınız olduğu, ne sıklıkta eşitlediğiniz, kabaca ne kadar
--  yazdığınız. Metin, tarih, saat, defter adı, başlık, tema, fotoğraf —
--  hiçbiri değil.

-- ── `auth.user_id()`e erişim: `defter_kim()` sarmalayıcısı ──
--
-- `authenticated` rolünün `auth` ŞEMASINA USAGE yetkisi YOK. Fonksiyona
-- EXECUTE yetkisi var ama şemaya girilemediği için çağrı
-- `permission denied for schema auth` ile düşüyor: SQLSTATE 42501, ve
-- Data API bunu 403 olarak döndürüyor.
--
-- Canlıda tam olarak şu oluyordu: hesap açılıyor, JWT alınıyor, kasa
-- OKUNUYOR (tablo boş olduğu için RLS ifadesi hiç değerlendirilmiyor,
-- yani okuma çalışıyor GİBİ görünüyor), ama ilk yazma 403 ile düşüyordu
-- — tetik `auth.user_id()`ye dokunduğu anda. Sunucuya bugüne kadar tek
-- satır yazılamamasının sebebi buydu (KARARLAR.md · K-041).
--
-- Yetkiyi doğrudan vermek MÜMKÜN DEĞİL: `auth` şeması `cloud_admin`e
-- ait ve `neondb_owner` orada `grant` edemiyor — denendi, Postgres
-- hata değil UYARI verip hiçbir şey yapmıyor. Neon'un Data API'sini
-- yeniden kurmak (varsayılan grant'lerle) uç nokta adresini
-- değiştirebilirdi; o adres `app/.env` ve `api/vekil.ts` içinde yazılı.
--
-- Bu yüzden köprü kendi şemamızda: `neondb_owner` `auth` şemasını
-- KULLANABİLİYOR, o yüzden ona ait `security definer` bir sarmalayıcı
-- çağrıyı taşıyor.
--
-- YETKİ YÜKSELTMESİ DEĞİL: `auth.user_id()` oturumdaki JWT'nin `sub`
-- iddiasını okuyor ve o JWT isteği YAPAN kullanıcınınki. Tanımlayıcı
-- olarak koşmak hangi JWT'nin okunduğunu değiştirmiyor; herkes yine
-- yalnızca kendi kimliğini alıyor. `search_path` sabitleniyor ki
-- arama yolu ele geçirilemesin.

create or replace function defter_kim() returns text
language sql stable security definer
set search_path = auth, pg_catalog
as $$ select auth.user_id() $$;

comment on function defter_kim() is
  'auth.user_id() köprüsü: authenticated rolünün auth şemasına erişimi yok.';

revoke all on function defter_kim() from public;
grant execute on function defter_kim() to authenticated;


create table if not exists defter_blob (
  -- defter_kim() = JWT'nin `sub` iddiası (yukarıdaki sarmalayıcı).
  -- Tetik her yazmada yeniden atıyor: istemci başkasının kimliğini yazamıyor.
  kullanici text        not null default (defter_kim()),
  -- HMAC(kok, tip|id). Varlığın tipi bile burada görünmüyor.
  satir     text        not null,
  -- Sunucunun attığı, kesin artan, benzersiz sayaç. Çekme su seviyesi bu.
  surum     bigint      default 0,
  iv        text,
  -- base64 AES-GCM. Silme de BURADA: mezar taşı, alanları boş olan bir
  -- zarf. Ayrı bir `silindi` sütunu YOK ve olmamalı — olsaydı sunucu
  -- hangi satırın silindiğini görürdü. `senkronBicim.test.ts` silme ile
  -- canlı satırın sunucudan ayırt edilemediğini sabitliyor.
  govde     text,
  alindi    timestamptz not null default now(),
  primary key (kullanici, satir)
);

comment on table defter_blob is
  'Uçtan uca şifreli defter satırları. Sunucu içeriği OKUYAMAZ.';

-- ── sürümü SUNUCU atar ──────────────────────────────────────
--
-- İstemcinin verdiği bir sayaca güvenilemez; ayrıca iki cihaz aynı
-- sayıyı üretirse çekme su seviyesi satır atlar. Dizi bütün hesaplar
-- için ortak: RLS yüzünden istemci yalnızca kendi satırlarını gördüğü
-- için boşluklar hiçbir şey söylemiyor — ve duvar saati sızmıyor.
--
-- Çakışma sıralaması bu alanla YAPILMIYOR: o karar, şifreli gövdenin
-- içindeki `guncelleme` damgasıyla cihazda veriliyor. Buradaki sürüm
-- yalnızca "neyi henüz çekmedim" sorusunun cevabı.

create sequence if not exists defter_surum_dizi as bigint;

create or replace function defter_surum_ata() returns trigger
language plpgsql as $$
begin
  new.surum     := nextval('defter_surum_dizi');
  new.alindi    := now();
  new.kullanici := defter_kim();
  return new;
end;
$$;

drop trigger if exists defter_blob_surum on defter_blob;
create trigger defter_blob_surum before insert or update on defter_blob
  for each row execute function defter_surum_ata();

-- ── satır düzeyi güvenlik ───────────────────────────────────
--
-- `force` da açık: tablonun sahibi bile politikaya tabi.
-- `anonymous` rolüne HİÇBİR yetki verilmiyor — JWT'siz kimse dokunamaz.

alter table defter_blob enable row level security;
alter table defter_blob force  row level security;

drop policy if exists kendi_satirlari on defter_blob;
create policy kendi_satirlari on defter_blob for all to authenticated
  using       (defter_kim() = kullanici)
  with check  (defter_kim() = kullanici);

create index if not exists defter_blob_cekme on defter_blob (kullanici, surum);

grant select, insert, update, delete on defter_blob to authenticated;

-- ── eski `silindi` sütunu ───────────────────────────────────
--
-- İlk taslakta mezar taşı ayrı bir bayraktı. Silme şifreli gövdenin
-- içine alınınca sütun hem gereksiz hem sızıntı oldu; istemci ona hiç
-- yazmıyor. Bu satır, o taslağı uygulamış bir veritabanını bugünkü
-- şemaya getiriyor (KARARLAR.md · K-036).

alter table defter_blob drop column if exists silindi;


-- ════════════════════════════════════════════════════════════
--  KASA — Defter Kimliği'nin paroladan açılan kopyası
-- ════════════════════════════════════════════════════════════
--
--  Tarayıcı site verilerini temizleyince defter kaybolmuyor: senkron
--  açıksa her satır zaten burada. Kaybolan şey KODUN KENDİSİ, çünkü
--  yalnızca localStorage'ta duruyordu. Kasa o kodu kullanıcının
--  parolasıyla şifreleyip tutuyor (KARARLAR.md · K-038).
--
--  BURADA DURAN ŞEY 16 BAYTLIK BİR GİZLİ VE ŞİFRELİDİR.
--  Şifreyi açan anahtar kullanıcının parolasından CİHAZDA türüyor
--  (Argon2id t=4, m=128 MiB) ve parola sunucuya hiç gelmiyor.
--
--  Kasa ve defter satırları AYNI hesabın altında (KARARLAR.md · K-043).
--  K-038 bunların ayrı hesaplar olmasını şart koşmuştu; o ayrım hiç
--  gerçekleşmedi ve gerçekleşemezdi de — bir kaynakta aynı anda tek
--  oturum çerezi olabiliyor. Gerekçesi (kurtarmada elde kod yok, kasaya
--  paroladan ulaşılmalı) tek hesapla zaten karşılanıyor.
--
--  ŞİFRELEME ayrımı duruyor: defter satırları KOD türevli anahtarla,
--  kasa PAROLA türevli anahtarla şifreli. Sunucu ikisini de açamıyor.
--
--  Dürüst olmak gerekirse bu bir bedel: senkronda sunucudaki defteri
--  açmanın tek yolu 128 bit rastgele bir kodu kırmaktı. Artık burada
--  insan parolasıyla şifrelenmiş ikinci bir hedef var ve tek engel
--  Argon2id. Uçtan uca şifreleme bozulmuyor — sunucu ne defteri ne
--  anahtarı açabiliyor — ama en zayıf halka artık parolanın gücü.

create table if not exists defter_kasa (
  -- defter_kim() = kasa hesabının JWT `sub` iddiası. İstemci başkasının
  -- kasasına yazamıyor; tetik her yazmada yeniden atıyor.
  kullanici text        not null default (defter_kim()) primary key,
  iv        text        not null,
  -- base64 AES-GCM(paroladan türeyen anahtar, 16 baytlık gizli).
  govde     text        not null,
  alindi    timestamptz not null default now()
);

comment on table defter_kasa is
  'Defter Kimliğinin parolayla şifrelenmiş kopyası. Sunucu AÇAMAZ.';

create or replace function defter_kasa_sahip() returns trigger
language plpgsql as $$
begin
  new.kullanici := defter_kim();
  new.alindi    := now();
  return new;
end;
$$;

drop trigger if exists defter_kasa_sahiplik on defter_kasa;
create trigger defter_kasa_sahiplik before insert or update on defter_kasa
  for each row execute function defter_kasa_sahip();

-- Aynı `defter_blob` deseni: `force` da açık, `anonymous` rolüne hiçbir
-- yetki yok — JWT'siz kimse dokunamıyor.

alter table defter_kasa enable row level security;
alter table defter_kasa force  row level security;

drop policy if exists kendi_kasasi on defter_kasa;
create policy kendi_kasasi on defter_kasa for all to authenticated
  using       (defter_kim() = kullanici)
  with check  (defter_kim() = kullanici);

grant select, insert, update, delete on defter_kasa to authenticated;
