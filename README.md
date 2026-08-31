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
  src/ekran/      defter · kitaplık · tören · kilit · ayarlar · arşiv · kapsül · fihrist · yakılan sayfa
  src/stil/       tasarım dili, PROJE.md §4 sırasıyla bölünmüş
  src/yazitipi/   gömülü woff2 dosyaları + OFL lisansları
  test/           birim ve regresyon testleri
```

**Katman kuralı:** `cekirdek/` hiçbir zaman `veri/` veya `ekran/` import etmez.
Bağımlılık tek yönlü: `ekran → veri → cekirdek`.

## Açılır adres

**https://fabricpro.github.io/Gunluk/**

Her itmede otomatik derlenip yayınlanır (`.github/workflows/pages.yml`).
Pages'in bir kez elle açılması gerekiyor: **Settings → Pages → Build and
deployment → Source: GitHub Actions**. İş akışının belirteci site
oluşturamıyor, bu yönetici yetkisi istiyor.
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
npm test               # 348 test
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

Kilit (Faz 2.7) çalışıyor: veritabanı anahtarı rastgele, bir kopyası
Argon2id(PIN) ile sarmalanmış, bir kopyası biyometriyle korunan depoda.
Kilitliyken ana anahtar bellekte olmadığı için veritabanı açılamıyor.
Arka plana geçince kilitleniyor. İsteğe bağlı; üçüncü yazma gününden sonra
bir kez teklif ediliyor.

Biyometri açmak, anahtarın açılabilir bir kopyasını cihazda bırakır —
kullandığımız güvenli depo eklentisi öge bazında biyometrik erişim denetimi
sunmuyor. Yalnızca PIN isteyen kullanıcı biyometriyi kapalı bırakmalı.

## Silme

**Kayıt silme.** Kayda dokun → `sil` → onay kartı. Kart "emin misin"
sormaz, ne gittiğini gösterir: kaydın tarihi, metni, ve varsa birlikte
gidecek kenar notu ve ek. **İz bırakmaz** — düzeltme metni değiştirir,
silme yok eder; sayfada kalan bir "burada bir kayıt vardı" satırı, silmek
isteyen için hiç silmemekten kötüdür (K-028). Kapalı defterde silme yok
(K-018), kenar notu düşmek serbest.

**Defter silme.** Kitaplıkta sırttaki `···` düğmesi (ya da sırta basılı
tutmak) defterin kartını açar. Silme sürtünmesi
defterin içindekiyle ölçülür (KARARLAR.md · K-025):

- **Boş defter** tek onayla gider — deneme için açılmış defterler rafta
  birikmesin.
- **Dolu defter** ancak **adı yazılarak** gider. Kart önce ne
  kaybedileceğini sayar: kaç kayıt, kaç gün, kaç kenar notu, kaç ek, hangi
  tarihler arası.
- Kartta "önce Markdown olarak çıkar" duruyor — silmek ile saklamak
  arasında seçim yaptırmıyoruz.
- Çöp kutusu yok; silinen gerçekten siliniyor, FTS indeksinden de düşüyor.

## Kenar notu

Eski bir kayda sonradan düşülen not, kırmızı kalemle. Ürünün "arşivi ikinci
kez neden açsın" sorusuna kendi cevabı (KARARLAR.md · K-024).

- **Bir kayda birden çok not**, yıllar içinde; tarihleriyle alt alta.
- **Yazıldığı gün silinebilir**, ertesi gün kalıcı. Kayıtta düzeltme iz
  bırakırken notta hiç iz bırakmamak tutarsız olurdu.
- **Kapalı deftere de düşülebilir** (K-018). Kapalı defterde `düzelt` ve
  yazma alanı yok, `kenar notu` var.
- Notlar sayfa bütçesinden pay alıyor; sığmayanlar sonraki sayfaya
  dökülüyor — maliyet kırpılıyor ama basım gerçek boşluğu izliyor.
- Kayıt araçları (`düzelt`, `kenar notu`) kayda **dokununca** açılıyor;
  `:hover` dokunmatikte "iki kez dokun" demekti.

Kenar notları arşiv aramasına da giriyor (K-026). Bir kayıt yalnızca notu
yüzünden bulunduysa cevap bunu söylüyor (*"Bu kaydı kenar notundan
buldum."*) ve kaynak kartı eşleşen notu "kenar notu · tarih" etiketiyle
gösteriyor — ilke 2.4 gereği cevabın nereden geldiği görünmek zorunda.
Not eşleşmesi puanı şişirmiyor: sözcük kayıtta ya da notta geçsin, sözcük
başına bir kez sayılıyor.

## Ek — bilet, ekran görüntüsü, fotoğraf

Kayıt başına **bir** ek; şemada birincil anahtar bunu zorluyor. Sayfaya
yapıştırılmış gibi duruyor ve sayfa bütçesinden pay alıyor: bir fotoğraf
sayfayı doldurursa akış temiz bir sayfa açar (KARARLAR.md · K-023).

- **Base64 metin olarak veritabanında.** BLOB değil, çünkü Capacitor
  köprüsü ikili veri taşımıyor ve mühürlü yedek JSON. Karşılığında ekler
  yedeğe ve geri yüklemeye ek kod yazılmadan giriyor, SQLCipher da onları
  kendiliğinden şifreliyor.
- **İçeri alırken küçültülüyor** (uzun kenar 1400px, hedef 400 KB).
  Canvas'a yeniden çizmek **EXIF'i düşürüyor** — konum ve cihaz bilgisi
  fotoğrafla birlikte deftere girmiyor.
- **Sayfa maliyeti en-boy oranına bağlı**, sabit değil. Tavanı `olcum.ts`
  belirliyor ve aynı pikseli hem hesaba hem CSS'e (`--ek-tavan`) veriyor.
- **Bırakılmayan ek diske değmiyor** — yalnızca bellekte durur.

## Yedekleme

Ayar kağıdında iki yol var, ikisi de kullanıcının açık eylemiyle çalışır;
ne ağ çağrısı ne sunucu var (KARARLAR.md · K-003, K-022).

- **Mühürlü yedek** (`.defter`). Tablolar mantıksal döküme çevrilir,
  sıkıştırılır, `Argon2id(kurtarma kodu)` ile AES-GCM altında mühürlenir.
  Kod 28 karakter Crockford base32, sağlama basamaklı; hiçbir yerde
  saklanmaz — kaybolursa yedek açılmaz. Döküm kendi şema sürümünü taşır,
  geri yüklemede göçler o sürümden bugüne uygulanır, yani eski yedek yeni
  uygulamada açılır. Geri yükleme birleştirmez: defteri sıfırlar ve dökümü
  olduğu gibi yazar.
- **Açık dışa aktarma** (`.md`). Düz metin Markdown — **şifresiz.** Sebep:
  günlüğün okunabilirliği bu uygulamanın ömrüne bağlanamaz. Riski ekranda
  yazılı.

## Arama nasıl çalışıyor

Arşivin arama yolu **FTS değil**: `ekran/arsiv.ts` doğrudan
`cekirdek/sorgu.ts`'teki `soruCoz`'u çağırıyor ve bellekteki kayıtları
tarıyor. `depo.ara` (FTS5) şu an yalnızca testlerde kullanılıyor ve
yalnızca `kayit.metin`'i indeksliyor; Faz 3'te embedding araması gelirken
indeks yeniden düşünülecek (K-026).

Havuza giren: kayıt metni ve kenar notları — ikisi de kullanıcının kendi
sözleri. Girmeyen: `kayit.soru`, yani defterin kendi cümleleri (K-020).
Bu ayrımı iki test koruyor, biri FTS yolunda biri `soruCoz`'da.

**Türkçe gövdeleme** (`cekirdek/govde.ts`, K-027). Eşleşme düz alt-dize
değil: her sözcük bir *aday gövde kümesine* iniyor ve kümeler kesişiyorsa
eşleşiyor. Sözlük yok, tahmin yok — `kitabı` → `{kitab, kitap}`, `kitap` →
`{kitap}`, kesişirler. Böylece "hissettiğim" araması "hissetmedim"
kaydını, "kitap" araması "kitabı"yı buluyor; defterde de çekimli biçim
vurgulanıyor. Alt-dize yolu duruyor, gövdeleme yalnızca kazanç ekliyor.

**Anlam araması** (K-029) — varsayılan **kapalı**. Açılırsa her kayıt
cihazda bir vektöre gömülüyor ve "kötü hissettiğim günler" gibi sorular, o
sözcükler kayıtta hiç geçmese de sonuç veriyor.

- **Metin cihazdan çıkmaz.** Ağ çağrısı modeli *getirir*, metni *götürmez*.
  Bir test bunu kaynak taramasıyla sabitliyor (`test/gomuGizlilik.test.ts`);
  tarayıcıda da ölçüldü: dışarı çıkan tek şey gövdesiz bir GET.
- Bir kerelik **~145 MB** (13 MB ONNX çalışma zamanı + ~130 MB çok dilli
  model). Rakam ayar kağıdında yazılı.
- **Taban uygulamada gömüye ait 1,7 KB var.** Kütüphane pakete girmiyor,
  çalışma anında yükleniyor; özelliği açmayan hiçbir şey indirmiyor.
- Vektörler int8 metin olarak şifreli veritabanında; **yedeğe girmiyorlar**
  (türetilmiş veri, geri yüklemede yeniden kuruluyor).
- **Anlamsal yakınlık bir ipucu, kanıt değil:** en fazla 1 puan ekliyor,
  tek bir sözcük eşleşmesinin bile altında. Kaynak kartı bunu söylüyor —
  *"aradığın sözcükler bu kayıtta geçmiyor — anlamca yakın"* (ilke 2.4).
- Gömü bir **ek**, bağımlılık değil: model indirilemezse arama gövdelemeyle
  çalışmaya devam ediyor.

Modelin kendisi bu geliştirme ortamında doğrulanamadı (huggingface.co ve
jsdelivr kapalı); SQLCipher ve biyometri gibi cihazda doğrulanacak.

## Model cevabı — ilke 2.3 ve 2.4

Arşivdeki cevap varsayılan olarak **tamamen cihazda** kuruluyor. İstersen
aynı kayıtlardan bir modelin cümle kurmasını isteyebiliyorsun; bunun için
**kendi Anthropic API anahtarın** gerekiyor (KARARLAR.md · K-031).

- **Sunucumuz yok.** Çağrı doğrudan cihazdan gidiyor. Metin bizim bir
  makinemize uğramıyor — "uğradı ama saklamadık" değil, uğramadı.
- **Kullanıcının ayrı eylemi.** Arama bitince ayrı bir düğme çıkıyor;
  basılana kadar tek bayt çıkmıyor. Tarayıcıda ölçüldü: arama sırasında dış
  istek yok, düğmeden sonra bir istek.
- **Giden şey: soru + en fazla 4 kayıt.** Defterin tamamı hiçbir koşulda
  gitmiyor. Kayıt kimlikleri, tema kimlikleri, defter adı, başlıklar,
  fotoğraflar gitmiyor. `cekirdek/anlatim.ts` bu sorunun tek cevabı.
- **Dört sayısı, kullanıcıya gösterilen kaynak sayısıyla aynı.** Modele
  gösterilip kullanıcıya gösterilmeyen kayıt yok (ilke 2.4).
- **Cevaptaki `[2]`, karttaki `[2]`.** Atıf zorunlu; kaynak listesi değil,
  cümle cümle izlenebilen bir bağ.
- **Kriz kaydı iki kez eleniyor** — `soruCoz` ve `anlatimKur`. Retrieval
  değişse bile ilke 2.1 tek bir kod yoluna bağlı kalmasın diye.
- **Anahtar Keychain / Keystore'da**, veritabanında değil: yedeğini paylaşan
  kullanıcı faturalı bir anahtarı da paylaşmasın.
- **Taban uygulama etkilenmiyor.** SDK ayrı parçada; anahtar girilmemişse
  hiç inmiyor.

**Yazdıktan sonra tek soru** (K-032) — ayrı ayar, yine varsayılan kapalı.
Yazdıktan sonra defterde *"yazdığıma bir soru sor"* düğmesi çıkıyor; giden
tek şey o kaydın metni, gelen tek şey bir soru. Yorum değil: özetleme,
teselli, övgü, öğüt, teşhis yönergede açıkça yasak.

**Otomatik değil, ve bu bilerek.** Kaydı bırakmak yazma eylemidir, gönderme
eylemi değil; otomatik gönderim ilke 2.3'ün *"arka planda sessizce hiçbir
şey yüklenmez"* cümlesini bozardı. Kendiliğinden belirmeyen soru daha az
kullanılacak — bedel kabul edildi. **Kriz günlerinde düğme hiç çıkmıyor**
(ilke 2.1: uygulama susar, soru sormak susmanın tersidir).

Kabul edilen bedel: bu özellik pratikte yalnızca API anahtarı olan
kullanıcılara açık. Alternatif defterin en mahrem metnini bizim sunucumuzdan
geçirmekti; o bedel daha ağır.

## Kriz akışı — ilke 2.1

**Bu bir tıbbi araç değil.** Teşhis koymuyor, risk puanı vermiyor, kimseye
haber vermiyor, hiçbir şey ölçmüyor. Yaptığı tek şey susmak ve gerçek
desteğin numarasını göstermek (KARARLAR.md · K-030).

- **Kural tabanlı, model yok.** Güvenlik isteğe bağlı bir indirmeye
  bağlanamaz; ayrıca neyin neden tetiklediği `cekirdek/kriz.ts`'te
  okunabiliyor.
- **Eşik dar.** Yalnızca açık kendine zarar / yaşama son verme ifadeleri.
  "Bugün berbatım" tetiklemiyor — sık tetiklenen bir kart kullanıcıya
  dürüst yazmayı bıraktırır, yani tam tersini yapar.
- **Deyim listesi zorunlu.** Türkçede "bu iş beni öldürüyor", "açlıktan
  ölüyorum" son derece yaygın. Testin yarısı *tetiklememeli* tablosu; o
  tablo boşalırsa özellik bozulmuş demektir.
- **Hiçbir yere yazılmıyor.** Ne sütun, ne ayar, ne sayaç — `veri/` bu iş
  için hiç değişmedi. Bayrak her açılışta bugünün kayıtlarından yeniden
  hesaplanıyor. `test/krizSaklanmaz.test.ts` bunu makine düzeyinde
  sabitliyor.
- **Susma üç yerde:** o gün soru sorulmuyor; arşiv cevabına girmiyor ve
  sayılmıyor; tema sayımına girmiyor.
- **Kart** kağıdın içinde, sakin, kapatılabilir; eski bir kayda
  dönüldüğünde tekrar çıkmıyor.
- **Yakılan sayfada çalışmıyor** (ilke 2.2). Orada bir şeyin okuduğunu
  öğrenmek, en kötü şeyi yazdıran tek mekanizmayı öldürürdü. Bilerek
  ödenen bedel.

## Değişmez ilkeler ve kodda karşılıkları

PROJE.md §2'deki dört ilke pazarlığa kapalı. İkisinin kodda doğrudan
karşılığı var:

- **Yakılan sayfa gerçekten yanar.** `src/ekran/yak.ts` hiçbir veri modülünü
  import etmez, sayaç tutmaz. `test/yakma.test.ts` bunu üç yoldan doğrular:
  import listesi taraması, gerçek DOM'da akışın koşturulması, ve akış
  sonrası veritabanı dosyalarının bayt taraması.
- **Ham metin cihazdan çıkmaz.** Tek dış çağrı `src/veri/model.ts`'te ve
  yalnızca kullanıcı düğmeye bastığında kuruluyor; ne gideceğini saf bir
  çekirdek dosyası (`cekirdek/anlatim.ts`) belirliyor.
  `test/anlatim.test.ts` SDK'nın başka hiçbir dosyada geçmediğini ve
  çekirdeğin ağa dokunmadığını doğrular.
- **Arşiv uydurmaz.** `soruCoz` cevabı yalnızca bulunan kayıtlardan kurar ve
  kullanılan kayıtları cilt/sayfa numarasıyla döndürür. Kayıt yoksa cevap
  sabittir: *"Yazmadığın bir şeyi uydurmam."* Defterin sorduğu sorular ayrı
  bir sütunda durur ve arama havuzuna hiç girmez — uygulama kendi
  cümlelerinden cevap kuramaz.

## Durum

**Faz 1 tamam.** Kalıcılık, boş defter / onboarding, kitaplık ve cilt kapanma
töreni çalışıyor; yazı tipleri gömülü. (El yazısı kapsam dışı — K-007.)
**Faz 2 tamam:** fotoğraf ve ek (2.5), kenar notu (2.6), PIN + biyometri
(2.7), mühürlü yedek (2.8). **Faz 3 tamam:** Türkçe gövdeleme ve cihaz-içi
gömü araması (9), kaynaklı model çağrısı (10), kriz sınıflandırıcısı (11),
yazdıktan sonra tek soru (12). Sırada Faz 4 — yayın metinleri ve İngilizce
yerelleştirme.
