# Defter

Dolduğunda biten, sana soru soran, on yıl sonra sorduğunda cevap veren bir defter.

Ürün dokümanı: [PROJE.md](PROJE.md) · Karar günlüğü: [KARARLAR.md](KARARLAR.md)

## Depo

```
PROJE.md          ürün dokümanı — ilkeler, tasarım dili, yol haritası
KARARLAR.md       karar günlüğü — her büyük karar ve gerekçesi
kavram/           dondurulmuş kavram demosu (tek dosya, referans)
app/              üretim uygulaması
  src/cekirdek/   saf mantık: sayfa akışı, Türkçe ekler, arşiv retrieval'ı
  src/veri/       şema, göçler, depo, şifreleme, sürücüler
  src/ekran/      defter · arşiv · kapsül · fihrist · yakılan sayfa · kilit
  src/stil/       tasarım dili, PROJE.md §4 sırasıyla bölünmüş
  src/yazitipi/   gömülü woff2 dosyaları + OFL lisansları
  test/           birim ve regresyon testleri
```

**Katman kuralı:** `cekirdek/` hiçbir zaman `veri/` veya `ekran/` import etmez.
Bağımlılık tek yönlü: `ekran → veri → cekirdek`.

## Açılır adres

**https://fabricpro.github.io/Gunluk/**

Her itmede otomatik derlenip yayınlanır (`.github/workflows/pages.yml`).
Telefondan da açılır ve HTTPS olduğu için veri kalıcılığı orada da çalışır.

Bu bir **önizleme**: tarayıcı derlemesi olduğu için veritabanı **şifresiz** ve
**kilidi yok**. Veri kimseyle paylaşılmaz, sunucuya gitmez — kendi
tarayıcınızda durur — ama gerçek günlük tutulacak yer burası değil. Üst
şeritte `defter · önizleme` yazması bunun için.

## Çalıştırma

Gereken: Node 20 veya üstü (burada 22 ile geliştirildi) ve npm. Başka hiçbir
şey yok — veritabanı, yazı tipleri, her şey pakette.

```sh
git clone https://github.com/fabricPro/Gunluk.git
cd Gunluk/app
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır. Kaydettiğin her dosya anında
yansır (sıcak yenileme); CSS değişiklikleri sayfa yenilenmeden uygulanır.

### Geliştirme bayrakları

| Adres | Ne yapar |
|---|---|
| `localhost:5173` | Boş defter — gerçek kullanıcının gördüğü |
| `localhost:5173/?tohum=1` | 352 kayıtlık demo verisi yükler (yalnızca defter boşken) |
| `localhost:5173/?sifirla=1` | Defteri tamamen boşaltır, şemayı yeniden kurar |

`?sifirla=1` çalıştıktan sonra adresten kendini siler — yoksa her yenileme
defteri tekrar boşaltırdı.

### Veri nerede duruyor

Tarayıcının OPFS deposunda, adrese (origin) bağlı. Yani `localhost:5173` ile
`localhost:4173` ayrı defterler tutar. Sekmeyi kapatmak veriyi silmez;
silmek için `?sifirla=1` ya da tarayıcının site verisini temizle.

### Telefonda denemek

```sh
npm run dev -- --host
```

Terminalde çıkan `Network:` adresini telefonda aç.

**Dikkat:** OPFS yalnızca güvenli bağlamda (secure context) çalışır.
`localhost` güvenli sayılır ama `http://192.168.x.x` sayılmaz — telefonda
uygulama açılır, tipografi ve tüm ekranlar çalışır, **ama veri kalıcı
olmaz** (bellekte tutulur, yenilemede gider). Konsolda bunu söyleyen bir
uyarı yazar. Telefonda gerçek kalıcılığı denemek için Capacitor kabuğuyla
çalıştırmak gerekiyor.

### Derleme ve testler

```sh
npm test               # 78 test
npm run build          # dist/ üretir
npm run onizle         # derlenmiş sürümü 4173 portunda sunar
```

## Şifreleme — hangi derlemede ne oluyor

| Ortam | Veritabanı | Şifreleme |
|---|---|---|
| Cihaz (iOS/Android, Capacitor) | SQLCipher | **Var.** Anahtar Keychain / Android Keystore'da, cihazdan çıkmaz. |
| Tarayıcı (`npm run dev`) | sqlite-wasm + OPFS, worker içinde | **Yok.** Yalnızca geliştirme içindir. |

Tarayıcı derlemesi sessizce şifresiz çalışmaz: açılışta konsola uyarı yazar.
Cihazda güvenli anahtar deposu bulunamazsa defter **açılmaz** — şifresiz
yedek yola düşmez.

PIN ve biyometri henüz yok (Faz 2.7). Anahtar şimdilik cihaza bağlı,
kullanıcı doğrulaması istemiyor.

## Değişmez ilkeler ve kodda karşılıkları

PROJE.md §2'deki dört ilke pazarlığa kapalı. İkisinin kodda doğrudan
karşılığı var:

- **Yakılan sayfa gerçekten yanar.** `src/ekran/yak.ts` hiçbir veri modülünü
  import etmez, sayaç tutmaz. `test/yakma.test.ts` bunu üç yoldan doğrular:
  import listesi taraması, gerçek DOM'da akışın koşturulması, ve akış
  sonrası veritabanı dosyalarının bayt taraması.
- **Arşiv uydurmaz.** `soruCoz` cevabı yalnızca bulunan kayıtlardan kurar ve
  kullanılan kayıtları cilt/sayfa numarasıyla döndürür. Kayıt yoksa cevap
  sabittir: *"Yazmadığın bir şeyi uydurmam."*

## Durum

Faz 1.1 (kalıcılık) tamam, yazı tipleri gömüldü. Sırada Faz 1.2 (boş defter / onboarding) —
şu an yalnızca çökmeyen bir yer tutucu var.
