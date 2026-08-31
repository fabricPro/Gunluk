# Karar günlüğü

Bu dosya zamanla deponun en değerli parçası olacak. Her büyük karar buraya
yazılır: ne seçildi, neden, ve reddedilen alternatifin neden reddedildiği.
Bir kararı geri almak isteyen (biz dahil) önce buradaki gerekçeyi çürütmek
zorunda.

Yeni karar en üste eklenir.

---

## 2026-08-31 · K-035 · İngilizce: arayüz değil, dil makineleri de

Yol haritası 14. "İngilizce yerelleştirme" kolay okunur ama bu üründe
arayüzü çevirmek işin yarısından azı.

### Yarım yerelleştirme neye benzerdi

Defterin altında beş tane **dile bağlı makine** var: tarih yazımı, gövdeleme
(K-027), arşivin cümle kurucusu, defterin sorduğu sorular ve **kriz
sınıflandırıcısı** (K-030). Yalnızca düğme yazılarını çevirip bunları Türkçe
bırakmak şu demek olurdu: İngilizce yazan bir kullanıcı için arama
gövdelemesi hiç tutmaz, arşiv cevabı Türkçe cümle kurar ve **kriz
sınıflandırıcısı sessizce hiç çalışmaz.** Sonuncusu bir çeviri eksiği değil,
ilke 2.1'in o kullanıcı için hiç var olmaması demek.

Bu yüzden hepsi yazıldı:

| Makine | İngilizce karşılığı |
|---|---|
| `tr.ts` | `en.ts` — tarih, gün adı, tekil/çoğul |
| `govde.ts` | İngilizce ek listesi, aynı aday-kümesi fikri |
| `kriz.ts` | İngilizce kalıplar **ve deyim listesi**, aynı dar eşik |
| `sorgu.ts` | Arşivin cümleleri `SES` tablosunda, dil dil |
| `sorular.ts` | Yedi ilk hafta sorusu + havuz, aynı yay |
| `anlatim.ts` | İki sistem yönergesi |

İngilizcede "kill / die / dead" tam olarak Türkçedeki "öl-" işini görüyor:
*this job is killing me*, *dying to see you*, *dead tired*, *cut myself
shaving*. Deyim listesi orada da özelliğin yarısı ve `test/krizEn.test.ts`
Türkçe tablonun birebir ağırlığında.

### Zorunlu `dil` argümanı — bulunan hata

`krizIsareti(metin, dil = 'tr')` yazılmıştı. Derleyici sustu, üç çağrı yeri
dili geçirmeyi atladı: `defter.ts`te kriz kartını gösteren satır, aynı
dosyada soru düğmesini eleyen satır, ve `modelAkis.soruSor`. Sonuç:
İngilizce yazan bir kullanıcının **açık kriz cümlesi hiç yakalanmıyordu** —
kart çıkmıyor, ve o metin modele gönderilebiliyordu.

Tarayıcıda görüldü, sonra varsayılan **kaldırıldı**. Derleyici üç yeri de
anında gösterdi. Ders: **güvenliğe bakan bir işlevde sessiz varsayılan,
hatanın kendisidir.** Aynı gerekçeyle `anlatimKur`, `soruIstegi` ve
`soruUret` de varsayılansız.

### Dil değişince sayfa yeniden yükleniyor

Yarı yarıya çevrilmiş bir ekran hiç olmuyor; ayrıca sayfa kapasitesi
(`sayfaOlc`) yeni dilin örnek metniyle baştan ölçülüyor — Türkçe ölçüp
İngilizce dizmek sayfa sınırını kaydırıyordu.

Seçim `localStorage`'da, veritabanında değil: kilit ekranının da çevrili
açılması gerekiyor ve o an veritabanı henüz açılmamış oluyor.

### Kullanıcının yazdığı hiçbir şey çevrilmiyor

Kayıtlar, kenar notları, defter adları, sayfa başlıkları olduğu gibi kalıyor.
`Gun.ad` (gün adı) türetilmiş bir görüntü dizesi olduğu için dil değişince
o da değişiyor; saklansaydı defter iki dilli kalırdı. Kapak anahtarları da
veritabanında sabit, yalnızca görünen adları çevriliyor.

### Bilinen sınır: İngilizce kriz kartında numara yok

Türkçe kart **112** diyor. İngilizce kart bir numara söylemiyor, "ülkendeki
acil servisi ara" diyor. Sebep: uygulama kullanıcının ülkesini bilmiyor ve
**yanlış bir acil numara vermek, hiç vermemekten kötü.** Dil etiketinden
ülke tahmin etmek (`en-US` → 988) güvenilir değil ve bu ürünün
"doğrulanmamış olguyu söyleme" kuralına aykırı.

Bu bir eksik ve öyle yazılıyor: İngilizce yayın öncesi ya güvenilir bir
bölge kaynağı bulunmalı ya da kart kullanıcıya bir kez ülkesini sormalı.
`yayin/MAGAZA.md` kontrol listesinde duruyor.

### Muhafızlar

`test/dil.test.ts` şunları sabitliyor: iki katalog aynı anahtarları taşıyor,
yer tutucular eşleşiyor, İngilizce değerlerde Türkçe harf kalmamış, HTML'de
işaretsiz Türkçe metin yok, `ekran/` altında dar bir istisna listesi dışında
sabit Türkçe dize yok.

---

## 2026-08-31 · K-034 · Yayın: beyan koda bağlı, ekran görüntüsü üretilebilir

Yol haritası 13. `yayin/` klasörü kod değil, **kodun beyanı**.

### Ekran görüntüleri elle çekilmiyor

`app/arac/ekranGoruntusu.mjs` mağaza ölçülerinde (iPhone 6.9", iPad 13")
görüntüleri üretiyor. Elle çekilen bir görüntü bir daha üretilemez ve
arayüz değişince sessizce eskir; üretilebilir olan `npm run gorsel` ile
tazeleniyor. Görsellerde gerçek kullanıcı verisi değil `?tohum` defteri
var.

**Ve ilk koşuda bir hata buldu:** dar ekranda araç çubuğu sığmıyor,
**bırak düğmesi ekran dışında kalıyordu.** Bu bir telefon uygulaması ve
yazılanı kaydeden düğme telefonda ulaşılamıyordu. Uygulamada hiç medya
sorgusu yoktu. `src/stil/dar.css` eklendi: yalnızca yerleşim değişiyor,
renk ve hiyerarşi aynı — dar ekran ayrı bir tasarım değil (PROJE.md §4).

Ders yine tanıdık (K-029, K-030, K-033): **ölçmeden bilinmiyor.** Ekran
görüntüsü çekmek burada bir pazarlama işi değil, bir doğrulama işi oldu.

### Kategori: Yaşam Tarzı, Sağlık değil

Sağlık kategorisi teşhis/ölçüm çağrışımı taşıyor ve PROJE.md §5 "mod/duygu
skoru" fikrini zaten reddetmişti. Orada listelenmek, olmadığımız şeyi ima
etmek olurdu. Aynı sebeple Apple'ın "Medical/Treatment Information"
sorusuna **None** deniyor: kriz kartı tıbbi bilgi değil, acil servis
numarasına yönlendirme.

### "Data Not Collected" gerçekten doğru

Analitik, çökme raporu, reklam SDK'sı, hesap, sunucu — hiçbiri yok. Bize
ait tek bir uç nokta bile yok. Uygulamanın çıkabildiği iki adres var
(jsdelivr'dan model indirmesi, kullanıcının kendi anahtarıyla Anthropic),
ikisi de varsayılan kapalı ve ikisi de kullanıcının açık eylemiyle.

Bu beyanın kolay olmasının sebebi K-002, K-021, K-029 ve K-031'de daha
önce ödenen bedeller. **Gizlilik etiketi yayın günü doldurulan bir form
değil, iki yıl önce alınan mimari kararların faturası.**

### Yaş sınırı 17+

Kullanıcı günlüğüne her şeyi yazabilir ve uygulama onu sansürlemez. Yaş
sınırını düşük tutup sonra "içerik denetlenmiyor" demek tutarsız olurdu.

---

## 2026-08-31 · K-033 · Gömü bayatlığı saate değil, sürüme bakıyor

Titrek bir test hatanın kendisiydi. `test/gomuAkis.test.ts`'teki "düzeltilen
kayıt yeniden gömülüyor" beş koşudan birinde düşüyordu.

Sebep: bayatlık `g.guncelleme < k.guncelleme` ile ölçülüyordu ve iki damga
da `Date.now()`'dan geliyordu. Aynı milisaniyede gömülüp düzeltilen bir
kayıt eşit damga taşıyor, `<` yanlış dönüyor, kayıt bayat sayılmıyordu.
Ürün tarafındaki karşılığı şu: **kullanıcı kaydını düzeltiyor, anlam
araması eski metinden cevap vermeye devam ediyor** ve bunu hiçbir yerde
söylemiyor.

İki değişiklik:

1. **Gömü, kaydın damgasını kopyalıyor.** `gomu.guncelleme` artık "ne zaman
   gömüldü" değil, *hangi sürümden gömüldü*. Ölçüt de `<` değil `<>`:
   saat karşılaştırması değil, eşitlik.
2. **`simdi()` tekdüze artan.** Aynı milisaniyede iki kez çağrılsa da
   ikincisi kesin olarak büyük. Saatin geri atması da aynı kapıya
   çıkıyordu.

`<=` denendi ve reddedildi: aynı milisaniyede oluşup gömülen bir kaydı
sonsuza kadar bayat sayıyordu, yani bu kez ters yönde yanlış.

Ders, K-029 ve K-030'daki desenin bir başka yüzü: **titrek bir test
kırılgan bir test değildir, çoğu zaman gerçek bir yarışın kendisidir.**
Yeşile boyamadan önce neyi yakaladığı sorulmalı.

---

## 2026-08-31 · K-032 · Yazdıktan sonra tek soru — ve neden otomatik değil

Yol haritası 12: *"her yazıdan sonra tek soru. Yorum değil, soru. Yorum
açıklamaya çalışır, soru yazdırır."*

### Otomatik olmuyor — ilke 2.3 buna izin vermiyor

İlk tasarım kaydı bıraktığın an sorunun kendiliğinden belirmesiydi; akış
açısından doğru olan da o. Ama ilke 2.3 iki cümle söylüyor: *"AI çağrısı
gerekiyorsa yalnızca gereken parça, kullanıcının açık eylemiyle (soru
sorması) gider. Arka planda sessizce hiçbir şey yüklenmez."*

Bırak düğmesine basmak yazma eylemidir, **gönderme eylemi değildir**.
Otomatik gönderim tam olarak "arka planda sessizce" olurdu. Bu yüzden
defterde ayrı bir düğme var: *"yazdığıma bir soru sor"*. Tarayıcıda
ölçüldü: kayıt bırakıldığında dış istek sayısı sıfır kalıyor.

Bedeli biliyoruz: kendiliğinden belirmeyen soru daha az kullanılacak. Ama
ilkeyi bir kez "akış daha iyi olsun diye" esnetmek, ilkeyi ilke olmaktan
çıkarır.

### Arşiv cevabından ayrı ayar

Anahtarı olan herkes ikisini birden istemek zorunda değil: biri geçmişe
bakarken, diğeri yazarken devreye giriyor. Varsayılan kapalı.

### Kriz gününde düğme hiç çıkmıyor

İlke 2.1'de uygulama SUSAR. Soru sormak susmanın tersidir. Düğme iki
yerden birden eleniyor: kaydın kendisi kriz işaretliyse `soruIstegi` null
dönüyor (metin hiçbir koşulda çıkmıyor), ve `durum.krizVar` doğruyken
düğme hiç çizilmiyor — o gün defter sessiz.

### Dışarı çıkan: yalnızca son kaydın metni

Gün değil, defter değil, geçmiş kayıtlar değil. Tek bir kaydın metni.
Tavan `max_tokens: 120` — çıkacak şey tek bir kısa cümle.

Yönerge yorumu açıkça yasaklıyor: özetleme, adlandırma, tekrar, "anlıyorum",
teselli, övgü, öğüt, teşhis, duygu ölçümü, örüntü adı. Ve soru genel geçer
olamıyor: yazdığı şeyin içindeki somut bir ayrıntıya dokunmak zorunda —
*"Bugün nasıl hissettin?"* işe yaramaz.

---

## 2026-08-31 · K-031 · Model cevabı: kullanıcının anahtarı, kullanıcının eylemi, dört kayıt

Yol haritasının 10. maddesi: soru-cevap için model çağrısı. İki değişmez
ilke burada aynı anda geriliyor — ilke 2.3 (*ham metin cihazdan çıkmaz*)
ve ilke 2.4 (*arşiv uydurmaz, kaynaklar her zaman gösterilir*).

### Sunucu yok; anahtar kullanıcının

Bir sunucu koymak ilke 2.3'ü ölçülemez hale getirirdi: metin bizim bir
makinemize uğrardı ve "uğradı ama saklamadık" bir söz olarak kalırdı, kanıt
olarak değil. Kullanıcı kendi Anthropic anahtarını giriyor, çağrı doğrudan
cihazdan gidiyor, arada biz yokuz.

**Kabul edilen bedel açık:** bu özellik pratikte yalnızca API anahtarı olan
kullanıcılara açık — App Store'daki sıradan bir kullanıcı için kapalı. Bunu
bilerek kabul ettik. Alternatif, defterin en mahrem metnini bizim
sunucumuzdan geçirmekti; o bedel daha ağır.

Anahtar Keychain / Android Keystore'da (`veri/anahtarDepo.ts`),
**veritabanında değil**. Veritabanında dursa şifreli yedeğe girerdi ve
yedeğini paylaşan kullanıcı farkında olmadan faturalı bir anahtarı da
paylaşmış olurdu.

### Çağrı kullanıcının ayrı eylemi

Arama tamamen cihazda bitiyor: `soruCoz` kayıtları buluyor, cevap
kuruluyor, kaynaklar çiziliyor. **Sonra** ayrı bir düğme çıkıyor: *"bu 4
kayıttan bir cevap yaz"*. Düğmeye basılana kadar tek bayt çıkmıyor —
tarayıcıda ölçüldü: arama sırasında dış istek sayısı sıfır, düğmeden sonra
bir.

Anahtar girilmemişse düğme hiç görünmüyor. Açma/kapama ayrı bir anahtar
değil, anahtarın kendisi.

### Dışarı çıkan şey: en fazla dört kayıt

`cekirdek/anlatim.ts` "cihazdan ne çıkıyor" sorusunun tek cevabı: saf,
ağsız, veri katmanına dokunmayan bir dosya. Defterin tamamı hiçbir koşulda
çıkmıyor. Giden şey soru + en fazla dört kayıt (tarih, saat, metin,
eşleşen kenar notları). Kayıt kimlikleri, tema kimlikleri, defter adı,
başlıklar, fotoğraflar gitmiyor.

**Dört sayısı keyfi değil:** arşivin kullanıcıya gösterdiği kaynak sayısıyla
aynı. Modele gösterilip kullanıcıya gösterilmeyen bir kayıt ilke 2.4'ü
bozardı.

### Kriz kaydı iki kez eleniyor

`soruCoz` zaten eliyor (K-030). `anlatimKur` bir kez daha eliyor. Tekrar
bilerek: ileride biri retrieval'ı değiştirirse ilke 2.1 tek bir kod yoluna
bağlı kalmasın. Elenince geriye kayıt kalmıyorsa istek hiç kurulmuyor.

### Kaynak numarası — ilke 2.4'ün somut hâli

Sistem yönergesi her cümlenin dayandığı kaydı `[1]`, `[2]` diye
göstermesini istiyor ve kaynak kartları **aynı numarayı** taşıyor. Cevaptaki
`[2]`, karttaki `[2]`. "Kaynaklar gösterilir" sözü böylece bir liste değil,
cümle cümle izlenebilen bir bağ oluyor.

Yönerge ayrıca yasaklıyor: teşhis koymak, ruh hâli ölçmek, örüntü adı
takmak, öğüt vermek, teselli etmek, övmek, soru sormak, sayı/tarih/telefon
uydurmak. PROJE.md §5'in "mod/duygu skoru" reddi ve §2.1'in susma kuralı
burada da geçerli.

### Model ve tavan

`claude-opus-5`, `max_tokens: 700`, `effort: low`, uyarlanır düşünme. Tavan
dar: bu bir sohbet değil, bir arama sonucunun cümleye dökülmüş hâli. Geniş
tavan hem kullanıcının parasını harcar hem modeli konuşmaya davet eder — ve
bu üründe konuşmak yorum yapmaya, yorum teşhise kayar.

### Taban uygulama etkilenmiyor

SDK dinamik import'la ayrı bir parçada (48 KB gzip). Giriş paketinde tek
bayt yok; anahtar girilmemişse hiç inmiyor. K-029'da gömü için alınan
tavrın aynısı.

`test/anlatim.test.ts` bunları sabitliyor: dört kayıt tavanı, kriz elemesi,
`@anthropic-ai/sdk`'nın **yalnızca** `veri/model.ts` içinde geçmesi,
`anlatim.ts`'in ağa ve veri katmanına hiç dokunmaması, ve `ekran/yak.ts`'in
bu işten tamamen uzak kalması (ilke 2.2).

---

## 2026-08-31 · K-030 · Kriz: uygulama susar, hiçbir şey saklamaz

İlke 2.1 dört değişmezin ilki ve bugüne kadar kancası boştu: `gununSorusu`
ve `havuzdanSor` bir `kriz` bayrağı alıyordu, onu dolduran yoktu.

**Bu bir tıbbi araç değil.** Teşhis koymuyor, risk puanı vermiyor, kimseye
haber vermiyor, hiçbir şey ölçmüyor. Yaptığı tek şey susmak ve gerçek
desteğin numarasını göstermek. Bu sınır README'ye de yazıldı.

### Kural tabanlı, model yok

İki sebep. Birincisi: güvenlik, isteğe bağlı bir 145 MB'lık indirmeye
(K-029) bağlanamaz — gömü kapalıyken kriz akışı da çalışmaz olurdu.
İkincisi denetlenebilirlik: neyin neden tetiklediği tek bir dosyada
okunabiliyor. Bir modelin "neden tetikledi" sorusunun cevabı yok.

### Asıl iş deyim listesi

Türkçede "öl-" kökü abartma kalıbının merkezinde: *"bu iş beni
öldürüyor"*, *"açlıktan ölüyorum"*, *"gülmekten öldüm"*, *"ölesiye
yoruldum"*. Deyim listesi olmadan sınıflandırıcı neredeyse her gün
tetiklenir, kart anlamını yitirir ve kullanıcı dürüst yazmayı bırakır —
yani özellik tam tersini yapar.

Testin yarısı bu yüzden **tetiklememeli** tablosu. O tablo boşalırsa
özellik çalışıyor değil, bozulmuş demektir.

Yol boyunca burada bir açık bulundu: deyim eşleşmesi başta **kaydın
tamamını** veto ediyordu. Uzun bir kaydın başındaki "bu iş beni öldürüyor",
sonundaki gerçek işareti susturuyordu — bir kaçış kapısı. Artık deyim
yalnızca eşleştiği bölgeyi nötrlüyor, kalan metinde arama sürüyor.

### Eşik dar

Yalnızca açık ifadeler: kendine zarar verme, yaşama son verme niyeti.
*"Bugün berbatım"*, *"her şey anlamsız"*, *"umutsuzum"* tetiklemiyor. Geniş
eşik uygulamayı ruh hâli ölçen bir şeye çevirirdi ve PROJE.md §5 "mod/duygu
skoru" fikrini zaten bilerek reddetmişti: *"uygulamayı ölçüm aletine
çevirir, teşhis çağrışımı yasak."*

### Hiçbir yere yazılmıyor

Ne sütun, ne ayar, ne sayaç. `veri/` katmanı bu iş için **hiç
değişmedi** — şema yok, göç yok. Saklanan bir bayrak kullanıcının en kötü
anlarının kalıcı kaydı olurdu; defteri açan biri onu görebilirdi ve bu,
teşhis yasağının tam ihlali olurdu.

Bayrak her `yenile()`de **bugünün** kayıtlarından yeniden hesaplanıyor. Gün
kapsamı bilerek: o gün soru sorulmuyor, ertesi gün kendiliğinden geçiyor.
Kalıcı bir susma, iki yıl önce yazılmış bir cümle yüzünden ürünü sonsuza
kadar sessizleştirirdi.

Bir test takımı bunu makine düzeyinde sabitliyor (`krizSaklanmaz.test.ts`):
şemada kriz/risk/skor benzeri sütun yok, kriz kaydının döküm alanları düz
bir kaydınkiyle birebir aynı, ayar tablosuna bir şey düşmüyor, ve
sınıflandırıcı hiçbir modül import etmiyor.

### Susma üç yerde

1. O gün soru sorulmuyor (kanca zaten hazırdı).
2. `soruCoz` o kaydı cevaba katmıyor **ve saymıyor** — "N kayıt var" sayısı
   bile varlığını sızdırmamalı.
3. Tema/örüntü sayımına girmiyor.

### Kart

Kağıdın **içinde**, kaydın altında. Önce masanın üstüne konmuştu ve koyu
zeminde okunmuyordu; asıl mesele okunurluk da değil: PROJE.md §4 "ekranda
tek aydınlık yüzey olmalı ve o sayfa olmalı" diyor, masaya ikinci bir kart
koymak tasarım dilini deliyordu.

Kırmızı yok, ikon yok, ses yok, modal yok — altın çizgi ve iki cümle.
Yalnızca kayıt bırakıldığı anda çıkıyor; **eski bir kayda dönüldüğünde
çıkmıyor.** İki yıl önce yazılmış bir cümle yüzünden her açılışta kart
görmek, iyileşmiş birine yapılabilecek en kötü şeylerden biri.

Görünürlüğü ölçüldü ve garanti altına alındı: kart sayfa akışının
bütçesinde olmadığı için dolu bir sayfada kağıdın 250px altına düşüyordu.
Kriz anındaki kişinin görmediği bir kart, hiç olmayan bir karttır — artık
kendini görünür alana kaydırıyor ve `birak()` odağı kalemin üstüne
zorlamıyor.

### Numaralar

Yalnızca **112** ve "bir yakınını ara" — PROJE.md §2.1'de yazan. Başka
numara uydurulmadı: yanlış bir yardım hattı numarası gerçek zarar verir.
Doğrulanmış hatlar eklenecekse tek bir yerde duruyor.

### Yakılan sayfa dışarıda

Orada hiçbir şey okumuyor. `ekran/yak.ts` tek bir import daha almadı ve
`test/yakma.test.ts`'in import listesini birebir sabitleyen muhafızı
gevşetilmedi.

Gerekçe ilke 2.2: *"bir kez sızarsa ürünün tamamı güvenilmez olur."* Kart
orada çıksaydı kullanıcı bir şeyin okuduğunu öğrenirdi ve yakılan sayfa
mekanizma olarak ölürdü — en kötü şeyi yazdıran tek şey orası. Bu, bilerek
ödenen bir bedel: kriz anında sessiz kalınan tek yer orası.

---

## 2026-08-29 · K-029 · Gömü araması cihazda; model metne gelir, metin modele gitmez

K-027'de gövdeleme geldi ve "hissettiğim" artık "hissetmedim"i buluyor. Ama
yol haritasının asıl örneği hâlâ çalışmıyordu: *"kötü hissettiğim günler"* —
kayıtta o sözcükler hiç geçmiyor olabilir, geçen şey anlam.

**İlke 2.3 mimariyi belirledi.** Ham metin cihazdan çıkamayacağına göre
embedding cihazda hesaplanmak zorunda. Sunucuya gönderip vektör almak
teknik olarak çok daha kolaydı ve ilkeyi doğrudan delerdi; o yol hiç
düşünülmedi.

**Model indirmek ilkeyi delmiyor** ve bu ayrım kaydedilmeli: ağ çağrısı
model ile çalışma zamanını **getiriyor**, kullanıcının metnini
**götürmüyor**. Tarayıcıda ölçüldü — özellik açılırken dışarı çıkan tek
şey bir GET, gövdesi yok. Bir test bunu kaynak taramasıyla sabitliyor
(`test/gomuGizlilik.test.ts`), `test/yakma.test.ts`'in refleksiyle aynı.

**Bedeli açıkça söyleniyor:** ~13 MB çalışma zamanı + ~130 MB model.
Varsayılan kapalı, ayar kağıdında rakam yazıyor, kullanıcı bilerek
indiriyor.

### Gömücü bir arayüz, çünkü model burada test edilemiyor

`Gomucu` arayüzü `cekirdek/`'te ve DOM da ağ da bilmiyor. Gerçek uygulaması
worker'da transformers.js; testler deterministik bir sahte gömücü
kullanıyor. Bu ayrım süs değil zorunluluk: huggingface.co bu geliştirme
ortamında kapalı, model ağırlıkları indirilemiyor. Arayüz sayesinde boru
hattının tamamı — niceleme, indeksleme, iptal, melez sıralama — modelsiz
test ediliyor. Modelin kendisi cihazda doğrulanacak; SQLCipher ve
biyometriyle aynı duruş (K-021).

### Kütüphane pakete girmiyor, çalışma anında yükleniyor

İlk deneme transformers.js'i normal bir bağımlılık olarak aldı ve `dist`
1,9 MB'dan **25 MB**'a çıktı: Vite, ONNX çalışma zamanının 23 MB'lık
wasm'ını varlık olarak yayıyordu. Çalışma anında `wasmPaths` vermek
yetmedi — yayma derleme anında oluyor.

Kütüphane artık `@vite-ignore`'lı dinamik import'la CDN'den yükleniyor ve
bağımlılık tamamen kaldırıldı (`node_modules` 859 MB → 214 MB). Sonuç:
taban uygulamada gömüye ait **985 bayt** worker + 697 bayt sarmalayıcı.
Özelliği hiç açmayacak kullanıcı hiçbir şey indirmiyor. Tipler yerel olarak
tanımlandı; iki fonksiyon için 380 MB'lık geliştirme bağımlılığı taşımanın
anlamı yok.

Bedeli: kütüphane ve wasm sürümleri elle sabitlenmiş ve CDN'e bağımlıyız.
Model zaten CDN'den geliyordu; üçüncü bir taraf eklenmiyor.

### Vektörler int8 METİN, ve yedeğe girmiyor

L2 normalize edilip int8'e iniyor: 384 boyut = 384 bayt, base64 ile 512
karakter, 5000 kayıt ≈ 2,5 MB. Normalize edildikleri için ayrı ölçek
sütunu gerekmiyor. Metin olmalarının sebebi K-023 ile aynı: Capacitor
köprüsü ikili veri taşımıyor.

`gomu` tablosu **yedeğe girmiyor** (`dokum.ts` · `ATLA`). Vektör türetilmiş
veri — kullanıcının yazdığı şey değil, bir önbellek. Yedeğe koymak hem
dosyayı şişirirdi hem yedeği bir model sürümüne bağlardı. Geri yükleme
sonrası indeks yeniden kuruluyor.

`model` sütunu vektörün hangi modelle üretildiğini söylüyor. Model
değişirse satırlar geçersiz sayılıp yeniden gömülüyor; iki farklı modelin
vektörlerini karşılaştırmak sessizce anlamsız sonuç verirdi.

### Anlamsal yakınlık bir ipucu, kanıt değil

En fazla 1 puan ekliyor — tek bir sözcük eşleşmesinin (2 puan) bile
altında. Aksi hâlde kullanıcının **gerçekten yazdığı** sözcüğü içeren
kayıt, "anlamca yakın" bir kaydın arkasında kalırdı. Bir test bunu
sabitliyor: yakınlık tavanda olsa bile sözcük eşleşmesi önde.

Tema kilidi de delinmiyor: tema adı geçtiğinde havuzun o temaya
kilitlenmesi PROJE.md §7'deki bir regresyonun cevabıydı.

### İlke 2.4 en çok burada zorlandı

Sözcük eşleşmesinde kaynağı gösterebiliyoruz ("şu sözcük geçiyor").
Anlamsal eşleşmede gösteremiyoruz — hiçbir sözcük eşleşmedi. Sessizce
sonuç listesine karıştırmak, cevabın nereden geldiğini saklamak olurdu.

O yüzden kart bunu açıkça söylüyor: *"aradığın sözcükler bu kayıtta
geçmiyor — anlamca yakın."* Cevap özeti de sayıyor: *"Bunların ikisi anlam
yakınlığıyla geldi."* Kenar notu etiketiyle aynı refleks (K-026).

### İndeksleme

Parçalı (8'erli), iptal edilebilir, sürdürülebilir. Kuyruk her turda
depodan yeniden soruluyor — bellekte durum tutulmuyor, yani yarıda kalan
iş kaldığı yerden devam ediyor. **Kilitlenince ve arka plana geçince
duruyor** (K-021): anahtar bellekten silinince veritabanı kapanıyor, iş
kapanan veritabanına yazmaya çalışmamalı. Düzeltilen kayıt yeniden
gömülüyor (`gomu.guncelleme < kayit.guncelleme`).

Gömücü hata verirse durum bunu taşıyor ve arama gövdelemeyle çalışmaya
devam ediyor. **Gömü bir ek, bağımlılık değil** — tarayıcıda doğrulandı:
model indirilemediğinde anlaşılır bir hata çıkıyor ve arama bozulmuyor.

### Bu ortamda doğrulanmayan

Model indirme ve çıkarımın kendisi. huggingface.co da jsdelivr de proxy
tarafından kapalı. Doğrulanan: paketleme (taban pakette gömü kodu yok),
worker açılışı, hata yolu, ayar arayüzü, ve dışarı çıkan tek isteğin
gövdesiz olduğu.

---

## 2026-08-29 · K-028 · Kayıt silme iz bırakmaz; keşfedilemeyen özellik yoktur

İki iş, aynı boşluktan: kullanıcı yazdığını geri alamıyordu.

### Kayıt silme

`depo.kayitSil` en baştan beri vardı, testleri de vardı, arayüzü yoktu.
Tek çıkış yolu bütün defteri silmekti — tek bir kötü cümle için on yılı
yakmak. K-025'in gerekçesi burada da geçerli: *kendi rafını temizleyemeyen
kullanıcı verisinin sahibi değildir.*

**Mezar taşı yok.** Ürünün iki ilkesi burada birbirini çekiyor: *"düzeltme
iz bırakır"* ve *"yakılan sayfa gerçekten yanar."* Ayrım şu: **düzeltme
metni değiştirir, silme metni yok eder.** Değiştirilen bir geçmiş sessizce
yeniden yazılabilir, o yüzden iz bırakır. Yok edilen bir geçmiş zaten
yoktur; sayfada kalan "burada bir kayıt vardı" satırı utandığı bir şeyi
silen kullanıcı için hiç silmemekten kötüdür — kalıcı bir hatırlatıcı
bırakır. Silinen kayıt FTS indeksinden de düşüyor.

**Ad yazdırmıyoruz.** K-025'te dolu defter için ad yazdırmıştık çünkü orada
on yıl gidiyordu. Tek bir kayıt için orantısız olurdu. Sürtünme adımla
kuruluyor: kayda dokun → `sil` → onay kartı. Üç kasıtlı adım.

**Kart ne kaybedileceğini gösteriyor**, "emin misin" diye sormuyor
(K-025'in refleksi): kaydın tarihi, saati, metninin kendisi, ve varsa "1
kenar notu da gidecek". CASCADE zaten hepsini götürüyor; kullanıcı bunu
önceden bilmeli.

**Kapalı defterde silme yok.** K-018 kapalı defterde `düzelt`i kapatıyor;
silme daha güçlü bir düzeltme. Kenar notu düşmek serbest kalmaya devam
ediyor — o ekleme, bu çıkarma. Kapattığın şey kapanır.

### Defter silmeyi görünür kılma

Defter silme K-025'te gelmişti ama yalnızca sırta **basılı tutunca**
açılıyordu. Kullanıcı arayıp bulamadı. **Keşfedilemeyen özellik yok
demektir** — bu, özelliğin değil arayüzün hatası.

Sırta sessiz ama sürekli görünür bir `···` düğmesi kondu. Basılı tutma
duruyor; düğme onu değiştirmiyor, yalnızca görünür kılıyor.

Ayrı bir `düzenle` kipi düşünüldü ve seçilmedi: rafında iki-üç defter olan
bir ekranda kip, çözdüğü sorundan büyük bir kavram. Sessiz düğme ürünün
mevcut dilinde zaten var (kenar notundaki `sil`, kayıttaki `düzelt`).

### Yol boyunca çıkan iki hata

1. **Boş defter ilk ekranda taşıyordu.** `.bos-sayfa` `height:100%` ile
   kağıdın tamamını istiyordu; günün sorusu ve yazma alanı sayfanın altına
   itiliyordu. Yeni kullanıcının gördüğü ilk ekranda yazma yeri kağıdın
   dışında kalıyordu — 818px içerik, 674px kağıt. Bu değişiklikten
   eskiydi, silme testi ortaya çıkardı. Blok artık içeriği kadar yer
   kaplıyor.
2. **"1 kenar notu de gidecek"** yazıyordu. Bağlaç ünlü uyumuna uymuyordu.
   `tr.ts`'e `dahiEki` eklendi; sertleşme yok, bağlaç "te/ta" olmaz
   ("kitap da", "kitap ta" değil).

### Not edilen, yapılmayan

Bir seride ortadaki cilt silinince numaralar boşluklu kalıyor: Cilt II
gidince III, II'ye kaymıyor. Yeniden numaralama kapanmış ciltlerin
kimliğini değiştirir (K-006/K-016 alanı) ve ayrı bir karar gerektirir.

---

## 2026-08-29 · K-027 · Önce dil, sonra anlam: sözlüksüz Türkçe gövdeleme

Yol haritasının 9. maddesi "embedding tabanlı arama" diyor ve örnek olarak
"kötü hissettiğim günler"i veriyor. O cümledeki kırık iki katmanlı ve
alttaki katman anlam değil, dil.

Arama bugüne kadar `metin.includes(k)` ile çalışıyordu — düz alt-dize.
Türkçede asimetrik kırılıyordu:

- "kötü" arayan "kötüydüm"ü buluyordu (alt-dize), "kötüydüm" arayan
  "kötü"yü **bulamıyordu**;
- "hissettiğim" arayan "hissetmedim"i hiç bulamıyordu;
- "kitap" arayan "kitabı"yı bulamıyordu.

Bunların hiçbiri model gerektirmiyor. Gövdeleme sıfır indirme, sıfır pil,
tamamen `cekirdek/`'te ve tamamen test edilebilir.

**Gömü modeli neden bu turda değil.** İlke 2.3 ham metnin cihazdan
çıkmasını yasaklıyor, yani embedding cihazda hesaplanmak zorunda; Türkçe
için işe yarar en küçük çok dilli modeller ~100-130 MB. Bir günlük
uygulaması için bu, kullanıcının açıkça onaylaması gereken bir bedel ve
ayrı bir tur. Bu turun gövdeleyicisi o turda da kullanılacak — boşa iş
değil.

**Sözlük yok, aday gövde kümesi var.** Tam morfolojik çözümleme (Zemberek
sınıfı) bu ürün için fazla; ama tek bir gövde tahmin etmek de yanlış.
`kitabı` → `kitab` mı `kitap` mı? Tahmin edersen ve yanlış tahmin edersen
kayıt kaybolur. Her sözcük bir **kümeye** iniyor ve iki sözcük kümeleri
kesişiyorsa eşleşiyor:

```
kitabı → {kitab, kitap}   kitap → {kitap}   → kesişir
adı    → {ad, at}         ad    → {ad}      → kesişir
```

Tahmin etmek zorunda kalmıyoruz. Bedeli seyrek ve zararsız bir yanlış
eşleşme (`at` ile `adı`).

**Simetrik aşırı gövdeleme zararsız.** `teslim` dilbilgisel olarak
`teslim`dir, gövdeleyici `tesl`e indiriyor. İki taraf da aynı indirgemeyi
yaşadığı için eşleşme bozulmuyor. Doğruluk değil, simetri önemli.

**Bütün ekler deneniyor, yalnızca en uzunu değil.** "kereme" hem `kere+me`
(olumsuz fiil) hem `kerem+e` (yönelme) okunabiliyor; sözlük olmadan
hangisinin doğru olduğu bilinemez. En uzun eki seçmek `kere`yi verip
`kerem`i kaçırıyordu. Hepsini aday saymak seçimi ortadan kaldırıyor —
eşleşme küme kesişmesi olduğu için fazladan aday yalnızca erişimi artırır.

**Ünlü uyumu ekin İLK ünlüsüne bakıyor**, sonuncusuna değil. "-iyorum"
ekinin içindeki `o` değişmez; sona bakan kontrol "bekliyorum"u kalın sayıp
eki hiç düşürmüyordu.

**Alt-dize yolu duruyor.** Bir sözcük ya eski kuralla ya gövde
kesişmesiyle eşleşiyor. Böylece mevcut davranış ve altı regresyon testi
aynen geçiyor; gövdeleme yalnızca **kazanç** ekliyor, hiçbir şeyi
götürmüyor.

**`DURAK` gövdelenmiyor.** Durak listesinde hem `kötü` hem `kötüydüm` var.
Gövdeleyip karşılaştırsaydık liste kendiliğinden genişler ve meşru sorgu
sözcüklerini yutardı — "kötü hissettiğim günler" sorusunda `hissettiğim`
de düşerdi.

**Ünlü düşmesi kural değil istisna.** `burun`/`burnu`, `akıl`/`aklı` — ~20
sözcüklük küçük bir tablo. Kapsamlı olduğunu iddia etmiyoruz.

**Kısa sözcükler kapsam dışı.** Gövde `MIN_UZUNLUK` (3) altına inmiyor,
yani `ev`/`evde` buluşmuyor. Sorgu sözcükleri zaten 3 karakterden uzun
olmak zorunda, o yüzden pratikte görünmüyor.

**Vurgulama da gövde farkındalı.** Arşivden bir kayda gidince sayfada
sorgunun çekimli biçimi işaretleniyor: "kitap" arayan kullanıcı kenar
notundaki "kitabı"yı vurgulu görüyor. Vurgu kuralı `.satir`a değil
kağıdın tamamına bağlandı — kenar notundaki eşleşme tarayıcının sarı
varsayılanına düşüyordu.

**Ölçüm:** 352 kayıtlık tohum verisinde ilk sorgu 7 ms, sonrakiler 1-2 ms.
Gövdeler önbellekte; bir günlükte sözcükler ağır tekrar ediyor.

---

## 2026-08-29 · K-026 · Kenar notu aramaya girer, ama kaydın parçası olarak

K-024'te açık bırakılmıştı: kenar notları kullanıcının kendi sözleri ama
arşiv onları görmüyordu. Bir kayda "Sonradan anladım: Barcelona kararını o
gün verdim" diye not düşüp "barcelona" diye arayınca hiçbir şey çıkmıyordu.

**Önce bir düzeltme.** Bu işin "ikinci bir FTS indeksi ve göç" gerektirdiğini
söylemiştim; yanlıştı. Arşivin arama yolu FTS değil: `ekran/arsiv.ts`
doğrudan `soruCoz`'u çağırıyor ve `cekirdek/sorgu.ts` bellekteki kayıtları
tarıyor. `depo.ara` (FTS) arayüzde hiç kullanılmıyor, yalnızca testlerde
çağrılıyor. Göç da yeni tablo da gerekmedi.

**Not ayrı bir sonuç değil, kaydın parçası.** Kenar notunun bağımsız bir
varlığı yok — eski bir kayda düşülmüş bir şey. Sonuç yine kayıt olarak
dönüyor, tıklayınca yine o kaydın sayfasına gidiyor. Notu ayrı bir sonuç
satırı yapmak arşivde iki tür sonuç yaratır ve "kaynak = kayıt" bağını
gevşetirdi; ilke 2.4'ün dayandığı şey tam olarak o bağ.

**Eşleşen not kaynak kartında görünmek zorunda.** Kayıt yalnızca notu
yüzünden bulunduysa gövdeyi gösterip notu göstermemek sessiz bir yalan
olurdu: kullanıcı cevabın neden geldiğini göremezdi. Kart artık kaydın
altında eşleşen notu "kenar notu · tarih" etiketiyle basıyor. Eşleşmeyen
notlar görünmüyor — kaynak, gerekçedir; kaydın tüm çevresi değil.

**Özet cümlesi kaynağını söylüyor.** Bulguların bir kısmı yalnızca nottan
geldiyse bir cümle ekleniyor: *"Bu kaydı kenar notundan buldum."* Yorum
değil, kaynak beyanı — cilt özetiyle aynı refleks (K-018).

**Puan şişmiyor.** Sözcük kayıtta ya da notlarında geçiyorsa +2, sözcük
başına en fazla bir kez. İkisini ayrı saymak, bir kez yazılıp bir kez de
not düşülen konuyu haksız yere öne çıkarırdı. Mesele bulunabilirlik,
üstünlük değil.

**Tema kilidi delinmiyor.** Notlar tema taşımıyor; tema adı geçtiğinde
havuzun o temaya kilitlenmesi PROJE.md §7'deki bir regresyonun cevabıydı ve
notlarla delinmesi o hatayı geri getirirdi.

**FTS bilerek dışarıda.** `depo.ara` yalnızca `kayit.metin`'i görmeye devam
ediyor. Kullanılmayan bir kod yoluna ikinci bir indeks kurmak spekülatif iş
olurdu; Faz 3'te embedding araması gelirken indeks zaten yeniden
düşünülecek. Tutarsızlık görünürse sebebi burada yazılı.

**K-020 kilidi artık gerçek yolda da sınanıyor.** "Defterin sorduğu soru
aramaya girmez" güvencesi bugüne kadar yalnızca FTS yolunda test ediliyordu;
arşivin gerçekte kullandığı yol ise `soruCoz`. Kenar notları havuza girerken
oraya da bir test kondu: kullanıcının kendi sözleri girsin, defterin kendi
cümleleri asla.

### Yol boyunca çıkan hata

**Arşivden bir kayda tıklamak, kayıt zaten açık sayfadaysa hiçbir şey
yapmıyordu.** `sayfayaGit` hedef sayfa mevcut sayfaya eşitse kayıtsız
dönüyordu — animasyon boşuna oynamasın diye. Ama arama terimi de o an
değişiyor; dönüş erken olduğu için sayfa yeniden çizilmiyor ve vurgu hiç
görünmüyordu. Kenar notundan gelen sonuçlarda bu daha da kötüydü:
kullanıcı hem neden o kaydın geldiğini hem nereye bakacağını göremiyordu.
Aynı sayfaya "gitmek" artık yeniden çiziyor.

---

## 2026-08-29 · K-025 · Defter silinebilir, ama sürtünme içindekiyle ölçülür

Kitaplıkta defter açılabiliyordu ama silinemiyordu. Deneme için açılan
defterler rafta birikiyor ve kullanıcı onları temizleyemiyordu.

Buradaki gerilim gerçek. `veri/sifirla.ts` şunu yazıyor: *"kullanıcının on
yıllık defterini tek dokunuşla silen bir şey bu üründe bulunamaz."* Bu doğru
ve duruyor. Ama silememek de bir cevap değil: kullanıcının kendi rafını
temizleyememesi, verisinin sahibi olmadığı anlamına gelir.

**Çözüm: sürtünme sabit değil, defterin içindekiyle ölçülüyor.**

- **Boş defter** (sıfır kayıt) tek onayla gidiyor. Deneme için açılıp
  bırakılmış bir defterden ad yazmasını istemek saygısızlık olurdu; kaybedilen
  hiçbir şey yok.
- **Dolu defter** ancak **adı yazılarak** gidiyor. "Evet" demek reflekstir,
  bir ad yazmak karardır. Onay kutusu da yetmezdi — tıklanır geçilir.

**Ne kaybedileceği gösteriliyor, "emin misin" diye sorulmuyor.** Kart kayıt
sayısını, gün sayısını, kenar notu ve ek sayısını, ilk ve son tarihi
söylüyor. "352 kayıt, 213 gün, 3 haziran 2025 ile 27 ağustos 2026 arası"
cümlesi hiçbir uyarı metninin yapamayacağı şeyi yapıyor: kullanıcıya neye
karar verdiğini gösteriyor. Bu, cilt özetiyle aynı refleks (K-018) — sayı
yorumlamıyor, yalnızca duruyor.

**Silmeden önce çıkış yolu var.** Kartta "önce Markdown olarak çıkar"
düğmesi duruyor ve yalnızca o defteri çıkarıyor (K-003). Kullanıcıyı
"silmek" ile "saklamak" arasında seçim yapmaya zorlamıyoruz; ikisini de
yapabilir.

**Kart basılı tutunca açılıyor.** Sırtlar dar; her birine ayrı bir silme
düğmesi koymak rafı arayüze çevirirdi ve yanlışlıkla dokunma riskini
artırırdı. Basılı tutmak telefonun kendi dili ve mevcut sürükleme eşiğiyle
çakışmıyor: kıpırdarsan sürükleme, durursan kart. Keşfedilmesi zor olduğu
için raf altında tek satırlık bir ipucu duruyor.

**Silme geri alınamaz ve bu söyleniyor.** Çöp kutusu yok. Bir çöp kutusu
"yakılan sayfa gerçekten yanar" ilkesiyle aynı evde durmakta zorlanırdı:
uygulamanın sildiğini gerçekten silmesi gerekiyor. Silinen defterin kayıtları
FTS indeksinden de düşüyor — bir test bunu sabitliyor.

**Son defter silinirse kitaplık açık kalıyor.** Açılışta da defter yoksa
kitaplık açılıyor: yazma alanı yetim bir defter kimliğine yazmaya çalışırdı.

Teknik olarak tek `DELETE FROM defter` yetiyor: `kayit.defter_id` ON DELETE
CASCADE, kayıt da başlık, kenar notu, ek ve tema bağlarını götürüyor. Şart,
yabancı anahtarların açık olması (`pragmalariKur`) — kapalıyken yetim
satırlar kalırdı.

---

## 2026-08-29 · K-024 · Kenar notu: geçmiş benle konuşma

Faz 2.6 tamamlandı. Veri katmanı ve sayfa akışı kenar notunu 1.
Milestone'dan beri taşıyordu ama kullanıcının not düşebileceği bir yol hiç
olmamıştı — tablo gerçek kullanımda boştu, yalnızca testler yazıyordu.

**Bir kayda birden çok not.** 2026'da bir, 2028'de bir. Tek not seçseydik
bu bir dipnot olurdu; birden çok not olunca sayfa bir konuşmaya dönüşüyor
ve "kullanıcı bunu ikinci kez neden açsın" sorusunun cevabı görünür hale
geliyor: eski sayfada yalnızca eski hâlin değil, ona sonradan söylediklerin
de duruyor.

Bu karar aynı zamanda sessiz bir hatayı kapattı: `kenarEkle` her çağrıda
yeni satır açıyordu ama `kenarlar()` `Map<string, KenarNotu>` döndürdüğü
için ikinci not sessizce kayboluyordu. Arayüz olmadığı için kimse fark
etmemişti. Artık `Map<string, KenarNotu[]>`, yazılma sırasında.

**Not yazıldığı gün silinebilir, ertesi gün kalıcı.** İki uçtan da kaçınma:
hiç silinemezse düşer düşmez fark edilen bir yazım hatası on yıl kalıyor;
her zaman silinebilirse "geçmişini sessizce yeniden yazamazsın" ilkesi
kenar notunda delik veriyor — kayıtta düzeltme iz bırakırken notta hiç iz
bırakmamak tutarsız olurdu. Aradaki çizgi "bugün yazdığın hâlâ senin
elinde, dün yazdığın artık geçmiş".

Bunun için şema 006 `olusturma` sütununu ekliyor; `tarih` okunur bir dize
olduğu için "bugün mü" sorusunu cevaplayamıyordu. Varsayılan 0 — göç
öncesi notlar hiçbir zaman "bugün yazılmış" sayılmaz, yani kalıcıdırlar.
Varsayılanın yanlış tarafa düşmesi burada veri kaybı demek olurdu.

**Tarih ISO saklanıyor, ekranda biçimleniyor.** Önce okunur dize
saklanıyordu ("14 haziran 2026"). On yıllık bir üründe biçimlenmiş dize
saklamak sonradan düzeltilemez: dil değişir, biçim değişir, elde karışık
kayıtlar kalır. Göç öncesi değerler ayrıştırılmaya çalışılmıyor, olduğu
gibi basılıyor — uydurmaktansa aynen göstermek doğru.

**Kapalı deftere not düşülebilir.** K-018'de karara bağlanmıştı, arayüz
şimdi onu izliyor: kapalı defterde `düzelt` düğmesi ve yazma alanı yok ama
`kenar notu` var. Kapattığın şey kapanır; kenarına yazabilirsin.

**Kuyruk artık kırpılmıyor, taşıyor.** Ek işinde (K-023) öğrendiğimiz
tuzağın büyüğü buydu: kaydın son parçasıyla gelenlerin (ek + notlar)
maliyeti tavana vuruyordu ama basım tavana uymuyordu, yani sayfa sessizce
taşıyordu. Üç not × 280 karakter telefonda zaten bir sayfadan uzun.

Çözüm hesapla basımı ayırmak. Tavan yerinde kalıyor ve tek işi akışın
sonsuz döngüye girmesini engellemek — yani yalnızca "bu kayıt hangi sayfada
başlasın" kararını etkiliyor. Basım ise gerçek boşlukla ilerliyor: sığmayan
not için sayfa kapatılıp yenisinden devam ediliyor. Bir not kendi başına
sonraki sayfaya düşebiliyor. Bir test altı uzun notla bunu sabitliyor;
dökülme kapatıldığında test gerçekten kırılıyor.

**Araçlar dokunmayla açılıyor.** `düzelt` düğmesi bugüne kadar `:hover` ile
duruyordu; dokunmatikte bu "iki kez dokun" demek ve ürün telefon öncelikli.
Sürekli görünür yapmak da olmuyor — her kaydın altında duran iki düğme
sayfayı arayüze çevirir. Kayda dokununca araçlar açılıyor, bir seferde tek
kayıtta. Şerit mutlak konumlu: akış `.satir`ın yüksekliğini ölçüyor, şerit
yer kaplasaydı ölçüm yanılır ve sayfa taşardı.

**Kısayollar K-015'le aynı:** Ctrl+Enter kaydeder, Enter satır başı, Esc
çıkar. Not kısa diye ayrı bir kural koymadık; ürünün tek bir yazma refleksi
olsun.

**Sınır 280 karakter.** Kenarda duran bir not sayfanın kendisi değil. Sayaç
yalnızca son 40 karakterde görünüyor — sürekli sayı göstermek notu bir
forma çevirirdi.

### Açık bırakılan

**Kenar notları aramaya girmiyor.** FTS bugün yalnızca `kayit.metin`'i
indeksliyor. Notlar da kullanıcının kendi sözleri olduğu için aranabilmeleri
doğru, ama ikinci bir indeks ve `soruCoz`'da kaynak türü ayrımı gerekiyor:
ilke 2.4 gereği cevabın kenar notundan mı kayıttan mı geldiği görünmek
zorunda. Ayrı bir iş olarak duruyor.

---

## 2026-08-29 · K-023 · Ek sayfaya sıkıştırılır, galeriye değil

Faz 2.5 tamamlandı. PROJE.md "fotoğraf ve ek ekleme (bilet, ekran
görüntüsü)" diyor ve parantez içi belirleyici oldu: bu bir medya galerisi
değil, sayfaya sıkıştırılmış bir şey. Karar bu çerçeveden çıktı.

**Kayıt başına bir ek, ve şema bunu zorluyor.** `ek` tablosunun birincil
anahtarı `kayit_id`. İkinci bir fotoğraf birincinin yerine geçiyor. Sebep
"kullanıcı bunu ikinci kez neden açsın" kuralının bir uzantısı: sayfaya üç
fotoğraf koyulabildiği anda sayfa albüme dönüyor ve yazı ikincil oluyor.
Üç fotoğrafı olan üç kayıt yazar; her biri kendi anına bağlı kalır.

**Veri base64 METİN, BLOB değil.** Üç ayrı gerekçe aynı yere çıkıyor:

1. Cihaz sürücüsü ikili veri taşımıyor. `@capacitor-community/sqlite`
   parametreleri Capacitor köprüsünden JSON olarak geçiyor; bir
   `Uint8Array` oradan sağ çıkmaz. Tarayıcıda çalışıp cihazda sessizce
   bozulan bir yol olurdu — en kötü hata türü.
2. Mühürlü yedek de JSON (K-022). Metin sütunu olduğu gibi geçiyor, yani
   fotoğraflar yedeğe ve geri yüklemeye **tek satır ek kod yazmadan**
   giriyor. `dokum.ts` ve `yedek.ts` bu turda hiç değişmedi.
3. Cihazda dosyanın tamamı SQLCipher altında (K-002). Fotoğrafı diske ayrı
   dosya olarak yazsaydık onu kendimiz AES-GCM'le şifreleyip ikinci bir
   anahtar yolu açmamız gerekirdi. Kilit modeline (K-021) ikinci bir kapı
   eklemek, kazandığından çok risk getirir.

Bedeli base64'ün %33 şişmesi. Karşılığı içeri alırken ödeniyor: görsel
canvas'ta yeniden çiziliyor, uzun kenar 1400px'e iniyor, JPEG ~0.82'den
başlayıp 400 KB'ın altına inene kadar kalite kademeli düşüyor.

**Yeniden kodlama EXIF'i düşürüyor.** Bu bir yan etki değil, istenen şey:
kullanıcının bir fotoğrafı deftere koyması GPS izini, cihaz modelini ve
çekim zamanını da koyması anlamına gelmemeli. Ham dosyayı saklasaydık
konum verisi sessizce deftere girerdi.

**Ekin sayfa maliyeti orana bağlı.** Tek bir "ek sabiti" SAYFA_HACIM=620
hatasının aynısı olurdu: aynı genişlikte dikey bir fotoğraf yatay olanın
iki katı yer kaplar. Ölçüm katmanı kare bir ekin maliyetini ölçüyor,
çekirdek onu en-boy oranıyla çarpıyor. Çekirdek piksel görmemeye devam
ediyor (K-014).

Tavan tek ve CSS'le **aynı sayı**: `olcum.ts` hem `SayfaOlcu.ekTavan`'ı hem
`--ek-tavan` özelliğini aynı pikselden üretiyor. Önce ikisi ayrıydı ve
sonuç öğreticiydi — maliyet kırpılıyor ama görsel kırpılmıyordu, sayfa da
geniş ekranda sessizce 110px taşıyordu. İki yerde iki sayı tutmanın bedeli
her seferinde bu.

**Base64 belleğe girmiyor.** `Durum` bugüne kadar "on yıllık defter birkaç
megabayt" varsayımıyla her şeyi bellekte tutuyordu; fotoğrafla bu varsayım
çöker. `durum.ekler` yalnızca üstveri (tür, en, boy, bayt) taşıyor; gövdeyi
ekran, yalnızca görünen sayfa için tek tek istiyor. Çerçeve doğru oranda
baştan çizildiği için görsel gelince sayfa zıplamıyor.

**Markdown dışa aktarmaya `data:` URI olarak gömülüyor.** Dosyayı şişiriyor
ama K-003'ün sözü bunu gerektiriyor: günlüğün okunabilirliği uygulamanın
ömrüne bağlanamaz. Ayrı klasöre yazılan görseller .md'den bir taşınmada
ayrı düşer; gömülü olan on yıl sonra da açılır.

**`@capacitor/camera` eklenmedi.** `<input type="file" accept="image/*">`
Capacitor WebView'inde iOS'ta da Android'de de kamerayı sunuyor. Yeni bir
native bağımlılık ve yeni bir izin, bu ortamda test edilemeden eklenmiyor.

**İlke 2.2 ile ilişki.** Bırakılmayan ek yalnızca bellekte: yazmadan çıkan
kullanıcının seçtiği görsel diske hiç değmiyor. `ekran/yak.ts` hiçbir yeni
import almadı, `test/yakma.test.ts`'in import taraması bunu koruyor.

### Yol boyunca çıkan üç hata

Üçü de ek yüzünden görünür oldu ama ikisi ekten eskiydi:

1. **Akış sonsuz döngüye girebiliyordu.** Kaydın son parçasıyla gelenlerin
   (kenar notu, ek) maliyeti bölünen metinden düşülmüyor — doğru, çünkü
   metin biterken ödeniyorlar. Ama tavansızdılar: kuyruk tek başına temiz
   bir sayfaya sığmıyorsa "sığıyor" koşulu hiçbir zaman tutmuyor, "temiz
   sayfaya taşı" koşulu da atlanıyor, akış boş parçalar üretip sonsuza
   kadar dönüyordu. Yeterince uzun bir kenar notu bunu kuruyordu; kenar
   notu arayüzü henüz olmadığı için tetiklenmemişti. Faz 2.6'da
   tetiklenecekti. Artık kuyruğun tavanı var ve bir test döngüyü
   sabitliyor — tavan kaldırıldığında test gerçekten kilitleniyor.
2. **Ek iliştirmek yazılan cümleyi siliyordu.** `ciz()` kağıdı baştan
   kuruyor, yani textarea'yı da yeniden yaratıyor. Taslak artık bellekte
   tutulup her çizimden sonra geri konuyor.
3. **"Defter boş" yazısı yazılanı aşağı itiyordu.** Boş sayfanın yarısını
   kaplayan not, taslak ya da bekleyen ek varken kaldırılıyor: iş
   başladıysa o yazının söyleyeceği kalmamıştır.

---

## 2026-08-29 · K-022 · Mühürlü yedek kurtarma kodundan açılır

Faz 2.8 tamamlandı. K-003'te yedeğin iki yüzü olacağına karar vermiştik:
mühürlü yedek (şifreli) ve açık dışa aktarma (Markdown). İkisi de yazıldı.
Uygulama sırasında dört soru çıktı, cevapları burada.

**Anahtar cihazdan değil, kurtarma kodundan türüyor.** Yedeği cihaz
anahtarıyla mühürlemek kolaydı ama yedeğin varlık sebebini yok ediyordu:
telefon giderse yedek de gidiyor. PIN'den türetmek de olmuyor — PIN altı
hane, çevrimdışı denenebilir bir dosyada altı hane koruma değil. O yüzden
yedek kendi anahtarını taşıyor: kullanıcı bir kurtarma kodu alıyor, dosya
`Argon2id(kod)` ile mühürleniyor. Kod hiçbir yerde saklanmıyor — ne
veritabanında, ne güvenli depoda, ne dosyanın içinde. Kaybolursa yedek
açılmaz; bunu ekranda açıkça yazıyoruz ve indirmeden önce kullanıcıya
"kodu kaydettim" onayı imzalatıyoruz.

**Kod Crockford base32, sağlama basamaklı.** 26 karakter gizli + 2 karakter
sağlama, dörderli gruplar hâlinde. Sebep: kod elle yazılacak. Crockford
alfabesinde I/L/O yok; kullanıcı `1` yerine `I`, `0` yerine `O` yazsa da
`normalize()` düzeltiyor. Sağlama basamağı yanlış yazılmış kodu Argon2id'yi
çalıştırmadan, "yanlış kod" diyerek yakalıyor — 10 bitlik sağlama, testte
%99'un üstünde tek harf hatası yakalıyor. Reddedilen: BIP39 kelime listesi
(İngilizce kelimeler Türkçe bir üründe yabancı duruyor, 12 kelime yazmak
28 karakterden uzun) ve ham hex (I/O karışıklığı yok ama %60 daha uzun).

**Yedek ham veritabanı dosyası değil, mantıksal döküm.** Tablolar JSON'a
yazılıyor, sıkıştırılıyor, sonra mühürleniyor. Sebep: ham SQLCipher dosyası
aynı SQLCipher sürümünü ve aynı şema sürümünü gerektirir; iki yıl sonraki
uygulama iki yıl önceki dosyayı açamayabilir. Döküm kendi şema sürümünü
taşıyor ve geri yüklemede göçler o sürümden bugüne uygulanıyor — yani eski
yedek yeni uygulamada açılıyor. Gelecekten gelen yedek (şema sürümü bizden
büyük) reddediliyor; sessizce yarısını yüklemek en kötü seçenek.

**Geri yükleme değiştirir, birleştirmez.** Aynı kaydın iki kopyası, hangi
sürümün doğru olduğu, çakışan cilt numaraları — birleştirme bir günlükte
kullanıcının göremediği bir karar veriyor. Geri yükleme bunun yerine
defteri sıfırlıyor ve dökümü olduğu gibi yazıyor; kullanıcıya "bu cihazdaki
her şey silinecek" diye soruyor. Birleştirme gerekiyorsa iki dosya da açık
Markdown olarak dışa aktarılıp elle yapılır.

**Açık dışa aktarma şifresiz ve öyle kalacak.** Markdown çıktısı düz metin:
gün başlıkları, saatler, sorular alıntı olarak. Sebep K-003'teki gerekçe —
günlüğün okunabilirliği uygulamanın ömrüne bağlanamaz. Riski de aynı yerde
yazıyor: bu dosya şifresiz, buluta koyarsan herkes okur.

**İlkelerle ilişki.** Yedek dosyası cihazdan çıkıyor ama ham metin bizim
tarafımıza değil, kullanıcının seçtiği yere gidiyor — sunucumuz yok, ağ
çağrısı yok, her iki akış da kullanıcının açık eylemiyle başlıyor (ilke
2.3). Yakılan sayfa yedeğe de girmiyor: diske hiç değmediği için dökümde
yeri yok (ilke 2.2).

---

## 2026-08-29 · K-021 · PIN + biyometri

Faz 2.7 tamamlandı. Şimdiye kadar cihazda veritabanı SQLCipher ile şifreliydi
ama anahtar Keychain/Keystore'da **kullanıcı doğrulaması istemeden**
duruyordu: telefonun kilidi açıksa defter de açıktı.

### Karma anahtar modeli

```
AV     = rastgele 32 bayt        → SQLCipher bunu kullanır
KEK    = Argon2id(pin, tuz)      → t=3, m=48 MiB, p=1
sarmal = AES-GCM(KEK, AV)        → açık depoda durabilir
```

Anahtar PIN'den **türetilmiyor**, PIN'le **sarmalanıyor**. İki sebep:

1. Altı haneli bir PIN'den türeyen anahtar, dosyayı ele geçiren biri için
   çevrimdışı denenebilir tek engel olurdu.
2. Türetmede PIN unutulunca on yıllık defter biter. Sarmalamada AV'nin
   biyometriyle korunan ikinci kopyası var; PIN unutulsa da defter açılır.

PIN değişince defter yeniden şifrelenmiyor — yalnızca sarmal yenileniyor.

### Kilitliyken veritabanı açılmıyor

Kilit, veritabanının önünde. Kayıt güvenli depodan (veritabanının dışından)
okunuyor; ana anahtar bellekte olmadığı için veritabanı açılamıyor bile.
Kilitlenince anahtar sıfırlanıyor, sürücü kapanıyor **ve DOM temizleniyor** —
çözülmüş metin ağaçta kalmasın.

Arka plana geçer geçmez kilitleniyor. Gerçek tehdit "birisi açık telefonu
eline aldı"; gecikme tam o tehdide açık kapı bırakıyor.

### Deneme sınırlama

5 hatadan sonra artan bekleme (30 sn → 2 dk → 10 dk), sayaç kilit kaydında
kalıcı — uygulamayı kapatmak sıfırlamıyor. **Veri silme yok:** yanlış PIN on
yıllık defteri yok edemez. Bir test kırk yanlış denemeden sonra doğru PIN'in
hâlâ açtığını sabitliyor.

### Biyometrinin sınırı — abartmıyoruz

`@aparajita/capacitor-secure-storage` **öge bazında biyometrik erişim
denetimi sunmuyor**; API'si yalnızca `set/get/remove`. Yani akış
"biyometriyle doğrula, sonra depodan oku". Sağlam bir cihazda depo işletim
sisteminin kumuyla korunuyor, ama kök erişimi olan bir cihazda doğrulama
atlanıp anahtar okunabilir.

Bunun sonucu dürüstçe söylenmeli: **biyometri açmak, anahtarın açılabilir bir
kopyasını cihazda bırakmak demek.** Ayarlarda bu yazıyor ve yalnızca PIN
isteyen kullanıcı biyometriyi kapalı bırakabiliyor. Donanıma gerçekten bağlı
bir çözüm native kod ister (iOS `kSecAccessControlBiometryCurrentSet`,
Android `setUserAuthenticationRequired`); o gün geldiğinde `veri/kilitDepo.ts`
değişecek, üst katman değişmeyecek.

### Zorunlu değil

İlk açılışta boş sayfa ve soru var (K-019); araya kurulum sokmak o anı bozar.
Üçüncü yazma gününden sonra bir kez sessizce teklif ediliyor; reddedilirse bir
daha sorulmuyor, ayarlardan her zaman açılabiliyor.

### Tarayıcı önizlemesi

SQLCipher yok; kilit orada **yalnızca bir ekran**. Argon2id ve sarmalama
gerçekten çalışıyor (akış tarayıcıda test edilebilsin diye) ama koruduğu
şifreli bir şey yok. Ayarlarda ve konsolda açıkça yazıyor.

### Yol boyunca bulunan iki hata

- `visibilitychange` dinleyicisi erken dönüşün arkasındaydı: kilitli açılışta
  hiç bağlanmıyordu, yani kilit bir kez açıldıktan sonra bir daha
  kilitlenmiyordu. Dinleyici artık dönüşten önce bağlanıyor.
- Worker'da `kapat` mesajı boş SQL'i `exec`e düşürüyordu. Veritabanını ilk
  kez gerçekten kapattığımızda ortaya çıktı.

---

## 2026-08-29 · K-019 · İlk hafta takvimle değil, yazılan günle sayılır

Faz 1.2 tamamlandı. Yedi soru, sabit liste, sırayla.

**"İlk 7 gün" yazdığın 7 gün demek.** Takvimle sayılsaydı bir hafta uğramayan
biri döndüğünde 7. soruyla karşılaşır, soruların çoğunu hiç görmezdi. Hedef
kitle tam olarak "günlük tutmak isteyip tutamayan" insanlar; onlar için
takvim yanlış saat. Aynı güne ikinci kayıt sayacı ilerletmez — gün sayılır,
kayıt değil. Yazdıktan sonra o gün başka soru gelmez.

**İlk açılışta karşılama ekranı yok.** Tanıtım, kurulum sihirbazı, adım adım
anlatım hiçbiri yok. Defter açılır, boş sayfa durur, yazma alanının üstünde
"Bu defteri neden açtın?" yazar. Ürün kendini açıklamaz, kullandırır.

**Yedi gün bitince sorular susar** ama araç çubuğunda sessiz bir "bana bir
şey sor" düğmesi kalır. Tıkanan kullanıcı kendi isteğiyle çağırır. Düğme
**model çağırmaz** — yazılmış bir listeden sırayla çeker, çevrimdışı çalışır.
Aksi hâlde ilke 2.3'ü sessizce delen bir düğme olurdu. Soru duruyorken de
görünür ve "başka bir şey sor"a döner: gelen soru tutmadıysa kullanıcı tek
bir soruya mahkûm kalmamalı.

**Kriz kancası şimdiden yerinde.** `gununSorusu` ve `havuzdanSor` bir `kriz`
bayrağı alıyor; true olduğunda ikisi de null dönüyor. Sınıflandırıcı Faz
3.11'de gelecek ama ilke 2.1 "kriz anında uygulama susar" diyor ve soru
sormak da konuşmaktır — o gün geldiğinde susma tek yerden takılacak.

**Soruların sesi:** soru olay sorar, duygu sormaz. "Bugün nasıl hissettin"
soyut ve hiçbir şey yazdırmıyor; "bugün kimseye söylemediğin ne oldu"
yazdırıyor. Duygu varsayan soru ("bugün zor muydu") varsaydığı an yorum
yapmış olur. Bir test destekleyici-AI diline (minnettarlık, "harikasın",
puanlama) kaçmadığını sabitliyor.

---

## 2026-08-29 · K-020 · Soru kayıtla saklanır ama metne karışmaz

Soru, yazıldığı kayıtla birlikte kalıyor: yıllar sonra açtığında defterin o
gün ne sorduğunu görüyorsun.

Bunun bir bedeli var ve bedel şurada ödendi: soru `kayit.soru` diye **ayrı
bir sütunda** duruyor, `metin`'in içinde değil. FTS indeksi ve `soruCoz`
yalnızca `metin`'i görüyor. Soru `metin`'in içinde olsaydı arşiv,
uygulamanın kendi cümlelerinden cevap kurmaya başlardı — "arşiv uydurmaz"
ilkesi tam orada aşınırdı. Bir test bunu koruyor: sorunun sözcükleri aramada
eşleşmiyor, kullanıcının yazdığı eşleşiyor.

Ekranda da ayrı duruyor: mürekkep değil, basılı bir yönerge gibi — arayüz
yazı tipi, daha küçük, daha soluk, ince bir çizgiyle. Kullanıcının yazdığı
ile defterin sorduğu bir daha karışmıyor.

---

## 2026-08-29 · K-017 · Defterin ölçüsü kullanıcıya ait

Sayfa sayısı tek bir sabit değil artık; her defterin kendi sınırı var. Yeni
defter açarken seçiliyor (20 / 45 / 90 / 180, varsayılan 45) ve dolunca
törende uzatılabiliyor. Böylece "bu kısa bir defter olsun" ile "bu uzun
sürsün" ayrı ayrı söylenebiliyor — gerçek defterler gibi.

**Sınıra gelince yazma durur.** Yazma alanının yerine törene çağrı geçer.
Uyarıp yazmaya devam ettirmek denenebilirdi ama o zaman sınırın anlamı
kalmıyor ve defter yine sonsuz bir akışa dönüyor; "dolduğunda biten defter"
ürünün ilk cümlesi. Son üç sayfada üst şeritte geri sayım beliriyor, bitiş
ani gelmiyor.

**Not:** Göç, var olan defterlere 45 sayfa sınırı veriyor. Halihazırda daha
uzun bir defteri olan biri uygulamayı açtığında defteri "dolu" görecek — ama
tören onu karşılıyor ve tek dokunuşla uzatabiliyor. Göç sırasında sayfa
sayısı hesaplanamıyor: sayfa akışı ekran ölçüsüne bağlı (K-014), SQL
içinden bilinemez.

---

## 2026-08-29 · K-018 · Cilt kapanma töreni

PROJE.md Faz 1.4 tamamlandı — ürünün en duygusal anı olarak tarif edilen ve
tamamen boş duran yer.

Defter dolunca (ya da kullanıcı fihristten "bu defteri kapat" deyince) tören
açılıyor: defterin adı ve kapağı son kez düzenlenebiliyor, sonra iki yol var
— **biraz daha uzat** ya da **bu defteri kapat**. Dolmamış bir defteri
kapatırken "uzat" gösterilmiyor; oradaki soru zaten "burada bitiriyor musun".

Kapatınca **cildin özeti** geliyor: tarih aralığı, kaç sayfa / kaç kayıt /
kaç gün yazıldığı / kaç gün sürdüğü, en sık geçen temalar, kullanıcının ad
verdiği sayfalar, ve ilk ile son kaydın kendisi. Sonra aynı adla bir sonraki
cildi açmayı öneriyor.

**Özet yorum yapmaz.** Yalnızca kullanıcının kendi kayıtlarından çıkan
olgular; skor, grafik ve teşhis PROJE.md §5 ile kapalı. Bir test özet
nesnesinin alan listesini sabitliyor ki ileride oraya bir "yorum" alanı
sızmasın. En çok anlamı taşıyan kısım sayılar değil, ilk ve son cümlenin yan
yana durması: aradaki mesafeyi hiçbir sayı o kadar iyi anlatmıyor.

**Kapanan defter:** yeni kayıt yazılamaz, eski kayıt düzeltilemez. Kapattığın
şey kapanır. Kenar notu düşülebilir — PROJE.md'de kenar notu zaten "eski bir
kayda sonradan düşülen not", yıllar sonra dönüp bir şey eklemek bu ürünün
kendi fikri. (Kenar notu arayüzü Faz 2.6; veri katmanı hazır.)

Kapanmış bir defteri açınca tören doğrudan özeti gösteriyor, soruyu değil.

**K-006 tekrar değerlendirildi.** Kapanan cildin sayfalarını piksel düzeyinde
dondurmak artık hem gereksiz hem imkânsız: gereksiz, çünkü kapalı defter salt
okunur — düzeltmeyle sayfalar kayamaz; imkânsız, çünkü sayfa akışı ekran
ölçüsüne bağlı (K-014), bir ekranda dondurulan düzen başka ekranda taşar.
İçerik donuyor, dizgi ekrana uyuyor. `donmusSayfalar` mekanizması duruyor ama
kullanılmıyor.

---

## 2026-08-29 · K-014 · Sayfa akışının atomu kayıt değil, parça

Uzun bir kayıt kitaba yayılmıyordu. Akışın atomu *kayıt* olduğu için bir
sayfaya sığmayan kayıt kendi sayfasında kalıyor ve kağıdın içinde kayıyordu:
1538 karakterlik bir yazı, 758px'lik sayfada 1736px içerik demekti — metin
sayfa numarasının altından taşıyordu. "Dolduğunda biten defter" tezinin tam
karşıtı.

Artık kayıt, sığmadığı yerde **sözcük sınırından** kesilip sonraki sayfadan
devam ediyor. İşaretsiz — gerçek bir defterde de "devamı var" yazmaz, sayfayı
çevirirsiniz. Parçalar birleştirildiğinde özgün metin birebir geri gelir ve
bu teste bağlı. Arşiv, arama ve düzeltme kaydı hep bütün görür; bölünme
yalnızca görüntüde.

Bölme yalnızca gerektiğinde: tek başına bir sayfaya sığan kayıt bütün hâlde
sonraki sayfaya taşınıyor, kısa kayıtların davranışı demodaki gibi kalıyor.

Devam sayfasına başlık verilemiyor (anahtar `null`). Yoksa aynı anahtar iki
sayfaya düşüyor ve başlık ikisine birden yazılıyordu. `sayfaBul` kaydın
başladığı sayfayı döndürüyor — arşivden tıklayan kaydın ortasına düşmesin.

### Sayfa kapasitesi ölçülüyor, varsayılmıyor

Bunu düzeltirken daha derin bir hata çıktı: `SAYFA_HACIM = 620` sabitti, ama
gerçek kapasite ekrana bağlı. Aynı metin 680px'lik kağıtta ve 320px'lik
telefon kağıdında bambaşka yer kaplıyor; telefonda sayfa taşıyordu. Sabit
değer demonun geniş ekranına göre ayarlanmıştı.

Kapasite artık ölçülüyor (`ekran/olcum.ts`): kağıdın içine bilinen uzunlukta
bir metin konup gerçek yüksekliği ölçülüyor, oradan "piksel başına karakter"
çıkarılıyor. Yazı tipi, satır aralığı, ekran genişliği ne olursa olsun doğru
sonuç veriyor. Ekran döndüğünde yeniden ölçülüyor.

Doğrusal model bir şeyi kaçırıyordu: metin satır satır dizildiği için her
kaydın son satırı yarım kalıyor. Dar ekranda (satırda ~20 karakter) bu kayıp
sayfayı taşıracak kadar büyüyor. Kayda ortalama yarım satır ekleniyor,
sayfadan bir satır emniyet payı düşülüyor. Üç ekran boyutunda da taşma sıfır.

Çekirdek DOM bilmemeye devam ediyor: ölçüm ekran katmanında yapılıp
`sayfalariKur`'a sayı olarak geçiyor.

Son sayfada yazma alanının yeri de hesaba katılıyor. Sayfa dolduysa gerçek
bir defterdeki gibi temiz bir sayfa açılıyor.

**Demoda bulunan hata:** gün başlığı sayfa sınırında yeniden yazıldığında
44 karakterlik maliyeti sayılmıyordu (maliyet kırılmadan önce hesaplanıyor,
sonra yeni başlık ekleniyor ama hacme eklenmiyordu). Sayfa sessizce taşıyordu.
Düzeltildi; testteki referans uygulama da düzeltilmiş hâli izliyor ve
"hiçbir sayfa hacmi aşmaz" değişmezi teste bağlandı.

---

## 2026-08-29 · K-015 · Ctrl+Enter bırakır, Enter satır başı kalır

Enter'ın bırakması sohbet uygulamalarının alışkanlığı ve hızlı. Ama bu ürünün
asıl işi paragraf yazmak: düşünerek yazarken Enter'a basmak doğal bir
hareket ve her seferinde Shift tutmak yazmayı bozar. Yanlışlıkla bırakılan
yarım cümle de geri alınamıyor — düzeltme iz bırakıyor (PROJE.md §3).

Ctrl+Enter (Mac'te Cmd+Enter) bırakır, Esc yazma modundan çıkar. Bıraktıktan
sonra odak yeni kalemde kalır; kullanıcı durmadan sonraki kayda geçer.
Kısayol bırak düğmesinde yazılı.

---

## 2026-08-29 · K-016 · Cilt, aynı adlı defterin devamı

Kullanıcı tek deftere bağlı kalmıyor: birden çok defter tutabiliyor, ad
veriyor, kapak seçiyor, rafta kendi düzenini kuruyor. "Kapat" düğmesi artık
tek bir kapak değil **kitaplığı** açıyor.

Cilt soyut bir bölüm olmaktan çıktı. Eskiden 45 sayfada bir cilt kendiliğinden
doğuyordu; artık cilt, aynı adlı defterin devamı. Aynı adla açılan yeni defter
o adın bir sonraki cildi oluyor ve rafa yanına diziliyor. Bu, PROJE.md'deki
cilt kapanma töreniyle (Faz 1.4) doğal olarak birleşiyor: tören artık "defter
kapandı, yenisi rafa girdi" anı. Töreni bu turda yapmadım — şema ve mekanizma
hazır.

Kapaklar tamamen CSS ile üretiliyor, görsel dosya yok: uygulama çevrimdışı ve
hafif kalsın.

**Sürükleyerek dizme pointer olaylarıyla.** HTML5 sürükle-bırak önce denendi
ama dokunmatikte çalışmıyor ve ürün telefon-öncelikli (K-007). Pointer
yakalama da denendi ve çalışmadı: sürükleme sırasında sırtı DOM'da taşımak
(`insertBefore`) öğeyi bir an ağaçtan çıkarıyor, bu yakalamayı düşürüyor ve
ilk taşımadan sonra hareket olayları kesiliyordu. Dinleyiciler `window`'da;
fare, kalem ve parmakta çalışıyor, ikisi de tarayıcıda doğrulandı.

**Göç, veri kaybı riskinin asıl olduğu yer.** `DROP TABLE kayit` açık yabancı
anahtarlarla birlikte `ON DELETE CASCADE` zincirini tetikliyor ve sayfa
başlıklarını, kenar notlarını, tema bağlarını da siliyordu. Testler bunu
yakaladı. `PRAGMA foreign_keys` işlem *içinde* yok sayıldığı için göç
sürerken işlemin dışında kapatılıyor — SQLite'ın tablo değiştirme yordamının
önerdiği sıra bu.

---

## 2026-08-29 · K-013 · GitHub Pages önizlemesi

Uygulama yalnızca depo klonlanıp `npm run dev` ile açılabiliyordu ve
telefonda **veri kalıcılığı denenemiyordu**: OPFS güvenli bağlam istiyor,
`localhost` güvenli sayılıyor ama LAN üzerinden `http://192.168.x.x`
sayılmıyor. Pages HTTPS olduğu için bu boşluğu kapatıyor.

Derleme `.github/workflows/pages.yml` ile her itmede yapılıyor; testler
geçmeden yayına çıkmıyor. Pages'in bir kez elle açılması gerekiyor
(Settings → Pages → Source: GitHub Actions): `actions/configure-pages`
`enablement: true` ile bunu kendisi denedi ve "Resource not accessible by
integration" aldı — site oluşturmak yönetici yetkisi istiyor, iş akışının
belirteci bunu almıyor. O yüzden `enablement` kullanılmıyor. Taban yol (`/Gunluk/`) yalnızca iş akışının derleme
adımında `--base` ile veriliyor, `vite.config.ts`'e yazılmıyor — yerel
geliştirme ve yerel derleme etkilenmiyor.

**Yayınlanan sürüm şifresiz olduğunu söylüyor.** Tarayıcı derlemesinde
SQLCipher yok (K-002) ve kilit yok (Faz 2.7). Adresi bilen herkesin
açabildiği bir yerde bunu söylemeden geçmek, ürünün kendi ilkeleriyle
çelişirdi. İşaret, üst şeritteki mevcut marka yazısına eklenen iki kelime:
`defter · önizleme`. Yeni bir kutu, uyarı çubuğu veya modal yok — tasarım
diline yeni bir öge sokmadan söylenebilecek en az şey. Derleme zamanı
bayrağı (`VITE_ONIZLEME`) yalnızca iş akışında veriliyor; yerel derlemede
yazı `defter` kalıyor.

Taban yolun iki şeyi kırma ihtimali vardı ve ikisi de denendi: worker
(`new URL('./sqlite-isci.ts', import.meta.url)`) ve emscripten'in kendi
adresine göre aradığı `sqlite3.wasm`. Dev sunucusunda tam olarak bu ikincisi
kırılmıştı (K-012). `vite preview --base=/Gunluk/` ile birebir taklit edilip
doğrulandı: ikisi de çalışıyor.

---

## 2026-08-29 · K-012 · Geliştirme bayrakları ve dev sunucusu

`npm run dev` çalışmıyordu — yalnızca `npm run build` çalışıyordu. Vite'ın
bağımlılık ön paketlemesi `sqlite-wasm`'ı `node_modules/.vite/deps/` altına
taşıyor ama yanındaki `sqlite3.wasm` dosyasını taşımıyor; wasm 404 dönüp
uygulama açılmıyordu. `optimizeDeps.exclude` ile paket kendi klasöründen
servis ediliyor. Üretim derlemesi etkilenmiyordu çünkü orada Vite wasm'ı
varlık olarak yayıp adresi yeniden yazıyor.

İki geliştirme bayrağı: `?tohum=1` (demo verisi, yalnızca defter boşken) ve
`?sifirla=1` (defteri boşalt, şemayı yeniden kur).

`?sifirla=1` çalıştıktan sonra kendini adresten siliyor. Sebep: adres
çubuğunda kalınca her yenileme defteri tekrar boşaltıyordu — geliştirirken
farkına varmadan veri kaybettiren bir tuzak.

**Sıfırlamanın uygulamada düğmesi yok ve olmayacak.** Kullanıcının on yıllık
defterini tek dokunuşla silen bir şey bu üründe bulunamaz. Silme, ileride
gelecekse, tek tek ve geri dönüşü belli olacak biçimde gelir.

---

## 2026-08-29 · K-011 · Yazı tipleri pakete gömüldü

`index.html` üç etiketle Google Fonts'a bağlıydı. Kaldırıldı; woff2
dosyaları `app/src/yazitipi/` altında, `@font-face` kuralları kendi
yazdığımız `src/stil/yazitipi.css` içinde.

**Neden:**

1. **Çevrimdışı çalışmıyordu.** Ağ yoksa tipografi Georgia yedeğine
   düşüyordu. Bu üründe tipografi süs değil — PROJE.md §4 "kağıt gerçekten
   kağıt" diyor ve o etkiyi Newsreader kuruyor.
2. **Her açılışta dışarıya istek gidiyordu.** Ham metin çıkmıyordu (ilke 2.3
   duruyordu) ama uygulamanın ne zaman açıldığı ve kullanıcının IP'si üçüncü
   tarafa gidiyordu. Sunucusu olmayan bir günlükte bu tutarsız.
3. PROJE.md §7 demonun sıfır dış bağımlılık sadeliğini korunmaya değer
   buluyor; üretim sürümü bunu daha ilk günden bozmuştu.

**npm paketi (@fontsource) yerine depo:** hangi kesimin gittiğini birebir
biz seçiyoruz, paketin dosya düzeni yarın değişse derleme kırılmıyor ve on
yıl sonra depoyu klonlayan aynı sonucu alıyor. Bedeli elle güncelleme —
nadiren olacak bir iş, yöntemi `src/yazitipi/BENIOKU.md`'de.

**Kesimler latin + latin-ext.** Türkçe için latin-ext şart (ğ ş İ orada),
ı ise latin kesiminde. İkisi birlikte İngilizce yerelleştirmeyi de
karşılıyor. Yunanca/Kiril/Vietnamca alınmadı.

**Optik boyut (`opsz`) ekseni alınmadı.** Demodaki Google bağlantısı
`opsz@6..72` istiyordu, yani kavram bu ekseni varsayarak tasarlanmıştı. Ama
opsz'li dosyalar 263 KB daha büyük (503 KB yerine 240 KB) ve defterde
Newsreader yalnızca 14–29px arasında kullanılıyor. opsz'nin asıl kazancı
6–72px gibi geniş aralıklarda çıkıyor; bu dar aralıkta farkı görmek için iki
sürümü yan yana koymak gerekir. Geri gelmek isterse: yazı tipinin daha geniş
bir boyut aralığında kullanılması gerekiyor olmalı.

**Instrument Sans italik alınmadı** — arayüz yazı tipiyle italik hiçbir
yerde birlikte kullanılmıyor (CSS taranarak doğrulandı).

**`font-display: block`.** Dosyalar yerel, yükleme anlık; `swap` burada
yalnızca Georgia'dan Newsreader'a görünür bir sıçrama yaratırdı. Sayfanın
ilk izlenimi tipografiyle kuruluyor, o sıçrama pahalı.

`test/yazitipi.test.ts` CDN'e sessiz dönüşü engelliyor: `index.html` ve
stil dosyalarında Google Fonts adresleri aranıyor, `@font-face`'lerin
gösterdiği her dosyanın gerçekten var olduğu ve depoda kullanılmayan woff2
birikmediği doğrulanıyor.

---

## 2026-08-29 · Milestone 1 kararları (K-008 … K-010)

Kalıcılık uygulanırken çıkan üç karar.

### K-008 · Tarayıcı derlemesi worker içinde SQLite, ve şifresiz olduğunu söyler

OPFS'in eşzamanlı dosya erişimi (`createSyncAccessHandle`) ana iş
parçacığında yok, yalnızca worker'da var; `opfs-sahpool` ana iş parçacığında
"Missing required OPFS APIs" ile düşüyor ve sessizce belleğe kaçıyordu —
yani yazılan kayıt yenilemede gidiyordu. Veritabanı artık kendi worker'ında
açılıyor (`veri/sqlite-isci.ts`), ana taraf mesajla konuşuyor. COOP/COEP
başlığı gerekmiyor.

Bunun yan sonucu: sürücü arayüzü **async**. Capacitor'ın SQLite API'si zaten
Promise tabanlı olduğu için senkron bir arayüz cihazda hiç çalışmayacaktı.

Tarayıcı derlemesinde SQLCipher yok, veritabanı şifresiz. Bu sessiz
geçilmiyor: açılışta konsola uyarı yazılıyor ve README'de tablo hâlinde
duruyor. Cihazda güvenli anahtar deposu bulunamazsa defter **açılmıyor** —
şifresiz yola düşmek yok.

### K-009 · İşlemler yeniden girilebilir

Tohum yüzlerce kaydı tek işlemde ekliyor, `kayitEkle` ise kendi işlemini
açıyor. SQLite iç içe `BEGIN` kabul etmediği için bu kilitleniyordu. En
dıştaki işlem gerçek olur, içtekiler ona katılır
(`yenidenGirilebilirIslem`). Üç sürücü de aynı sarmalayıcıyı kullanıyor.

### K-010 · Türkçe ek uyumu sayının okunuşuna bağlandı

Demodaki `YIL_EK` / `BIR_EK` tabloları sayının **son rakamına** bakıyordu.
Bu 2025 ve 2026 için doğru sonuç veriyor ama kural son rakamın değil,
okunuştaki **son sözcüğün**: 2020 "…yirmi" → `2020'de`, 2030 "…otuz" →
`2030'da`, 10 "on" → `10'u` (demo `10'i` yazıyordu). `sonSozcuk()` sayının
okunuşundaki son sözcüğü veriyor, ekler ondan türüyor. On yıl kullanılacak
bir defterde yıl ekinin 2030'da bozulması kabul edilebilir değil.

---

## 2026-08-28 · K-007 · El yazısı kapsam dışı

Yol haritasının Faz 1.3'ü (el yazısı: PencilKit / S Pen, görünmez döküm,
döküm üstünde arama) **çıkarıldı.**

Sebep: maliyeti getirisini karşılamıyor. İki ayrı problem demekti — çizim
yüzeyi ve yazıyı metne çevirme — ve ikincisi iOS'ta Türkçe için birinci
taraf çözümü olmayan, ticari SDK'ya bağlanan açık bir risk taşıyordu.

**Neyi değiştiriyor:**

- Capacitor kararı (K-001) güçleniyor. Native tarafta kalan tek ihtiyaç
  güvenli anahtar deposu (Keychain / Android Keystore). Webview'in içine
  native görünüm gömme problemi tamamen ortadan kalkıyor; K-001'de kabul
  edilen "tam ekran native yazma sayfası" tavizi de gereksizleşiyor.
- Ürün tablet-öncelikli olmaktan çıkıp telefon-öncelikli oluyor. PROJE.md
  §6'da tabletin gerekçesi el yazısıydı; artık tablet yalnızca desteklenen
  bir ekran boyutu.
- Kayıt metni tek biçimde duruyor: düz metin. Şemada mürekkep BLOB'una,
  döküm/mürekkep ayrımına ve "görünmez döküm" senkron problemine gerek yok.
  Arama doğrudan yazılanın üstünde çalışıyor.
- Faz 1 üç adıma iniyor: kalıcılık, boş defter/onboarding, cilt kapanma
  töreni.

Geri gelmek isterse: yukarıdaki maliyet tablosu değişmiş olmalı — yani
iOS'ta Türkçe el yazısı dökümü için birinci taraf, cihaz üstü bir çözüm
çıkmış olmalı.

---

## 2026-08-28 · Mimari kararlar (K-001 … K-006)

Kavram aşaması bitti, üretim geliştirmesi başlıyor. Altı karar alındı.

### K-001 · Platform: Capacitor + web arayüz, iki iş için native modül

Seçenekler: PWA+Capacitor, React Native, tamamen native.

**Seçim: Capacitor.** Bu ürünün en değerli varlığı, `kavram/defter.html`
içinde CSS'te yaşayan görsel kimlik — parşömen dokusu, saate bağlı masa
ışığı, soldan menteşelenen sayfa çevirme. React Native bunların hepsini
sıfırdan yazdırır ve büyük kısmını daha kötü yapar. Tamamen native ise
aynı tasarımı iki kez uygulamak demek; tek kişilik geliştirmede yayın
tarihini ikiye katlar.

Şifreleme bu kararda kısıt değil: Keychain ve Android Keystore'a native
eklentiyle erişiliyor, maliyeti düşük.

**Kabul edilen taviz:** el yazısı yüzeyi webview'in DOM akışına gömülemez.
Mürekkep, tam ekran açılan native bir yazma sayfası olacak (PencilKit /
S Pen); kapanınca çizim ve görünmez döküm geri dönecek. Bu bir tasarım
tavizidir, bilerek kabul edildi.

**Açık risk — kararın tek geri döndürülebilir noktası:** iOS'ta Türkçe el
yazısı dökümü. Android'de ML Kit Digital Ink cihaz üstünde Türkçe
destekliyor. Apple Vision / Scribble dil listesinde Türkçe göründüğü
kadarıyla yok. Faz 1.3'e girmeden önce bir günlük doğrulama deneyi
yapılacak. Sonuç olumsuzsa iki yol var: MyScript iink (ticari, cihaz üstü,
Türkçe destekli) veya ilk sürümde iOS'ta aramanın yalnızca klavyeyle
yazılmış kayıtlarda çalışması. Üçüncü ihtimalde iOS tarafı native'e kayar.

### K-002 · Veri: SQLite + SQLCipher + FTS5

Seçenekler: IndexedDB + alan bazlı WebCrypto, SQLite şifresiz, SQLCipher.

**Seçim: SQLCipher.** Belirleyici sebep hız değil, şifreleme ile aramanın
çakışması. Alan bazlı şifrelemede şifreli alan indekslenemez; aramayı elle
kurmak gerekir ve on yıllık arşivde bu başlı başına ayrı bir ürün olur.
SQLCipher dosyanın tamamını şifreler, FTS5 indeksi de o şifreli dosyanın
*içinde* durur — arama ve şifreleme aynı anda çalışır.

Yan kazançlar: Faz 3'teki embedding araması aynı dosyaya sqlite-vec ile
eklenebilir; yedek tek dosya olur.

`PRAGMA secure_delete = ON` — silinen kayıt sayfada iz bırakmasın.

### K-003 · Yedekleme: mühürlü yedek + açık dışa aktarma, ikisi de kullanıcı eylemiyle

On yıllık bir günlük tek cihaza emanet edilemez, ama sessizce buluta da
yüklenemez (ilke 2.3). İki ayrı şey yapılacak, ikisi de yalnızca
kullanıcının açık eylemiyle:

1. **Mühürlü yedek** — şifreli tek dosya. Anahtar cihaz anahtarından değil,
   kullanıcının yazıp sakladığı bir **kurtarma cümlesinden** türetilir
   (Argon2id). Sebep: telefon kaybolduğunda yedek de ölmemeli. Kullanıcı
   dosyayı kendi iCloud/Drive'ına koyar. Bizim sunucumuz yok.
2. **Açık dışa aktarma** — Markdown + JSON, şifresiz. Sebep: on yıl sonra bu
   uygulama var olmayabilir. Günlüğün okunabilirliği uygulamanın ömrüne
   bağlanamaz.

Reddedilen: yalnızca mühürlü yedek (uygulama kapanırsa veri de kapanır — bir
günlük için kötü bir söz); yalnızca açık dışa aktarma (kullanıcı şifresiz
dosyayı buluta koyar, ilke 2.3'ü fiilen delen biz oluruz).

### K-004 · Yığın: TypeScript + Vite, UI framework yok

Durum küçük, tasarım CSS'te yaşıyor; React buraya az şey katıp demonun
sadeliğini alır. Sayfa çevirme, odak modu ve mürekkep gibi imperatif
animasyonlarda framework sürekli engel olur.

Asıl kazanç framework tercihinde değil, şu bölünmede: saf mantık
(`sayfalariKur`, Türkçe ek yardımcıları, `soruCoz` retrieval'ı) DOM'dan
ayrılıp tarayıcısız test edilebilir hale gelir. Kural: `cekirdek/` hiçbir
zaman `veri/` veya `ekran/` import etmez.

### K-005 · Başlık ve kenar notu artık kayıt kimliğine bağlanıyor

Demoda `BASLIKLAR` ve `KENAR` `'tarih|ki'` ile anahtarlanıyor. Başlığın
sayfa numarasına değil içeriğe bağlanması doğru karardı ve korunuyor — ama
bu anahtar bir kayıt silinince veya sırası değişince kayar. Üretimde ikisi
de kalıcı `kayit.id` ile bağlanır. İlke aynı, kırılganlık gider.

### K-006 · Kapanan cilt dondurulur, sayfa akışı yalnızca açık ciltte hesaplanır

Demoda cilt sayfa indeksinden hesaplanıyor (`floor(i/45)`). Eski bir kayıt
düzeltilip uzayınca sonraki bütün sayfalar kayar — yani kapanmış bir cildin
içeriği sonradan değişir. Bu, cilt kapanma töreninin (Faz 1.4) anlamını yok
eder: kapattığın şey kapanmamış olur.

Üretimde cilt kapandığında kayıt aralığı dondurulur; sayfalar yalnızca açık
cilt içinde yeniden hesaplanır. Şeması Milestone 1'de atılıyor, töreni
Faz 1.4'te geliyor.

---

## Daha önce denenmiş ve bilerek kaldırılmış yaklaşımlar

Bunlar kavram aşamasında denendi ve çıkarıldı. Geri önerilecekse önce
buradaki gerekçe çürütülmeli.

| Denenen | Neden kaldırıldı |
|---|---|
| **Dokuma deseni** (çözgü/atkı ızgarası) | Güzeldi ama kişisel değil, teknikti. |
| **d3 kuvvet ağı** (nöron/perk ağacı) | Etkileyici ama okunmuyor. Düğüm yeri fizikten geliyor, veriden değil; sürekli süzüldüğü için zihinsel harita kurulamıyor; zaman ekseni yok. Klasik saç yumağı. |
| **Tema zaman çizelgesi** (satır=tema, sütun=ay) | Okunabilirdi ama Excel gibi duruyordu ve uygulamanın sıcak diliyle çelişiyordu. |
| **Zihin ekranı** (keşif kartları) | Bir açılma sebebi yoktu. Kartlar bir kez okunur, ertesi hafta aynıdır. Üstelik Ayna zaten aynı işi yapıyordu. |
| **Ayna ekranı** (haftalık AI yorumu) | İkinci aydan sonra açılmaz, bildirim gürültüsüne döner. Karşılıksız gelen içgörü değersizdir. Maliyet sorunu değil, ilgi sorunu. |
| **Tema çipleri / mercek** | Arşivde gereksiz görsel yük. Soru metninde tema adı zaten yakalanıyor. |
| **Sonsuz kaydırma** | Veritabanı görünümü, kitap değil. Defteri defter yapan şey sayfaların bitmesi. |
| **Sertlik ayarı** (AI ne kadar sert olsun) | Verilirse herkes ilk hafta kapatır, geriye yalaka kalır. |
| **Mod/duygu skoru grafikleri** | Uygulamayı ölçüm aletine çevirir. Teşhis çağrışımı yasak. |

**Genel kural:** grafik ana olay değil. Bir görselleştirme eklerken sorulacak
soru "güzel mi" değil, **"kullanıcı bunu ikinci kez neden açsın"**.
