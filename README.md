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

## Çalıştırma

```sh
cd app
npm install
npm run dev            # boş defterle açılır — gerçek kullanıcının gördüğü
npm run dev -- --open  # tarayıcıda aç
npm test               # 76 test
npm run build
```

Geliştirirken demo verisiyle çalışmak için adrese `?tohum=1` ekle
(352 kayıt, 56 sayfa, 2 cilt). Tohum yalnızca defter boşken çalışır.

Uygulama çalışırken dış ağa hiç çıkmıyor. Yazı tipleri pakette
(`src/yazitipi/`, 240 KB, OFL-1.1); CDN yok, çevrimdışı açılışta tipografi
yerinde. Bir test bunu koruyor — CDN'e dönüş sessizce olamaz.

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
