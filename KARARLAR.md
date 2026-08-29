# Karar günlüğü

Bu dosya zamanla deponun en değerli parçası olacak. Her büyük karar buraya
yazılır: ne seçildi, neden, ve reddedilen alternatifin neden reddedildiği.
Bir kararı geri almak isteyen (biz dahil) önce buradaki gerekçeyi çürütmek
zorunda.

Yeni karar en üste eklenir.

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
