-- ════════════════════════════════════════════════════════════
--  SUNUCU ŞEMASI — Neon Postgres (senkron)
-- ════════════════════════════════════════════════════════════
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

create table if not exists defter_blob (
  -- auth.user_id(): JWT'nin `sub` iddiası. Trigger her yazmada yeniden
  -- atıyor, yani istemci başkasının kimliğini yazamıyor.
  kullanici text        not null default (auth.user_id()),
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
  new.kullanici := auth.user_id();
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

create policy kendi_satirlari on defter_blob for all to authenticated
  using       (auth.user_id() = kullanici)
  with check  (auth.user_id() = kullanici);

create index if not exists defter_blob_cekme on defter_blob (kullanici, surum);

grant select, insert, update, delete on defter_blob to authenticated;

-- ── eski `silindi` sütunu ───────────────────────────────────
--
-- İlk taslakta mezar taşı ayrı bir bayraktı. Silme şifreli gövdenin
-- içine alınınca sütun hem gereksiz hem sızıntı oldu; istemci ona hiç
-- yazmıyor. Bu satır, o taslağı uygulamış bir veritabanını bugünkü
-- şemaya getiriyor (KARARLAR.md · K-036).

alter table defter_blob drop column if exists silindi;
