# Yazı tipleri

Bu dosyalar bilerek depoda duruyor, npm bağımlılığı değil. Sebep
KARARLAR.md · K-011'de: hangi kesimin gittiğini birebir biz seçiyoruz ve
on yıl sonra depoyu klonlayan aynı sonucu alıyor.

## Ne var

| Dosya | Aile | Stil | Kesim | Boyut |
|---|---|---|---|---|
| `newsreader-latin-wght-normal.woff2` | Newsreader | düz | latin | 58 KB |
| `newsreader-latin-ext-wght-normal.woff2` | Newsreader | düz | latin-ext | 36 KB |
| `newsreader-latin-wght-italic.woff2` | Newsreader | italik | latin | 65 KB |
| `newsreader-latin-ext-wght-italic.woff2` | Newsreader | italik | latin-ext | 40 KB |
| `instrument-sans-latin-wght-normal.woff2` | Instrument Sans | düz | latin | 30 KB |
| `instrument-sans-latin-ext-wght-normal.woff2` | Instrument Sans | düz | latin-ext | 11 KB |

Toplam 240 KB. `@font-face` kuralları `src/stil/yazitipi.css` içinde.

**latin-ext Türkçe için şart:** ğ (U+011F), ş (U+015F), İ (U+0130) o
kesimde. ı (U+0131) ise latin kesiminde — ikisi de gerekiyor.

**Instrument Sans italik yok:** arayüz yazı tipiyle italik hiçbir yerde
birlikte kullanılmıyor. Kullanılacaksa buraya eklenmeli, yoksa tarayıcı
eğik taklidi üretir.

**Optik boyut (`opsz`) ekseni alınmadı.** Newsreader'ın opsz'li sürümü
263 KB daha büyük. Defterde Newsreader 14–29px arasında kullanılıyor;
opsz'nin kazancı 6–72px gibi geniş aralıklarda çıkıyor, bu dar aralıkta
263 KB'nin karşılığı değil.

## Nereden geldi

fontsource npm tarball'larından çıkarıldı (Google Fonts'un aynı sürümleri):

- `@fontsource-variable/newsreader@5.3.0`
- `@fontsource-variable/instrument-sans@5.3.0`

Paketlerin kendisi kurulmadı; yalnızca `files/*-wght-*.woff2` dosyaları ve
lisans metinleri alındı.

## Güncelleme

```sh
npm pack @fontsource-variable/newsreader@<sürüm>
tar xzf fontsource-variable-newsreader-<sürüm>.tgz
cp package/files/newsreader-latin-wght-{normal,italic}.woff2 \
   package/files/newsreader-latin-ext-wght-{normal,italic}.woff2 \
   app/src/yazitipi/
cp package/LICENSE app/src/yazitipi/OFL-Newsreader.txt
rm -rf package fontsource-variable-newsreader-<sürüm>.tgz
```

Sonra bu dosyadaki sürüm numarasını güncelle ve `npm test` çalıştır —
`test/yazitipi.test.ts` dosya adlarının ve lisansların yerinde olduğunu
doğruluyor.

## Lisans

İkisi de SIL Open Font License 1.1. Metinler `OFL-Newsreader.txt` ve
`OFL-InstrumentSans.txt` dosyalarında; dağıtımda birlikte gitmeleri gerekiyor.
