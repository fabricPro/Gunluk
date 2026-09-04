# Karar günlüğü

Bu dosya zamanla deponun en değerli parçası olacak. Her büyük karar buraya
yazılır: ne seçildi, neden, ve reddedilen alternatifin neden reddedildiği.
Bir kararı geri almak isteyen (biz dahil) önce buradaki gerekçeyi çürütmek
zorunda.

Yeni karar en üste eklenir.

---

## 2026-09-04 · K-051 · Sayfa cihazdan bağımsız — ve K-014'ün geri alınması

K-050'de ölçtüm: aynı defter masaüstünde 70, tablet dikeyde 44, telefon
dikeyde 119, yatay telefonda 389 sayfa. Cildin ne zaman dolduğu kullanıcının
o an hangi cihazı tuttuğuna bağlıydı; telefonu yan çevirmek "defterin doldu"
diyebiliyordu. Kullanıcı bunun düzeltilmesini istedi.

Sorun cilt sınırından büyüktü. **Sayfa numarası bu üründe kullanıcıya
GÖSTERİLEN bir kimlik:** arşiv cevabı kullanılan kaydı "cilt + sayfa
numarasıyla" göstermek zorunda (PROJE.md · 2.4), fihrist sayfa numarasıyla
listeliyor, kapanmış cilt özeti sayfa numarası saklıyor. "Cilt II, sayfa 17"
telefonda ve masaüstünde başka bir yeri gösteriyordu.

### K-014'ün gerekçesi nerede çürüdü

K-014 sabit "620 karakter" varsayımını kaldırmıştı ve haklıydı: aynı metin
680 px'lik kağıtta ve 320 px'lik telefon kağıdında farklı yer kaplıyor,
telefonda sayfa TAŞIYORDU. Çürüyen şey sabit sayının kendisi değil, sabit
sayının taşmaya karşı hiçbir karşılığının olmamasıydı.

Şimdi karşılığı var: **sayfa sabit, yazı ölçekli.** Ölçüm de kalkmadı —
K-014'ün asıl kazanımı ("tahmin etme, ölç") duruyor; ölçülen soru değişti:

> "bu kağıda kaç karakter sığar" → "sabit sayfanın bu kağıda sığması için
> yazı ne kadar olmalı"

`SABIT_OLCU` tahmin değil: referans cihazda (telefon dikey 390×844, kağıt içi
310×543) gerçekten ölçüldü ve donduruldu. Referans telefon, çünkü ürünün
birincil cihazı o — orada ölçek 1, yani görünüm değişmiyor.

### Nasıl

`.kagit-ic{zoom:var(--yazi-olcek)}`. `transform: scale` değil `zoom`, çünkü
zoom yeniden yerleşim yapıyor: yazı keskin kalıyor ve satır kırılmaları
gerçek. Ölçeği `ekran/olcum.ts` çözüyor; `zoom = k` altında yerleşim kutusu
`fiziksel / k` olduğu için kapasite `1/k²` ile değişiyor ve
`k *= sqrt(ölçülen / hedef)` bir adımda neredeyse oturuyor.

**`zoom` altında birimler ayrışıyor** ve bu tuzağı önce ölçtüm:
`clientHeight`/`offsetHeight` yerleşim birimini, `getBoundingClientRect`
ekrana basılan pikseli veriyor (1.5 ölçekte 200 ve 300). Ölçüm yardımcısı
bu yüzden `getBoundingClientRect` yerine `offsetHeight` kullanıyor;
karıştırmak kapasiteyi ölçek kadar yanlış hesaplardı.

### Sonuç — ölçülmüş

| ekran | ölçek | sayfa/cilt |
|---|---|---|
| telefon dikey 390×844 | 1.000 | 119 / 3 |
| telefon yatay 844×390 | 0.719 | 119 / 3 |
| tablet dikey 820×1180 | 1.933 | 119 / 3 |
| tablet yatay 1180×820 | 1.381 | 119 / 3 |
| masaüstü 1600×900 | 1.584 | 119 / 3 |

Yalnızca yatay telefonda sabit sayfa kağıda sığmıyor ve `.kagit-ic`
kaydırılabiliyor — bugün de var olan emniyet supabı. Alternatifi okunmayacak
kadar küçük bir yazıydı.

Üst sınır önce 1.75 kondu; tablet dikeyde 2.01 isteyip sınıra dayanınca
sayfanın üçte biri boş kalıyordu. Görüntüye bakıp 2.05'e çekildi ve sayfa
doldu. Sayı gözle seçildi, hesapla değil — ve nedenini yazmak gerekiyor:
ölçek sınırı bir okunabilirlik kararı, bir formül değil.

### Yan kazanç: pencere boyutu artık sayfaları kaydırmıyor

Sayfalama ölçüm almadığı için `olcVeYenile` yeniden akıtma tetiklemiyor.
Eskiden pencereyi yeniden boyutlandırmak sayfa numaralarını kaydırıyordu.

### Sabitleri dondurmak eski bir kuralın çiğnendiğini ortaya çıkardı

Ürünün kuralı: bir ek sayfanın yarısından fazlasını yiyemez
(`test/ek.test.ts`). Ölçülen değerlerle 56 + 222 = 278, yani 444'lük sayfanın
%63'ü. Kural bugüne kadar yalnızca demo sabitlerine karşı sınanıyordu;
cihazların GERÇEKTEN kullandığı değer onu çiğniyordu ve hiçbir yerde
görünmüyordu. Sabitler dondurulunca test ısırdı ve `ekTavan` 160'a çekildi.

Ders: bir testin sabitleri üretimin sabitleri değilse, test kendi kurgusunu
sınıyor demektir.

### Muhafızlar

Birim: sayfa ölçüsü dondurulmuş değerlerde ve ek sayfanın yarısını geçmiyor;
`test/sayfa.test.ts`teki bağımsız referans akış artık `SABIT_OLCU`yu izliyor
(sihirli sayı kalmadı).

Tarayıcı (`serim` aşaması, yeni **3b** adımı): aynı tohumlu defter dört
ölçüde açılıyor ve sayfa/cilt sayısı dördünde de aynı olmak zorunda; ayrıca
ölçeklerin birbirinden ayrıştığı (uçlar arası oran > 1.5) sınanıyor — hepsi 1
çıksaydı ölçekleme hiç çalışmıyor demekti. Ölçeği sabit 1 yapınca ikinci
iddia düşüyor (`1 · 1 · 1 · 1`), sayfa sayıları ise geçmeye devam ediyor:
iki muhafız gerçekten ayrı şeyleri ölçüyor.

### İlk iki kırma denemem HİÇBİR ŞEYİ KIRMADI

Muhafızı "ölçümü yeniden sayfalamaya bağla" diye kırmayı denedim ve deneme
GEÇTİ. İki kez. Sebep her ikisinde de aynıydı: ölçüm sayfalamaya gerçekten
ulaşmıyordu.

  1. Ölçülen değeri `window`a yazıp `yenile()`de okudum — ama `yenile()`
     çizimden ÖNCE koşuyor, o an değer henüz yazılmamış.
  2. Doğrudan `.kagit-ic`ten ölçtüm — ama sayfalama koşarken o düğüm daha
     DOM'da yok.

Eski mimarinin cihaza bağlılığı tek bir satırdan değil, **sıradan**
geliyordu: ölç → yeniden akıt → çiz. Üçüncü denemede `olcVeYenile`ye o
ikinci akıtmayı geri koydum ve sayılar ayrıştı: 115 / 114 / 111 / 114, üç
iddia düştü.

Ders K-047'nin üçüncü tekrarı, bu sefer kendi kırma denememde: bir kırma
denemesi geçiyorsa önce "gerçekten kırdım mı" diye sormak gerekiyor. Geçen
bir kırma denemesini muhafızın zayıflığına yormak, iki kez yanlış cevap
verirdi.

### Kabul edilen bedeller

- Var olan defterler bir kez yeniden aktı; sayfa numaraları değişti.
  Kapanmış cilt özetlerindeki numaralar eskidi (kullanıcı onayladı).
- Büyük ekranda yazı belirgin büyüyor (masaüstünde 1.58×). Seçilen tasarım
  bu; alternatifi sayfanın yarısının boş kalmasıydı.

### Doğrulama

662 test; `serim` · `hepsi` · `pwa` aşamaları. Dört ölçüde görüntü alınıp
bakıldı.

---

## 2026-09-04 · K-050 · Açık defter: yan yana iki sayfa, ince cilt, ve ekranın kullanılması

Kullanıcı defterin daha çok defter gibi durmasını istedi ve masaya açılmış,
yan yana iki sayfalı bir günlük görseli verdi. Üç iş: **serim** (aynı anda iki
sayfa), **ince cilt kenarı**, ve **tablet/masaüstünde boşa duran alan** —
`#kagit-kap` 680 px'e kilitliydi ve 1600 px'lik bir ekranda defter, iki yanı
bomboş bir şerit olarak duruyordu.

Telefonda dikey tek sayfa, yatayda iki sayfa; kararı kullanıcı verdi. Arka
plan yalnızca tazelendi: masaya nesne, fotoğraf ya da doku görseli
KONULMADI — PROJE.md §4'ün "tek aydınlık yüzey sayfadır" kuralı duruyor.

### Kaç sayfa gösterileceğine JS karar veriyor, CSS değil

Yalnızca medya sorgusuyla verilseydi ölçüm katmanı kaç sütun çizildiğini
bilmezdi: sayfa kapasitesi kağıdın GERÇEK genişliğinden çıkıyor (K-014). Tek
sütun ölçüp iki sütun çizmek sayfayı sessizce taşırırdı. `ekran/olcum.ts`
karar veriyor, gövdeye sınıf koyuyor, CSS ona bakıyor.

### Sabit en-boy oranı iki uçta da yanlıştı

İlk hâlde defterin oranı sabitti (serimde 1.48). Ölçtüm:

| ekran | sabit oranla | kutudan türeyen oranla |
|---|---|---|
| masaüstü 1600×900 | 1114 px | **1295 px** |
| tablet 1180×820 | 996 px | **1070 px** |
| yatay telefon 844×390 | 389 px | **734 px** |

Sabit oran yüksekliğe bağlı olduğu için alçak ekranda defteri küçültüyor,
geniş ekranda ise kutuyu doldurmuyordu. Oran artık kutunun kendi oranından
çıkıyor, kitaba benzemeyi bırakmasın diye sınırlanıyor — ve sınır sayfayı
320 px'in altına indirecekse kalkıyor: "kitap gibi dursun" demek "okunamasın"
demek değil.

### Sayfa çevirme animasyonu HİÇ ÇALIŞMIYORMUŞ

Kod duruyordu: klon `#kagit-kap`a ekleniyor, hemen ardından `ciz()`
çağrılıyordu — ve `ciz()` kabın bütün içeriğini yeniden yazıyor. Klon daha
ilk karede siliniyordu. Klon artık çizimden SONRA konuyor ve hareket
gerçekten görünüyor. Serimde çevrilen şey defterin tamamı değil tek bir
yaprak: ileri giderken sağ sayfa sırtın etrafında sola, geri giderken sol
sayfa sağa.

### `aktifSayfa` artık bir ayarlayıcı

İki sayfalı serimde tek sayılı bir indeks etkin olursa çizim o sayfayı sola
koyar ve bir öncekini hiç göstermez. Değer üç ayrı yerden yazılıyor ("bugüne
dön", kayıt bırakma, `yenile()` kırpması); normalleştirmeyi çağıranlara
bırakmak birini unutmak demekti. Tek yer: `Durum.aktifSayfa` ayarlayıcısı,
`cekirdek/sayfa.ts` · `serimBasi()` ile.

### Serimin ortaya çıkardığı gerçek kusur: yazdığın şey görünmüyordu

Yazma alanı son sayfanın altında duruyor. Bir kayıt sayfayı TAM doldurunca
alan bir sonraki sayfaya taşıyor ve son sayfada yalnızca o alan kalıyor.
`bırak`tan sonra `aktifSayfa = sonSayfa` deniyordu — yani kullanıcı "bırak"a
basıyor ve yazdığının GÖRÜNMEDİĞİ bir sayfaya bakıyordu. Tek sayfada bir
sayfa, serimde bütün bir serim geride kalıyor.

Artık bırakılan kaydın DURDUĞU sayfaya gidiliyor. Olağan durumda kayıt zaten
son sayfada ve hiçbir şey değişmiyor — kalem de yerinde kalıyor. Sayfa tam
dolduğunda kullanıcı yazdığını görüyor; karşılığında kalem o karede görünen
serimde olmuyor ve devam etmek için "bugüne dön" gerekiyor. İkisinden birini
seçmek gerekiyordu: **basılan düğmenin bir şey yaptığını görmek** daha ağır
bastı.

### Alçak ekranda sayfa sayısının şişmesi

Yan çevrilmiş telefonda (844×390) üst şerit, defter adı ve araç çubuğu 174 px
yiyordu; kağıda 216 px kalıyordu. Sonuç ölçüldü: aynı defter masaüstünde 70,
orada **693** sayfa — ve "defterin doldu" diyor. Alçak ekran için sıkı bir
yerleşim eklendi (kısa üst şerit, tek satırda kayan araç çubuğu, dar
boşluklar) ve sayı **389**'a indi.

**Kalan fark kapanmadı ve kapatılmadı.** Sayfa sayısının cihaza göre değişmesi
ölçüme dayalı sayfalamanın doğal sonucu (K-014) ve bu değişiklikten önce de
vardı — tablet dikeyde 44, telefon dikeyde 119 sayfa. Bunu tümden çözmek
"cilt sınırı cihazdan bağımsız olmalı mı" sorusunu açar ve o bir ürün kararı;
burada ölçüp yazıldı, çözülmedi.

### Muhafızlar

Birim (`test/serim.test.ts`): `serimBasi` ve `aktifSayfa` normalleşmesi.
**Kırma denemesi:** normalleştirmeyi kaldır → tek sayılı son sayfada iki test
düşüyor.

Tarayıcı (yeni `serim` aşaması): geniş ekranda iki kağıt ve `.cilt` ≥ 900 px,
dar ekranda tek kağıt, çevrilen yaprağın SAHNEDE olması, ve iki sayfalı kipte
yazmanın çalışması. **Kırma denemeleri:** serimi 1'e sabitle → üç iddia
düşüyor (genişlik 620 px'e iniyor); klonu yine `ciz()`ten önce ekle →
çevrilen yaprak iddiası düşüyor.

Göz kontrolü ayrıca yapıldı: dört ölçüde ekran görüntüsü alınıp bakıldı. Test
geçmesi "iyi duruyor" demek değil.

### Doğrulama

662 test; `serim` · `hepsi` · `pwa` aşamaları. Kırma denemeleri yukarıda.

---

## 2026-09-03 · K-049 · Ana ekrana kurulabilir defter — ve servis işçisinin neyi ASLA almadığı

Kullanıcı "PWA olarak indirilebilir bir uygulama olsun" dedi. Eksik olan şey
göründüğünden azdı: defterin kendisi zaten cihazda (OPFS + SQLite) ve
çevrimdışı çalışıyordu; **açılamayan tek şey kabuğun kendisiydi.** Tarayıcıda
ağ yokken sayfa hiç gelmiyordu.

### Ne eklendi

`public/manifest.webmanifest`, üç ikon + iOS ikonu (`arac/ikonUret.mjs` ile
üretiliyor — elle çizilen bir PNG bir daha üretilemez), `src/sw.js` ve
`src/pwa.ts`. Varlık listesini `vite.config.ts`teki küçük bir eklenti
derleme çıktısından yazıyor: elle tutulan bir liste ilk kaçırdığı dosyada
uygulamayı çevrimdışı bozardı.

**Workbox alınmadı.** Yapılan iş bir dosya listesi ve üç kural. Bir üretici
eklemek K-036'nın kazandığı şeyi — "metnim nereye gidiyor" sorusunun tek
dosyada cevaplanabilmesini — geri verirdi.

### Neyin önbelleğe ALINMADIĞI, bir ilke

`/auth`, `/rest` ve `/api` işçiye **hiç uğramıyor**: `respondWith`
çağrılmıyor, tarayıcı doğrudan ağa gidiyor. Bir senkron yanıtının önbelleğe
düşmesi, kullanıcının şifreli defterinin diske ikinci bir kopyasının çıkması
demek olurdu (PROJE.md · 2.3). Başka kaynaklar da alınmıyor — gömü modeli
CDN'den iniyor ve ~145 MB (K-029).

Bu, yorumda kalamayacak kadar önemli: `test/senkronGizlilik.test.ts` artık
bunu sabitliyor.

### Gizlilik taramasındaki delik

O tarama "ağa çıkabilen dosyaların TAM listesi"ni sabitliyordu ama yalnızca
`.ts` uzantısına bakıyordu. `src/sw.js` görünmez olurdu — ve o dosya
ekleyebileceğimiz **en ağ dokunaklı kod**: sayfanın yaptığı her isteği
görüyor ve istediğini diske yazabiliyor. Tarama `.js`yi de kapsıyor artık;
liste dört dosya oldu.

Bakmadığı bir uzantı varken "tam liste" demek, listenin kendisinden daha
tehlikeliydi.

### Kabuk NEDEN önce ağdan

Gezinme isteği önce ağa gidiyor, ağ yoksa önbellekteki kabuk veriliyor.
Tersi olsaydı yayınlanan bir düzeltme kullanıcıya ulaşmazdı — K-048'de tam
olarak bunun bedeli ödendi. Aynı sebeple `skipWaiting` + `clients.claim`:
beklemek "bütün sekmeler kapanana kadar eski sürüm" demek.

### `Vary: Origin` — ve tarayıcı aşamasının varlık sebebi

Bütün birim testleri geçerken çevrimdışı açılış ÖLÜYORDU. Sebep:
sunucu varlıkları `Vary: Origin` ile veriyor; `addAll` kurulumda `Origin`
başlığı olmadan istiyor, sayfa ise aynı dosyayı `crossorigin` ile (Vite
modül betiklerine ve stil dosyasına onu koyuyor) yani `Origin` başlığıyla
istiyor. İki istek eşleşmiyor, `caches.match` boş dönüyor, ağ yokken CSS ve
JS düşüyor: kabuk geliyor ama uygulama açılmıyor. Çözüm `ignoreVary: true`,
ve burada güvenli — önbellekte yalnızca kendi çıktımız var, her adresin tek
karşılığı bulunuyor.

**Bunu hiçbir birim testi yakalayamazdı.** `arac/muhurDenemesi.mjs`teki yeni
`pwa` aşaması yakaladı: ağı kesip defterin açılmasını, sqlite wasm'ın
inmesini ve kaydın yerinde durmasını istiyor.

### Üç muhafız da kırılarak sınandı — ve ikisi ilk hâlinde kusurluydu

- İkon boyutu yalan söylesin → düştü. (`sizes` bir iddia, PNG'nin IHDR'si
  gerçek. Ayrışırsa Chrome ikonu reddediyor ve kurulum düğmesi hiç
  çıkmıyor; hiçbir yerde hata görünmüyor.)
- `/auth` `/rest` geçilmesin → düştü. Kabuk önce önbellekten gelsin → düştü.
- Servis işçisi hiç kurulmasın → `pwa` aşaması düştü.

İki kusur kendi muhafızımdaydı:

1. **Donan muhafız.** İşçi kurulmayınca `navigator.serviceWorker.ready`
   reddetmiyor, sonsuza kadar bekliyor: aşama düşmek yerine asılı kaldı.
   Donan bir muhafız, olmayan bir muhafızdan beter — hangi tarafın haklı
   olduğu hiç öğrenilmiyor. Süre kondu.
2. **Boş muhafız.** "Ağ dönünce kabuk için istek çıktı" diye ölçüyordum;
   Playwright işçinin ÖNBELLEKTEN verdiği isteği de bildiriyor, yani kırma
   denemesinde de geçiyordu. Ölçüm artık dolaylı değil: önbellekteki
   kabuğun yerine sahte bir sayfa konuyor ve o sayfa ekranda GÖRÜNMEMELİ.

K-047'nin dersi üçüncü kez: bir muhafız geçiyorsa neyi ölçtüğünü de sormak
gerekiyor.

### Kararsız bir iddia da düzeltildi

"Çevrimdışı: kayıt yerinde duruyor" ara sıra düşüyordu. Sebep üründe değil
denemede: mühür borçlandırmalı yazılıyor (K-037) ve 1,5 saniye beklemek
bazen yetmiyordu. Ölçülen şey mühür zamanlaması değil ağsız açılış; bekleme
uzatıldı.

### Cihazda kurulmuyor

Capacitor kabuğunda varlıklar zaten pakette; araya bir önbellek katmanı
koymak yalnızca bir sürüm uyuşmazlığı kaynağı olurdu.

### Doğrulama

655 test; `pwa` aşaması art arda iki temiz koşu; `hesap` · `kasa` · `cikmaz`
· `hepsi`. Kırma denemeleri yukarıda.

---

## 2026-09-03 · K-048 · Su seviyesi hesaba özgüdür — ve atladığını söylemek zorundadır

Kullanıcı: *"bilgisayarda kayıt ettiğim yazılar defterden girince gözükmüyor
ama defterde yazdığım şey pc'de görünüyor."* İki tarayıcı, aynı hesap, aynı
şifre. **İtme çalışıyor, çekme çalışmıyor.**

Neon ve Vercel kayıtları arızayı üç adımda daralttı: ikinci cihaz hesaba
giriyor (`POST /auth/sign-in/email` 200), jeton alıyor, **iki
`GET /rest/defter_blob` yapıyor ve 200 alıyor.** Yani ağ, kimlik, RLS ve şifre
çözme suçsuz. Cihaz o satırları **istemiyor**.

### Sebep: `senkron.sonGorulen` iki ayrı yerde yalan söylüyor

Bu ayar, sunucudaki `defter_blob.surum` akışındaki konum: "bundan büyüğünü
görmedim". Sayıyı sunucu atıyor ve `defter_surum_dizi` **bütün hesaplar için
tek dizi** — yani bu sayı yalnızca TEK BİR hesabın akışında anlamlı.

**1 · Seviye hesaba bağlı değildi.** `hesabaTasi` sıfırlıyordu; `giris` ve
`ac` yollarının kullandığı `defteriKodla` sıfırlamıyordu. Başka bir hesapta
6'ya çıkmış bir cihaz, satırları 2–4 olan bir hesaba girince hiçbir şeyi
"yeni" saymıyor. Ama kendi yazdığını itiyor ve itilen satır YENİ, yüksek bir
sürüm aldığı için karşı taraf onu görüyor. Bildirilen asimetrinin birebir
kendisi.

**2 · Atlanan satır "görüldü" sayılıyordu.** Çözülemeyen zarf `continue` ile
geçiliyor, seviye ise çekilenlerin sonuncusuna taşınıyordu. Sunucudaki `surum`
bir daha değişmediği için o satır o cihazın çekme akışından **kalıcı olarak**
düşüyor: başka bir Defter Kimliği'yle şifreli bir satır bir kez indiyse, doğru
koda geçildikten sonra bile geri gelmiyor.

**3 · İkisi de sessizdi.** `SenkronDurum` yalnızca itilecekleri sayıyordu.
Ne indiği, kaç satırın açılamadığı, seviyenin kaç olduğu hiçbir yerde
görünmüyordu — ne ekranda ne konsolda. K-042'nin kuralı ("ayrı durumları tek
sessiz cevaba katlama") çekme tarafında hiç uygulanmamış. Arızanın dışarıdan
teşhis edilememesinin sebebi bu; **hangi kusurun ateşlendiğini bugün hâlâ
kesin bilmiyorum**, çünkü cihaz hiçbir iz bırakmıyor.

### Kural

**Su seviyesi HESABA özgüdür, yalnızca hesap edilmiş satırın üstüne çıkar, ve
edemediğini SÖYLER.**

`senkronKurulum.ts` · `suSeviyesiniDenkle`, senkron kurulmadan önce koşuyor ve
hesap değiştiyse seviyeyi sıfırlıyor. Dört yol da (giriş, hesap aç, buluta
taşı, açılış) `senkronuKur`dan geçtiği için tek yerde duruyor; `hesabaTasi`'daki
elle sıfırlama kaldırıldı — ikinci bir doğruluk kaynağı olurdu.

Çözülemeyen satırda seviye **yine ilerliyor**. İlerlememek çare değil:
gerçekten yabancı tek bir satır senkronu sonsuza kadar kilitlerdi. Doğru
davranış ilerleyip söylemek — `durum.okunamayan` sayıyor, ayar kağıdı
gösteriyor.

### Sayının kendisi de sessiz kalıyordu — bellekte tutulunca

İlk hâlde `okunamayan` her tur başında sıfırlanıyordu. Boştaki bir defterde
tur hep boş dönüyor, yani kullanıcı ayar kağıdını açtığında ekranda **0**
görünürdü: sessizce atlamayı bitirmek için eklenen satırın kendisi sessiz
kalırdı. Sayı artık `ayar`da (`senkron.okunamayan`) duruyor, yalnızca
GERÇEKTEN satır indiren turda yazılıyor ve yeniden yüklemeden sonra da
görünüyor. "Baştan indir" onu sıfırlıyor — yeni çekmede yeniden ölçülecek,
eskisini taşımak yalan olurdu.

### Bir kerelik onarım, çünkü hesap karşılaştırması yetmiyordu

Arıza ateşlenmiş cihazlarda hesap DEĞİŞMİYOR. Yalnızca karşılaştırma koysaydım
kullanıcının telefonu olduğu yerde kalırdı. `senkron.tamCekim.1` damgası,
düzeltmeyi ilk gören her cihazda defteri bir kez baştan indiriyor. Tekrar
çekmek zararsız: `catismaKarari` aynı içeriği "yerel" diye geçiyor ve yerelde
daha yeni olan ezilmiyor.

Ayrıca ayar kağıdına **"defteri baştan indir"** düğmesi kondu. Bugüne kadar
seviyesi yanlış yerde takılan bir cihazı kullanıcının düzeltmesinin **hiçbir
yolu yoktu**; damga bir kereye mahsus, düğme kalıcı.

### Muhafızlar ve dürüst bir sınır

Birim tarafında üç kırma denemesi de düştü: seviye sıfırlanmasın (2 test
düştü), hesap karşılaştırması kalksın (1), `okunamayan` sayacı geri alınsın
(2).

Tarayıcı tarafına `hesap` aşamasının **4b** adımı eklendi: ikinci cihazda
yazılan kayıt birinci cihazda görünmek zorunda. Buraya kadar yalnızca tek yön
ölçülüyordu — iki yönlü olduğu varsayılan bir şeyin yarısı hiç sınanmamıştı.

**Dürüst sınır — iki tane:**

1. 4b, K-048'in düzeltmesini kırarak düşürülemiyor. Arıza bayat bir su seviyesi
   gerektiriyor ve o sayı OPFS'teki SQLite'ın içinde; sayfadan erişilemiyor.
   K-048'in asıl kırma denemesi birim testlerde. Zayıf bir tarayıcı muhafızı
   uydurmaktansa nerede durduğunu yazmak doğru.
2. 4b'yi "çekmiş cihaz artık itmiyor" arızasıyla kırdım; düştü — ama **aynı
   kırma 4. adımı da düşürdü.** Yani 4b'nin gerçekten dördüncü adımın
   ötesinde bir şey yakaladığını gösteren bir deneme elimde YOK. 4b bugün
   ters yönün gerileme muhafızı; K-047'nin dersini kendi muhafızıma
   uygulayınca ancak bu kadarını iddia edebiliyorum.

### Ölçümün kendisi de iki yerde bozukmuş

4b eklenince `hesap` aşamasında iki adım düştü ve ikisi de **üründe değil
ölçümde** kusurluydu:

- "senkron sunucuya hiç dokunmadı" — sayaç anlık alınıyordu ve önceki adımdan
  kalan bir istek bu adıma yazılıyordu. Artık sayaç kımıldamayana kadar
  bekleniyor.
- "gösterilen boyut sunucudakiyle uyuşuyor" — `%10` toleransı küçük defterlerde
  yanlıştı (ekran tam KB'ye yuvarlıyor: 1252 B → "1 KB"), üstelik `blobBayt`
  sunucudaki BÜTÜN hesapların toplamı olduğu için ikinci koşuda ikiye
  katlanıyordu. Artık bu koşunun farkı ölçülüyor ve karşılaştırma ekranın kendi
  biçimlendirmesiyle birebir.

K-047'nin dersinin devamı: bir muhafız geçiyorsa **neyi ölçtüğünü** de sormak
gerekiyor.

### Doğrulama

644 test; `hesap` aşaması 17 ✓; `kasa`, `cikmaz`, `hepsi`. Kırma denemeleri yukarıda.

## 2026-09-03 · K-047 · Bir kaynakta iki kimlik olamaz — sonucu rastgeleleştiren yarış

Kullanıcı aynı şifreyle bir denemede **"kasan görünmüyor"**, bir saat sonra
**"kasa açılamadı"** aldı. Sunucu durumu ikisinin arasında değişmedi, yeni hesap
açılmadı. Aynı hesap, aynı şifre, farklı cevap — mantık hatası değil, **yarış**.

### Sebep: K-043'te bıraktığım geri düşüş

```ts
const oturumKimligi = (await hesapKimligiOku()) ?? kimlik
```

Hesap kimliği cihazda yoksa senkron **koddan türeyen kimliğe** düşüyordu. O
cihazda `Kasa` bir kimlikle, `SenkronDepo` başka bir kimlikle oturum açıyor.

**Çerez kavanozu KAYNAĞA ait, tek tane.** K-043'te her `Oturum`un ilk jetondan
önce kendi oturumunu açmasını sağlamıştım — doğruydu, ama iki nesne farklı
kimliklerle açınca birbirinin çerezini eziyor. Kasa giriş yapıyor, senkron
araya girip oturumu değiştiriyor, kasanın `GET`i BAŞKA hesap olarak koşuyor →
RLS boş döndürüyor → "kasan yok". Yarış ters yönde gidince satır geliyor →
"kasa açılamadı".

K-043'ün eksiği şuydu: oturumu kimliğe bağladım ama **aynı anda iki kimliğin
var olamayacağını** kabul etmedim. Tek çerez, tek kimlik.

### Düzeltme

Geri düşüş kaldırıldı: hesap kimliği yoksa **senkron hiç kurulmuyor**. Defter
yerelde açılmaya devam ediyor, kullanıcı ayarlardan hesabına bağlıyor
(`hesapli()` artık kod + kimlik demek olduğu için o düğme görünüyor).

### Muhafızın ilk hâli boştu — ve sebebi öğretici

İlk iddiam "hesap kimliği yokken YENİ hesap açılmamalı" idi. Kırma denemesinde
**geçti**: hesap açmayı zaten bir önceki düzeltme (`yarat = false`) engelliyor.
Yani doğru bir cümleyi ölçüyordum ama YANLIŞ değişikliğin muhafızıydı — geri
düşüş dursa da geçiyordu.

Geri düşüşün asıl bedeli hesap açmak değil, **denemek**: koddan türeyen
kimlikle oturum açmaya çalışmak, 401'ler, çerez kavgası. Ölçülmesi gereken şey
o. Yeni iddia: hesap kimliği yokken senkron **sunucuya tek istek bile
atmamalı**. Kırma denemesinde 2 istek görünüp düşüyor, düzeltmeyle 0.

Ders K-040'ın bir adım ötesi: bir muhafız kırıldığında düşmeli — ama **hangi
değişikliği kırdığında**? Doğru cümleyi ölçüp yanlış şeyi koruyabiliyor.

### Bu, kasanın bozukluğunu çözmüyor

K-046'daki asıl arıza duruyor: `9e93f72e`nin kasası, o hesabın şifresinden
başka bir şifreyle şifreli. Bu düzeltme yalnızca sonucun rastgele olmasını
bitiriyor. Çıkış yolu aynı: defteri parolayla aç, ayarlardan **farklı** bir
şifreyle hesaba bağla.

### Doğrulama

637 test; `hesap` (15 ✓), `kasa`, `cikmaz`, `hepsi`. Muhafız iki yönde de
sınandı.

---

## 2026-09-02 · K-046 · Kasa yanlış şifreyle şifrelenmiş — ve bir mesajın olmayan kapıyı göstermesi

Kullanıcı "Kasa bulundu ama bu şifreyle açılamadı" alıyordu. Üç denemede de
`sign-in` **200**, `token` 200, `GET /rest/defter_kasa` 200 — yani şifre hesaba
uyuyor, kasa geliyor, açılmıyor.

`hesapKimligiTuret` e-postayı, auth parolasını ve şifreleme anahtarını **tek
bir Argon2 kökünden** türetiyor. Giriş başarılıysa anahtarın da doğru olması
ZORUNDA. Değilse tek açıklama kalıyor:

**Kasa, sahibi olan hesabın şifresinden BAŞKA bir şifreyle şifrelenmiş.**

### Nasıl olmuş

- **06:09** — `hesapAc(ad, P1)`. Hesap açıldı; kasa POST'u 403 aldı (K-041).
  Hesap P1'e ait, kasa yok.
- **06:27** — kullanıcı `hesapAc(ad, P2)` yaptı. O günkü `jwt()` ortalıktaki
  çerezi kullanıyordu (K-043'ün düzelttiği hata): **P2 ile oturum hiç
  açılmadı.** Kasa, P1'in hesabının altına yazıldı ama **P2'nin anahtarıyla**
  şifrelendi.

K-043 sebebi kapattı. O gün yazılan satır bozuk kaldı: P1 ile giriliyor, kasa
geliyor, P2 gerekiyor.

Üç kararın birbirine değdiği yer burası. K-042'nin "açılamayan kasanın üstüne
yazma" muhafızı **doğru davrandı** — üstüne yazsaydı defteri açan kod kalıcı
olarak giderdi. Ama doğru davranmak kullanıcıyı kilitli bıraktı; muhafız tek
başına yetmiyor, yanında bir çıkış yolu gerekiyor.

### Asıl ders: mesaj var olmayan bir kapıyı gösteriyordu

K-042'de yazdığım metin şunu diyordu:

> "…elinde Defter Kimliği varsa onunla da girebilirsin."

**Öyle bir yol yok.** Karşılama ekranında üç düğme var: giriş yap, hesap aç, bu
cihazda kal. Kod girme yolu K-039'da kaldırılmış. Mesajı yazarken arayüzde o
yolun DURUP DURMADIĞINA bakmamışım.

Kural: **bir hata mesajı, var olduğunu doğrulamadığım bir yolu öneremez.**
Kodun ne yaptığını kırma denemesiyle sınıyorum; mesajın ne vaat ettiğini de
aynı gözle okumak gerekiyor. Yanlış yönlendiren bir mesaj, sessiz kalan bir
mesajdan kötü.

Metin düzeltildi: kasanın üstüne yazılmadığını söylüyor (doğru ve önemli) ve
gerçek çıkışı gösteriyor — defter cihazda açılıyorsa parolayla aç, ayarlardan
BAŞKA bir şifreyle hesaba bağla.

### Çıkış yolu neden işe yarıyor

Cihaz sağlam: defter de Defter Kimliği de orada, kasaya ihtiyaç yok. Ayarlardan
"hesap aç ve buluta taşı" **farklı** bir şifreyle çağrılınca temiz bir hesap ve
DOĞRU bir kasa yaratılıyor, defterin tamamı oraya yükleniyor. Aynı şifre
kullanılırsa `hesapAc` bozuk kasayı bulup — doğru davranışla — reddediyor.

### Kalan çöp

Sunucuda iki işe yaramaz şey var: bozuk kasa satırı ve koddan türeyen ikinci
hesabın altındaki kopya (K-043'ün yarattığı). Kullanıcının defteri yeni hesapta
göründükten SONRA, izin alınarak silinecek.

---

## 2026-09-02 · K-045 · Kullanım sayımı sunucuya taşındı — ve `invoker` neden şart

K-044 kullanım isteğinin SIKLIĞINI düşürmüştü; isteğin kendisi hâlâ pahalıydı:

```ts
this.istek('/defter_blob?select=govde', { headers: { Prefer: 'count=exact' } })
```

Ayar kağıdındaki "Defterin **N** satırı sunucuda (~X)" tek satırı için defterin
**bütün şifreli gövdeleri** iniyordu. Yıllık bir defterde ayarları her açış tüm
defteri çekmek demek.

`count=exact` satır sayısını bedavaya veriyor ama bayt toplamı için sunucuda
toplamak gerekiyor. O yüzden küçük bir RPC: `defter_kullanim()`.

### `security invoker` — varsayılan, ve burada şart

`definer` olsaydı fonksiyon sahibi olarak koşardı; sahip `neondb_owner` ve onun
`rolbypassrls` özniteliği var. Yani RLS atlanır ve fonksiyon **herkesin
satırlarını** sayardı — kullanıcıya başkasının defterinin boyutunu gösteren bir
sızıntı.

`defter_kim()` (K-041) tanımlayıcı olmak ZORUNDAYDI, çünkü `auth` şemasına
dokunuyor ve `authenticated` oraya giremiyor. Buradaysa öyle bir ihtiyaç yok:
fonksiyon yalnızca `defter_blob`u okuyor ve RLS'in uygulanması tam olarak
istenen şey. **İki fonksiyon, iki ayrı sebep; ikisini aynı kalıba sokmak
yanlış olurdu.**

Doğrulaması da bunu gösteriyor — ve tahminim yanlış çıktı. "Sahip olarak
çağırınca 0 satır dönmeli, bu invoker'ın kanıtı" diye yazmıştım; **4 döndü**,
çünkü `neondb_owner` RLS'i zaten atlıyor (`rolbypassrls = true`). Gerçek sınav
`authenticated` rolüyle koşmak:

```sql
set local role authenticated;
select * from defter_kullanim();   -- satir 0, bayt 0
```

JWT yokken 0 — yani RLS fonksiyonun İÇİNDEN de uygulanıyor. `definer` olsaydı
burada 4 görünürdü. Ayrıca `prosecdef = false` ve `anonymous` çalıştıramıyor.

### Yolda kapanan bir hata

Eski istemci kodu `s.govde.length` topluyordu. `defter_blob.govde` **null
olabiliyor**: silme mezar taşları alanları boş zarflar. Böyle bir satır gelince
`TypeError` atardı ve kullanım okuması düşerdi. Canlıda henüz silme olmadığı
için görülmemişti. RPC `coalesce` ile sayıyor.

### Muhafız iki kez düzeltildi

Ölçülen şey "hangi adrese gidildi" değil, **ayarları açmanın ağdan ne
indirdiği**.

İlk sürüm yalnızca `/rest/rpc/defter_kullanim` yolunun baytını sayıyordu. Kırma
denemesinde eski kod BAŞKA bir yola gidiyor, o sayaç 0 kalıyor ve "yanıt küçük"
iddiası kendiliğinden geçiyordu — muhafız yine boş. Toplam bayta çevrildi.

İkinci hata birim körlüğüydü: "40 KB'lık kayıt bırak, gösterilen sayı 30 000'i
geçsin" diyordu ama `"880 B"` metninden yalnızca `880` okunup eşiğe
bakılıyordu. Kayıt hiç yazılmayınca bile geçiyordu. Şimdi birimle çarpılıyor ve
karşılaştırma sunucunun KENDİ toplamıyla — defterin büyüklüğüne bağlı bir eşik
yok.

| | ayarları açmak |
|---|---|
| Önce | **1025 B** indi |
| Sonra | **24 B** |

### Doğrulama

637 test; `hesap` (13 ✓), `cikmaz`, `kasa`, `hepsi`. Neon'da RPC uygulandı ve
`authenticated` rolüyle sınandı.

Buradan sınayamadığım tek şey: PostgREST'in fonksiyonu `/rpc/` altında
YAYIMLADIĞI. `*.neon.tech` bu ortamda engelli; ayarlar kağıdında sayı görünürse
yayımlanmış demektir.

### Açık uç — bu kararın dışında

Muhafızı yazarken 40 000 karakterlik bir kayıt denedim: alan metni kabul etti
ama kayıt ne ekrana düştü ne sunucuya gitti. Küçük kayıtlar sorunsuz. Çok uzun
kayıtlara ne olduğu ayrıca bakılacak.

---

## 2026-09-02 · K-044 · "Koştu" ile "değişti" aynı değer değil — kendini besleyen senkron

Vercel kaydında senkron ~5 saniyede bir istek atıyordu ve defter açık kaldığı
sürece durmuyordu. K-041'in sonuna "arıza değil, ayrıca bakılacak" diye
yazmıştım. Bakınca arıza çıktı.

```
durum.dinle        → senkronuBorclan()        (4 sn)
  → senkronTur()   → calistir() → true        ← HER SEFERİNDE
  → durum.yenile() → dinleyicileri uyarır
  → durum.dinle    → senkronuBorclan()        → başa dön
```

`calistir()`in dönüşü **"hata almadan koştu"** demekti; `ana.ts` onu
**"bir şey değişti"** diye okuyup `durum.yenile()` çağırıyordu. `yenile()` de
koşulsuz olarak dinleyicileri uyarıyor, dinleyici senkronu yeniden
borçlandırıyordu. Hiçbir şey değişmezken bile dönen bir çark.

Sayfa görünürlükten çıkınca duruyordu — gözden kaçmasının sebebi bu.

### Bir dönüş değeri iki soruyu cevaplayamaz

Düzeltme, `calistir()`in boolean'ını değiştirmek DEĞİL: o anlam
(`test/senkronAkis.test.ts`) sabitlenmiş durumda ve doğru. İkinci soru ayrı bir
alana taşındı: `sonTurDegisti`. `cek()` uyguladığı satırı, `it()` gönderdiği
satırı sayıyor; ikisi de sıfırsa ekran tazelenmiyor, çark dönmüyor.

İki soruyu tek değere bindirmek K-042'nin aynısıydı: orada `null` dört ayrı
durumu anlatıyordu, burada `true` iki ayrı şeyi. **Bir değerin kaç soruya
cevap verdiğini saymak gerekiyor.**

### İkinci masraf: her tur bütün defteri indiriyordu

`senkronTur` her turdan sonra `kullanim()` çağırıyordu; o da
`/defter_blob?select=govde` ile **bütün satırların şifreli gövdesini**
indiriyordu — yalnızca ayarlar kâğıdındaki satır sayısı ve boyut için. İki
kayıtta görünmez, yıllık defterde her turda tüm defterin inmesi demek.

Artık ayarlar açılınca ve sayının gerçekten değiştiği anlarda (hesaba taşıma,
elle eşitleme) isteniyor. İsteğin kendisi hâlâ gövdeleri indiriyor; sıklığı
düştü, maliyeti durmuyor. Gövdesiz sayım (`count=exact` + `limit=0`) mümkün
ama boyut sunucudan ücretsiz gelmiyor; ayrı ele alınacak.

### Muhafız: sayıyla ölçülüyor

`hesap` aşamasına 6. adım: defter açık, **20 saniye hiçbir şey yapmadan bekle**,
sahte sunucuya gelen istek sayısına bak.

| | istek |
|---|---|
| Düzeltmeden önce | **10** |
| Düzeltmeden sonra | **1** |

Kırma denemesi bu kez tek satır: `durum.yenile()`i koşulsuz hâle getir, sayı
10'a çıkıyor. Sayı ölçen bir iddianın boş çıkması zor — bu oturumdaki
muhafızların en sağlamı.

### Yolda çıkan iki şey

**`kasa` aşaması düzeltmeyi yakaladı.** Kullanım sayısını senkron turundan
alınca ayarlar kâğıdı AÇIKKEN güncellenmez oldu; `kasa` aşaması tam olarak onu
ölçüyordu ve düştü. Taşıma ve elle eşitleme sonrasına tazeleme eklendi. Deneme
kendi işini yaptı.

**Hesap sayısı iddiası izolasyonsuzdu.** K-043'te yazdığım "sunucuda tek hesap"
iddiası MUTLAK sayıya bakıyordu; sahte sunucu aşamalar arasında yaşayıp hesap
biriktirdiği için arka arkaya koşunca sebepsiz düşüyordu. Artık bu koşuda
açılan hesabın FARKINA bakıyor — kırma denemesinde yine 2 gösterip düşüyor.

### Doğrulama

637 test; `hesap`, `cikmaz`, `kasa`, `hepsi` — dördü de geçiyor. Her iki
muhafız da kırılıp düştüğü görülerek doğrulandı.

---

## 2026-09-02 · K-043 · Oturum kimliğe bağlanmıyordu — K-038'in hesap ayrımı hiç var olmamış

Giriş bir denemede düştü, ikincide açıldı. Aynı istek dizisi, farklı sonuç.
Altından iki şey çıktı; ikincisi K-038'i geri aldırıyor.

### `jwt()` ortalıktaki çerezi kullanıyordu

```ts
let y = await jeton()          // GET /auth/token — çerezle
if (!y.ok) { await this.oturumAc(yarat); ... }
```

Çerez geçerliyse 200 dönüyor ve **`oturumAc` hiç çağrılmıyor.** Çerez kavanozu
KAYNAĞA ait, kimliğe değil: dönen JWT, o çerez kimin oturumundan kaldıysa onun.

Kullanıcının yaşadığı buydu. Şifre yanlış yazıldı → kimlik başka; ama çerez
hâlâ gerçek hesabındı → sunucu GERÇEK kasayı döndürdü → istemci yanlış
anahtarla açamadı. Ekranda "şifre kabul edildi ama kasa açılamadı" yazdı; oysa
şifre hiç doğrulanmamıştı. Doğru cümle "şifreyi yanlış yazdın" idi. K-042'nin
yeni mesajı, yanlış bir varsayımın üstüne kurulduğu için yanlış yönlendiriyordu.

### Ve K-038'in ayrımı hiç gerçekleşmemiş

K-038 kasa hesabının (paroladan) senkron hesabından (koddan) **ayrı** olmasını
şart koşuyordu. Sunucuda **tek** hesap vardı: kasa hesabı — ve defter satırları
da onun altında. Sebep aynı: `SenkronDepo` koddan türeyen kimliğiyle kuruluyor
ama kasadan kalan çerezi bulup onunla konuşuyordu; kendi hesabını hiç açmadı.

**Patlamayı bekleyen bir kayıptı.** Çerez düştüğü an senkron kendi hesabını
açacak, defter satırlarını orada arayacak, bulamayacaktı. Kullanıcı defterini
boş görürdü. Veri silinmez ama kaybolmuş görünür — pratikte farkı yok.

### Karar: tek hesap, bilerek

Ayrım geri alınıyor. K-038'in gerekçesi *"kurtarmada elde kod yok, kasaya
paroladan ulaşılabilmeli"* idi; bu tek hesapla da sağlanıyor — kasa zaten
paroladan türeyen hesabın altında. Ayrımın kendisi hiçbir işe yaramıyordu.

**Şifreleme ayrımı AYNEN duruyor:** defter satırları KOD türevli anahtarla,
kasa PAROLA türevli anahtarla şifreli. Sunucu ikisini de açamıyor. Değişen tek
şey kimin adına oturum açıldığı.

Bir de: "iki hesap" varsayımı tek çerez kavanozuyla **zaten kurulamazdı**. Bir
kaynakta aynı anda tek oturum olabiliyor. Tasarım, uygulanamaz bir şeyi şart
koşmuş ve bunu iki gün boyunca kimse fark etmedi, çünkü kaza eseri çalışıyordu.

### Ne yapıldı

- `Oturum` ilk jetondan ÖNCE kendi kimliğiyle oturum açıyor. Başka hesabın
  çerezini kullanmak artık yapısal olarak mümkün değil.
- Hesabın türetilmiş kimlik bilgisi (`HESAP_KIMLIGI`) kodun yanına, aynı
  korumalı depoya yazılıyor: yeniden yüklemede elde şifre olmuyor. Kullanıcının
  şifresi orada DA durmuyor — duran şey ondan türetilmiş, yalnızca bu hesaba
  yarayan bir dize.
- `SenkronDepo` oturumu hesap kimliğiyle açıyor, şifrelemeyi kod kimliğiyle
  yapıyor.

Yazma sırası bağlayıcı çıktı: kimlik bilgisi ancak `kilit.kur` SONRASI
yazılabiliyor, çünkü tarayıcıda güvenli depo sırları ana anahtarla sarmalıyor.
Önce denemek hesap açmayı "bağlantını kontrol et" ile düşürdü.

### Muhafız — ve önce boş çıkan hâli

`hesap` aşamasına 5. adım: iki cihaz, yenileme, sonra sunucudaki hesap sayısı.

İlk yazdığım iddia yenileme ÖNCESİ/SONRASI sayıyı karşılaştırıyordu ve kırma
denemesinde `4 → 4` diye **geçiyordu** — fazladan hesaplar zaten yenilemeden
önce açılmıştı. Ölçülmesi gereken mutlak sayıydı: iki cihaz, tek kullanıcı,
**tek hesap**. Düzeltilince kırma denemesi `2` gösterip düşüyor, düzeltmeyle
`1` gösterip geçiyor.

Aynı ders, bu oturumda kaçıncı kez olduğunu artık saymıyorum: *bir muhafız,
kırıldığında düştüğü görülene kadar yoktur.*

### Doğrulama

637 test; `hesap`, `cikmaz`, `kasa`, `hepsi` aşamalarının tamamı geçiyor.
Canlıdaki veri taşınmıyor — satırlar zaten hesabın altında, bu değişiklik var
olanı sabitliyor.

---

## 2026-09-02 · K-042 · Dört durumu tek cevaba katlamak — ve sessiz üstüne yazma

Site verileri temizlendikten sonra giriş yapılamadı. Sunucu kaydı: `sign-in`
200, `token` 200, `GET /rest/defter_kasa` 200 — sonra hiçbir istek yok. Ekranda
"bu ad ve şifreyle defter yok".

Ama o cümle **dört ayrı durumu** birden anlatıyordu: hesap yok, satır yok,
satır geldi ama açılmadı, girdi geçersiz. `girisYap` hepsine `null` diyordu.
Hangisi olduğunu koddan öğrenmenin yolu yoktu — yani hata teşhis edilemezdi.

K-040 "bir muhafız kırılmadan yoktur" diyordu; bunun eşi şu: **iki durumu tek
cevaba katlayan bir arayüz, arızayı görünmez yapar.**

`Kasa.oku()` artık `hesapYok` / `satirYok` / `var` ayrımını yapıyor;
`hesapAc` ve `girisYap` `KasaSonuc` döndürüyor; kilit ekranı her duruma ayrı
cümle kuruyor (TR + EN).

### Altından çıkan asıl hata: açılamayan kasanın üstüne yazılıyordu

```ts
const mevcut = await kasa.oku()
if (mevcut) { const gizli = await ac(...); if (gizli) return kurtarmaYaz(gizli) }
const kod = kurtarmaUret()        // AÇILAMADIYSA da buraya düşüyordu
await kasa.yaz(...)               // ve kasanın ÜSTÜNE yazıyordu
```

Sunucudaki defteri açan tek anahtar o eski koddu. Üstüne yazmak, kullanıcı
yalnızca "hesap aç"a bastı diye yıllık bir defteri sessizce ve **kalıcı olarak**
okunamaz hâle getirirdi. Artık `cozulemedi` dönüyor ve satıra dokunulmuyor.

Muhafızı kırılarak doğrulandı: eski davranış geri konunca "satır DEĞİŞMİYOR"
iddiası düşüyor.

---

## 2026-09-02 · K-041 · Sunucuya hiç yazılamıyormuş — ve taklidin sınırı

Bütün tarayıcı denemeleri yeşilken, gerçek Neon'a **bugüne kadar tek satır
yazılmamıştı.** K-036'dan beri "senkron çalışıyor" diye yazdığımız her şey
sahte bir sunucuya karşı doğruydu.

Kullanıcı canlı sitede hesap açmayı denedi. Vercel çalışma kaydı sırayı
gösterdi:

```
GET  /auth/token        200   JWT alındı
GET  /rest/defter_kasa  200   kasa okundu
POST /rest/defter_kasa  403   kasa YAZILAMADI
```

Neon tarafı tamamladı: `neon_auth.user`'da bir hesap, `defter_kasa` ve
`defter_blob` bomboş. Hesap açılmış, kasa yazılamamıştı.

### Sebep: şemaya girilemiyordu

`authenticated` rolünün `auth` **şemasına** USAGE yetkisi yok. Fonksiyona
EXECUTE yetkisi VAR — bu yüzden yüzeysel bakışta her şey doğru görünüyor — ama
şema kapalı olduğu için `auth.user_id()` çağrısı `permission denied for schema
auth` ile düşüyor. SQLSTATE 42501, Data API bunu 403'e çeviriyor.

Tahmin edilmedi, koşuldu:

```sql
set local role authenticated;
select auth.user_id();     -- permission denied for schema auth
```

### Neden okuma çalışıyor GÖRÜNÜYORDU

Bu hatanın en sinsi tarafı bu. `GET` 200 dönüyordu — ama tablo **boş** olduğu
için. Süzülecek satır yokken Postgres RLS `USING` ifadesini hiç
değerlendirmiyor, yani `auth.user_id()` hiç çağrılmıyor.

İlk satır yazılabilseydi okumalar da 403 olacaktı. Yani "okuma çalışıyor,
yazma bozuk" diye bir durum yoktu; ikisi de bozuktu, biri kendini gizliyordu.

### Yaptığım hata: dönen bir ifade, işe yaramış demek değil

İlk düzeltme denemem `grant usage on schema auth to authenticated` oldu.
**Hatasız döndü.** Ölçmeseydim "düzeltildi" diyecektim.

Ölçtüm: `has_schema_privilege` hâlâ `false`. Sebebi şu — `auth` şeması
`cloud_admin`e ait, `neondb_owner` orada `grant` edemiyor ve Postgres bu
durumda **hata değil UYARI** veriyor. İfade "başarıyla" hiçbir şey yapmıştı.

Bu, oturum boyunca dört kez düştüğüm tuzağın sunucu tarafındaki karşılığı.
K-040 "bir muhafız, kırıldığında düştüğü görülene kadar yoktur" diyordu.
Aynısının bu hâli: **bir işlemin döndüğü, işe yaradığı anlamına gelmiyor.**

### Çözüm: köprü kendi şemamızda

Yetkiyi doğrudan vermek mümkün değil. Data API'yi varsayılan grant'lerle
yeniden kurmak da bir seçenekti ama uç nokta adresini değiştirebilirdi; o
adres `app/.env` ve `api/vekil.ts` içinde yazılı ve değişse ikisini de
güncelleyip yeniden yayınlamak gerekirdi.

`neondb_owner` `auth` şemasını kullanabiliyor. O yüzden köprü ona ait:

```sql
create or replace function defter_kim() returns text
language sql stable security definer
set search_path = auth, pg_catalog
as $$ select auth.user_id() $$;
```

Sütun varsayılanları, iki tetik ve iki RLS politikası artık bunu çağırıyor.

**Yetki yükseltmesi değil.** `auth.user_id()` oturumdaki JWT'nin `sub`
iddiasını okuyor ve o JWT isteği YAPAN kullanıcınınki. Tanımlayıcı olarak
koşmak hangi JWT'nin okunduğunu değiştirmiyor — herkes yine yalnızca kendi
kimliğini alıyor, RLS aynı sıkılıkta. `search_path` sabitlendi, `public`ten
EXECUTE geri alındı.

### Neden hiçbir deneme yakalamadı

`arac/sahteNeon.mjs` bir **HTTP taklidi**: içinde Postgres yok, RLS yok, rol
yok, şema izni yok. `hepsi`, `hesap`, `kasa`, `cikmaz` — hepsi ona karşı
koşuyor ve hepsi geçiyordu.

**Bir taklit ancak taklit ettiği kadarını sınar.** Sahte sunucu istemci
akışını doğru sınıyor ve o işini yaptı: akışta hata yoktu. Ama sunucunun
yetki modelini hiç temsil etmiyor, o yüzden o katmandaki hata ancak gerçek
Neon'a dokununca göründü. Bu bir eksiklik değil, taklidin tanımı — kaydı
gereken şey, **hangi soruların ona sorulamayacağı.**

### Doğrulama — ilk kez gerçek Neon

Kullanıcı canlı sitede hesap açtı ve kayıt bıraktı.

| | önce | sonra |
|---|---|---|
| `neon_auth.user` | 1 | 1 (yetim hesap kendini onardı; `oturumAc` önce `sign-in` deniyor) |
| `defter_kasa` | 0 | **1** |
| `defter_blob` | 0 | **2** |

```
06:09:13  POST /rest/defter_kasa  403   ← düzeltmeden önce
06:27:06  POST /rest/defter_kasa  201
06:27:08  POST /rest/defter_blob  201
06:27:35  POST /rest/defter_blob  201
```

Sonrasında tek bir 403 yok.

**Gizlilik sözü de ilk kez gerçek veriyle sınandı ve tuttu:** `satir` 64 haneli
onaltılık (HMAC — varlık tipi bile görünmüyor), `iv` 12 bayt, `govde` saf
base64 AES-GCM. Çözülen baytların yalnızca **%35–41'i** yazdırılabilir
aralıkta; düzgün rastgele veride beklenen oran 95/256 ≈ %37. Gövdeler
rastgeleden ayırt edilemiyor. `defter_kasa.kullanici` ile `neon_auth.user.id`
birebir aynı: RLS doğru kimliğe bağlı.

### Açık uç: senkron turu fazla sık — ve "arıza değil" yanlıştı

Çalışma kaydında ~5 saniyede iki `GET /rest/defter_blob` görünüyor. Buraya
"veri doğru yazılıp okunuyor, yani arıza değil" diye yazmıştım. **Yanlıştı:**
tur kendi kendini besleyen bir döngüydü ve defter açık kaldığı sürece dönüyordu
(K-044). Kayıtta görünen bir tuhaflığı açıklamadan "arıza değil" saymanın
bedeli bu.

---

## 2026-09-01 · K-040 · Açma ekranından çıkış yolu — ve dört muhafızın boş çıkması

K-039 yayına çıktıktan sonra kullanıcının ilk cümlesi şuydu:

> "ben şifre koymadım fakat şuan şifre var gibi görünüyor."

Şifreyi kendisi koymuştu (K-037 tarayıcıda kilidi zorunlu kılmıştı), ama
haklıydı: gördüğü ekran hesap ekranı değildi ve oradan hesap ekranına giden
**hiçbir yol yoktu.**

### Açılış sırası bir çıkmaz yaratmıştı

```
kilit.durum === 'kilitli'   → açma ekranı
kilit.durum === 'kurulusuz' → karşılama (giriş / hesap aç / bu cihazda kal)
```

`localStorage`ta bir kilit kaydı olan herkes birinci satıra düşüyor ve karşılama
ekranını **bir daha hiç görmüyordu**. `?sifirla=1` de kurtarmıyordu: o bayrak
`uygulamayiKur` içinde işliyor, kilitliyken oraya hiç varılmıyor.

Yani K-039 mevcut kullanıcı için bir gerileme getirmişti: eskiden kurulum
ekranında "parolamla kurtar" vardı, ama yalnızca `kurulusuz` iken.

Çözüm dar tutuldu: açma ekranına (yalnızca tarayıcıda) tek bir ikincil eylem —
**"hesabımla gir"**. Onay kutusu ne olacağını açıkça söylüyor, sonra cihaz
temizlenip karşılamaya dönülüyor. Temizlik üç şey: kilit kaydı, güvenli
depodaki anahtarlar ve **OPFS mühür yuvaları**. Üçüncüsü olmadan yuvalar yetim
kalır ve yeni anahtar onları açamaz (K-039'daki `cikis` tuzağının aynısı; orada
worker'ın `unut`u kullanılıyordu ama o defter AÇIKKEN çalışıyor, kilitliyken
veritabanı hiç açılmıyor).

Ayrıca açma ekranı artık **parola kipinde** açılıyor: tarayıcıda PIN diye bir
şey yok, kilit parolası en az 12 karakter. Altı noktayla karşılayıp kullanıcıyı
"parola kullan"a basmaya zorlamak, kullanıcının bildirdiği kafa karışıklığının
yarısıydı.

### Asıl ders: bir muhafızı kırmadan ona güvenme

Bu değişikliğin denemesi (`npm run muhur cikmaz`) **dört kez** yazıldı ve ilk
üçü hiçbir şey ölçmüyordu. Sırasıyla:

1. **Mühür hiç oluşmuyordu.** Defter kurulup hemen yenileniyordu; "OPFS boş"
   kendiliğinden doğruydu. Düzeltme: kayıt bırakılıp yuva belirene kadar
   yoklanıyor, ve bu ayrı bir iddia olarak yazılıyor.
2. **`defterAcildi` yanlış şeyi ölçüyordu.** Yalnızca kilit ekranının `acik`
   sınıfını kaybetmesine bakıyordu. `defteriKodla` ekranı `uygulamayiKur`dan
   ÖNCE gizlediği için, açılış düşecek olsa bile arada ekranın kapalı olduğu bir
   an vardı ve yoklama tam oraya denk geliyordu.
3. **Kabuk statikti.** "Defter ekranı geldi mi" diye `nav` düğmesine bakmak da
   boştu: o düğme `index.html`de duruyor, veritabanı hiç açılmamışken bile
   orada.
4. Ancak dördüncüsü gerçekten ölçüyor: **temizlikten sonra deftere yeni bir
   kayıt yazılıp geri okunuyor.** Bu ancak veritabanı gerçekten açıldıysa olur.

Her seferinde `yuvalariSil()` kaldırılıp deneme yeniden koşuldu; geçmeye devam
ettiği sürece muhafız yoktu. Dördüncüsünde düştü — ve yuva geri konunca geçti.

Bu, K-038 ve K-039'da da olan hatanın **beşinci ve altıncı** örneği. Kural artık
şu: *bir muhafız, kırıldığında düştüğü görülene kadar yoktur.*

### Kırma denemesinin bulduğu gerçek hata

Muhafız düzelirken altından bir ürün hatası çıktı. `defteriKodla` kilit ekranını
`uygulamayiKur`dan **önce** gizliyordu. Açılış düşerse kullanıcı ölü bir kabukla
kalıyordu: kilit ekranı kapalı, veritabanı yok, sıfır girdi — ve ekrandaki tek
yazı **"hesap açılamadı, bağlantını kontrol et"**. Oysa hesap açılmıştı; sorun
ağda değil, yerel mühürdeydi. Kullanıcıyı tamamen yanlış yere bakmaya
gönderiyordu.

Artık ekran **başarıdan sonra** gizleniyor; düşerse açma ekranı geri geliyor ve
"parola doğru ama defter açılamadı" diyor. Genel "bağlantını kontrol et"
mesajının üstüne yazmaması için hata `ACILMADI` adıyla işaretleniyor.

`hepsi` denemesinin 4. ve 5. adımları da bu yüzden düzeltildi: ikisi de "parola
kullan"a basıyordu, ekran zaten parola kipinde açıldığı için bu artık kipi
PIN'e geri çeviriyor ve parolanın harfleri süzülüyordu. 4. adım bundan
**düşerek** haber verdi; 5. adım ise geçiyordu, çünkü iddiası "mesaj 30
karakterden uzun mu" idi — yanlış parola mesajı da uzun. Artık aranan mesajın
kendisi aranıyor.

### Doğrulama

`npm run muhur cikmaz` — gerçek Chromium: yerel defter kur, kayıt bırak, mühür
yazılana kadar bekle, yenile (açma ekranı, parola kipinde, çıkış yolu görünür),
"hesabımla gir" (karşılamaya dönülüyor, OPFS boş, kilit kaydı yok), sonra hesap
açılıyor ve **deftere yazılıp geri okunuyor**. `hesap` ve `hepsi` de geçiyor;
635 test ve üretim derlemesi temiz.

### `kasa` aşaması da yeni modele taşındı

`kasa` bir süredir koşmuyordu: K-039'da silinen `senkronAc` düğmesini
bekliyordu. Silmek yerine düzeltildi, çünkü sınadığı senaryo başka hiçbir
aşamada yok — `hesap` AYRI bir bağlamda (ikinci cihaz) giriş yapıyor, `kasa`
ise **aynı tarayıcıda site verileri temizlendikten sonra** kurtarmayı sınıyor.
K-038'i başlatan soru buydu: "tarayıcı geçmişi temizlenirse kayıtlar da mı
silinecek."

Yolu yeni modele göre yeniden yazıldı ve böylece o güne dek hiç sınanmamış bir
yol da kapsandı: yerel defterin ayarlardan hesaba taşınması (`hesabaTasi`).
Ayrıca `herSeyiSil` artık **çerezleri de** siliyor; gerçek "site verilerini
temizle" de siliyor ve bırakılırsa kurtarma bayat bir oturumla yürüyebilirdi.

Dört kırma denemesi koşuldu; ikisi beklendiği gibi düştü, biri **düşmedi** ve
bu da yazıldı:

| Kırma | Sonuç |
|---|---|
| 6. adımda şifre yanlış verildi | ✗ düştü — kurtarma gerçekten şifreye bağlı |
| Hesaba taşıma atlandı | ✗ düştü — "sunucuda N satır" iddiası boş değil |
| Çerez temizliği kaldırıldı | ✗ düştü — iddia çerezi gerçekten ölçüyor |
| Yükleme beklemesi kaldırıldı | **✓ geçti** — bekleme bir doğruluk muhafızı değil |

Sonuncusu önemli: bekleme kaldırılınca 6. adım yine geçiyor, çünkü yükleme
zaten bitmiş oluyor. Yani o bekleme bir **kararlılık** muhafızı — yavaş bir
koşuda silme yüklemeden önce olur ve aşama sebepsiz düşerdi. Planda "onsuz
anlamsızlaşır" diye yazılmıştı; doğru değilmiş. Bir muhafızın ne ölçtüğünü
kırma denemesi söylüyor, niyet değil.

O günkü sınır — "gerçek Neon'da denenmedi" — ertesi gün kalktı: `kasa`nın
taklide karşı sınadığı senaryo canlıda da doğrulandı. Ama önce sunucuda bir
hata çıktı; aşamalar sahte Neon'a karşı koştuğu için onu hiçbiri
göremiyordu (K-041).

---

## 2026-09-01 · K-039 · Hesap: kullanıcı adı + şifre, senkron ayrı bir düğme değil

Çevrimiçi kullanmak üç kavram istiyordu: **senkronu aç**, **Defter Kimliği**'ni
ikinci cihaza yaz, **kurtarma parolası** belirle. Artık bir tane var: giriş yap.

Bu yeni bir makine değil, K-038'in tamamlanması. Kasa zaten "paroladan hesap
türet → anahtarı getir → defteri indir" yapıyordu; eksik olan kullanıcı adı,
açık bir *hesap aç / giriş yap* ayrımı, ve senkronun ayrı bir anahtar olmaktan
çıkmasıydı.

### K-038 geri alınmıyor, genelleşiyor

Kasa artık "kurtarma parolası" değil, hesabın kendisi. Değişen tek şey tuz.

**Ve bu bir kazanç.** K-038 sabit tuzu MECBUREN kabul etmişti: kurtarma anında
elde paroladan başka hiçbir şey yoktu, tuz okunacak bir yer yoktu. Kullanıcı adı
tam olarak o eksik parça. Tuz artık kullanıcıya özel; önceden hesaplanmış tablo
saldırısı kapanıyor. Bu değişiklik kriptoyu zayıflatmıyor, **güçlendiriyor.**

Kullanıcı adı sunucuya **gitmiyor**: tuzun içinde kalıyor, sunucu yalnızca
türetilmiş opak kimliği görüyor.

Defterin şifrelemesi şifreye de inmiyor. Asıl anahtar hâlâ 128 bit rastgele
Defter Kimliği; şifre onu yalnızca sarmalıyor. K-038'de kabul edilen bedel
(sunucuda insan parolasıyla şifrelenmiş ikinci bir hedef) aynen duruyor,
büyümüyor.

### Şifre unutulursa yardım yok

Parola sıfırlama **yok** ve bu her yerde yazılı. Sıfırlama, anahtarın sunucuda
çözülebilir durumda tutulmasını gerektirirdi; o da sunucunun defteri okuyabilmesi
demek olurdu. İkinci yol Defter Kimliği: hesap açarken bir kez gösteriliyor.

### Aynı ad + farklı şifre = başka hesap

Kimlik ikisinden birden türüyor. İyi tarafı: ad benzersizliği diye bir sorun yok,
kimse kimsenin adını kapatmıyor. Bedeli: yanlış şifre "yanlış şifre" değil,
"böyle bir hesap yok" demek — arayüz bunu tek cümlede söylüyor.

**Giriş hesap YARATMIYOR.** Bu, buradaki en kritik nokta. Yaratsaydı şifresini
yanlış yazan kullanıcıya sessizce boş bir defter açılır, "giriş başarılı" denir
ve kullanıcı defterini kaybettiğini anlamadan üstüne yazmaya başlardı.
`Oturum.oturumAc(yarat = false)` bunun için zaten duruyordu.

### Hesapsız mod duruyor — ilke 2.3 böyle ayakta kalıyor

Karşılamada üç yol var: giriş yap, hesap aç, **bu cihazda kal**. Üçüncüsü
olmasaydı uygulama "önce yerel" bir defter olmaktan çıkıp hesap gerektiren bir
servis olurdu. Sunucuya gitmek bir SEÇİM olmaya devam ediyor.

### Yolda çıkan üç şey

1. **Karşılamada `parolaKipi` kurulmuyordu.** Yalnızca CSS sınıfı eklenip bayrak
   unutulunca giriş alanı PIN gibi davranıyor ve şifredeki harfleri siliyordu;
   32 karakterlik şifre "en az 12 karakter" hatası veriyordu.
2. **Yazdıktan sonra senkronu tetikleyen hiçbir şey yoktu.** Eski modelde
   kullanıcı ayarlardan "şimdi eşitle" diyordu; yeni modelde demiyor. `Durum.dinle`ye
   borçlandırmalı bir tur bağlandı. Bu olmadan ikinci cihaz boş kalıyordu — ve
   bunu yalnızca iki bağlamlı tarayıcı denemesi yakaladı.
3. **Çıkış mühür yuvalarını da silmek zorunda.** Yalnızca kilit kaydı silinseydi
   yuvalar yetim kalırdı: yeni kurulumdaki yeni anahtar onları açamaz ve uygulama
   bir daha açılmazdı.

### Bir tuzak: kullanıcı adı ve yerel küçük harf

Ad anahtar türetmesine girdiği için normalizasyonun cihazdan cihaza değişmemesi
şart. `toLocaleLowerCase` Türkçe yerelde "ALI" → "alı", İngilizcede "ali" verirdi
ve **aynı kullanıcı iki cihazda iki ayrı hesaba düşerdi.** `toLowerCase` +
NFKC kullanılıyor ve bir test kaynağı tarayarak bunu sabitliyor.

O testi yazarken K-038'deki hata tekrarlandı: tarama, `hesapKimlik.ts`in
KULLANILMAYAN çağrıyı anlatan yorumuna takılıyordu. Yorumlar atılarak düzeltildi.

### Doğrulama

`npm run muhur hesap`, gerçek Chromium, **iki ayrı tarayıcı bağlamı** (gerçek
ikinci cihaz: kendi deposu, kendi çerezleri). Birinci cihazda hesap açılıp kayıt
bırakılıyor; ikinci bağlamda yalnızca kullanıcı adı ve şifreyle giriliyor ve
kayıt orada. Ne kod yazılıyor ne senkron açılıyor. Yanlış şifre defteri açmıyor
ve sunucuda üçüncü bir hesap oluşmuyor — sunucu kaydında sayıldı.

O günkü sınır — "gerçek Neon'da denenmedi, `defter_kasa` şeması elle
uygulanmayı bekliyor" — kapandı: şema uygulandı, hesap açma ve senkron canlıda
çalışıyor. Yolda bir de sunucu tarafı hata çıktı (K-041).

---

## 2026-09-01 · K-038 · Kasa: anahtar Neon'da, parolayla kilitli

Tarayıcı "site verilerini" temizleyince üç şey aynı anda gidiyordu: mühürlü
veritabanı, kilit kaydı ve **Defter Kimliği**.

Üçüncüsü asıl sorundu. Defter zaten Neon'da ve eksiksiz — temiz bir tarayıcıda
kod girilse su seviyesi sıfırdan başlıyor ve her satır geri iniyor. Yani
kaybolan şey defter değil, **onu açan anahtar**. "Uygulamayı daha fazla Neon'a
bağlamak" bunu çözmüyordu: veri zaten oradaydı. Soru anahtarın kimde durduğuydu.

### Geri alınan cümle: K-036

> Anahtar cihazdan hiç çıkmıyor.

Artık çıkıyor — ama **açık değil**. Kasada duran şey Defter Kimliği'nin
arkasındaki 16 baytlık gizli ve kullanıcının parolasıyla AES-GCM ile şifreli.
Parola sunucuya hiçbir zaman gitmiyor; şifreyi açan anahtar ondan cihazda
türüyor.

Çürütme şu: K-036'nın koruduğu şey anahtarın *hareketsizliği* değil, **sunucunun
defteri okuyamaması**ydı. O hâlâ doğru. Sunucu ne defteri açabiliyor ne kasayı.

### Kazanılan

Temiz bir tarayıcıda yalnızca parolayı yazmak yetiyor. Kodu kaybetsen parola,
parolayı unutsan kod kurtarıyor — **ikisini birden** kaybetmen gerekiyor.

### Kaybedilen — dürüst muhasebe

Önce sunucudaki şifreli defteri açmanın tek yolu **128 bit rastgele** bir kodu
kırmaktı. Böyle bir saldırı yok.

Şimdi sunucuda ikinci bir hedef var: **insan parolasıyla** şifrelenmiş bir blob,
tek engel Argon2id. Uçtan uca şifreleme bozulmuyor ama **sistemin en zayıf halkası
artık parolanın gücü.** Alınan önlemler:

- Kasa için ayrı ve ağır parametreler: `t=4, m=128 MiB` (senkron `t=3, m=48 MiB`).
  Yalnızca kurulumda ve kurtarmada koşuyor.
- Parola alt sınırı 8'den **12**'ye çıktı. Eski sınır yalnızca yerel diski
  koruyorken yeterliydi; kasaya erişmek için kimseye fiziksel erişim gerekmiyor.
- Sabit tuz kaçınılmaz (kurtarma anında elde paroladan başka hiçbir şey yok, tuz
  okunacak bir yer yok) ve bedeli parametrelerle ödendi. Etikette sürüm var.

Bu değişikliğin bağlamı da kayda giriyor: ürün piyasaya sürülmüyor, tek kişilik
kişisel kullanım. Bedeli taşıyan başka kimse yok.

### Neden ayrı bir kimlik

Senkronda her şey koddan türüyor. Kurtarmada elde kod YOK — onu almaya
geliniyor. Kasanın kimliği bu yüzden yalnızca paroladan türüyor; döngüyü kıran
şey bu. İki türetme de Argon2id + HKDF kullanıyor ama tuzları ve etiketleri ayrı.

### İki hata ve bir ders

Kurtarma gerçek tarayıcıda kanıtlanırken iki şey çıktı:

1. **`SenkronDepo` sonsuz döngüye giriyordu.** Oturum makinesi ortak tabana
   çıkarılırken yapılan toplu değiştirme, yardımcı fonksiyonun gövdesindeki
   çağrıyı da değiştirmiş ve fonksiyon kendini çağırır olmuştu. Hiçbir birim
   testi yakalamadı: `SenkronDepo`nun gerçek metotları yalnızca tarayıcı
   denemesinde koşuyor.

2. **Bir muhafız sessizce boşa geçmeye başlamıştı.** "Kurulum ekranı mı" sorusu
   bir düğmenin görünürlüğüne bakıyordu; kasa gelince o düğme kurulumda da
   göründü ve ayrım yok oldu.

İkincisi bu projede üçüncü kez (K-036'daki boş tarama, K-037'deki kök-yalnızca
OPFS taraması). Ders artık yazılı: **bir muhafız, koruduğu şey değişince sessizce
hiçbir şey ölçmez hâle gelebilir — ve düşmediği için fark edilmez.** Muhafız
eklerken kırıp denemek yetmiyor; koruduğu şey değişince yeniden kırıp denemek
gerekiyor.

### Doğrulama

`arac/sahteNeon.mjs` Neon'un dokunulan kadarını taklit ediyor. `npm run muhur
kasa` gerçek Chromium'da: defter kur → kayıt bırak → senkron aç (2 satır,
~764 B şifreli) → kurtarma parolası kur → **OPFS ve localStorage'ı tamamen sil**
→ yenile → yalnızca parola → defter geri geldi. Kasa yazması iptal edilip
koşturuldu, deneme düşüyor.

O günkü sınır — "gerçek Neon'da denenmedi" — kapandı: kasa canlıda yazılıyor
ve okunuyor, gövdesi rastgeleden ayırt edilemiyor. Şemanın kendisinde bir
eksik vardı ve ancak gerçek sunucuda göründü (K-041).

---

## 2026-08-31 · K-037 · Vercel'e taşınma ve kendi vekilimiz

Depo private yapılacaktı. GitHub Pages private depoda ücretli plan istiyor,
yani `fabricpro.github.io/Gunluk/` kapanıyordu. Vercel Hobby private depoyu
destekliyor — taşınmanın sebebi bu kadar sade. Sonuçları değil.

### Çürütülen karar: K-031'in bir cümlesi

K-031 "sunucu yok, ara katman yok" diyordu. **Artık bir ara katmanımız var:**
`app/api/vekil.ts`, Vercel'de çalışan tek kod.

Çürütme: K-031'in koruduğu şey ara katmanın *yokluğu* değil, **anahtarın ve
metnin bizden geçmemesi**ydi. İkisi de hâlâ geçmiyor. Zarf cihazda
kapanıyor, cihazda açılıyor; vekil taşıyıcı ve içeriği açamıyor. K-031'in
asıl konusu olan Anthropic çağrısı (`veri/model.ts`) vekile hiç girmiyor,
kullanıcının kendi anahtarıyla doğrudan gidiyor.

Vekilden **geçen**: türetilmiş parola, oturum çerezi, JWT, şifreli zarflar.
Vekilden **geçmeyen**: şifreleme anahtarı ve düz metin.

### Vekil neden gerekliydi

Sayfa Vercel'de, Neon başka bir kaynakta. Tarayıcıdan doğrudan konuşulsa
oturum çerezi çapraz site olurdu: Safari'nin izleme koruması onu düşürüyor,
Chrome üçüncü taraf çerezlerini kapatıyor. `senkronDepo.ts` zaten
`credentials: 'include'` kullanıyor ve `ag.senkronOturum` bu ihtimali
öngörüyordu — ama öngörmek senkronu çalıştırmıyor.

Vekil bir sorunu daha **yapı gereği** çözüyor: dönen `Set-Cookie`ten
`Domain` özniteliği düşürülüyor. Neon çerezi kendi alanına göre yazsaydı
tarayıcı reddederdi. Planda bu "ölçülecek bilinmeyen"di; düşürülmüş çerez
her iki durumda da doğru olduğu için ölçmeye gerek kalmadı.

Ek fayda: istekler sunucu tarafından gittiği için CORS ortadan kalkıyor,
Data API'nin izin listesine hiç dokunulmadı.

### Vekil neden bu kadar dar

Tek savunması okunabilir olması. Bu yüzden: taşınan istek başlıkları altı
tane, dönen yanıt başlıkları iki tane, tanımadığı hedefe 404, **tek satır
kayıt yok**. `test/senkronGizlilik.test.ts` artık `api/` altındaki dosya
listesini de tam olarak sabitliyor ve vekilin anahtara, şifrelemeye,
`console`a dokunmadığını kontrol ediyor — ikinci bir dosya konarak
düştüğü doğrulandı.

Bu genişletme keşfin kendi bulgusuydu: muhafız yalnızca `src/` tarıyordu,
`src/` dışında ağa dokunan bir dosya sessizce eklenebilirdi.

### Yerelde görülemeyecek dört şey

Vekilin dört adımı da canlıda düştü ve dördü de teste yazıldı:

1. **Düz `vercel.json` yönlendirmesi olmuyor.** Vercel dış hedefe giderken
   `Host` başlığını olduğu gibi taşıyor; Neon projeyi Host'tan bulduğu için
   `INVALID_HOSTNAME` dönüyor. Yanıtta `x-neon-ret-request-id` vardı —
   istek Neon'a *ulaşıyor*, Neon reddediyor.
2. **Yakalayıcı yol (`[...yol]`) çoklu segment yakalamıyor.**
   `/api/vekil/auth` fonksiyona düştü, `/api/vekil/auth/token` Vercel'in
   `x-vercel-error: NOT_FOUND`unu aldı. Fonksiyon sabit yola taşındı, yol
   sorgu dizesine.
3. **`istek.url` göreli geliyor** ve Vercel sorgu dizesine kendi alanlarını
   ekliyor (yönlendirmedeki parçanın yankısı, `_vercel_*`). PostgREST
   tanımadığı alanı sütun süzgeci sayıp 400 döner; eleniyorlar.
4. **`runtime: 'edge'` onurlandırılmıyor.** Fonksiyona Web `Request` değil
   `IncomingMessage` geliyor. Vekil artık tahmin edilen değil **görülen**
   imzayla yazılı.

### Yayının kendisi

- `ignoreCommand` ile "yalnızca üretim dalı" denendi ve üretim dağıtımını da
  atladı: `VERCEL_ENV` o adımda boş. Daha kötüsü, dağıtım sessizce CANCELED
  oluyor ve tek satır kayıt düşmüyor. Alanı silmek de yetmedi — Vercel ayarı
  proje tarafında tutuyor; `"exit 1"` ile açıkça ezildi. Önizleme
  dağıtımları Vercel Authentication arkasında.
- Emekliye ayrılan `pages.yml` yayından önce `npm test` koşuyordu. Vercel
  varsayılan olarak yalnızca derliyor; `buildCommand` artık
  `npm test && npm run build`. Bu güvenlik ağı sessizce kaybolmasın.
- Adres seçimi çalışma anında: cihazda doğrudan Neon, tarayıcıda `/auth` ve
  `/rest`. `vite.config.ts` geliştirmede aynı yolları taşıyor ki geliştirme
  ile üretim ayrışmasın.

### Çürütülen karar: K-013

K-013 tarayıcı derlemesini "önizleme" diye işaretlemişti ve gerekçesi tek
cümleydi: *tarayıcıda SQLCipher yok, kilit yalnızca bir ekran.* Bu cümle
artık yanlış — çürütülerek değil, **ortadan kaldırılarak**: tarayıcıda
şifreleme var.

Yeni kripto yazılmadı; var olan üç makine birleştirildi. `veri/kilit.ts`
zaten DOM'suz ve deposuz sarmalama yapıyordu, `sqlite-isci.ts`in `:memory:`
yolu zaten vardı, mühürleme fikri `veri/yedek.ts`te duruyordu.

    parola → Argon2id → KEK          (kilit.ts, aynen)
    KEK    → AV                       (sarmal localStorage'ta)
    AV     → OPFS'teki mühürlü blob
    AV     → Defter Kimliği + model anahtarı sarmalı

**Tarayıcıda kilit ZORUNLU.** Cihazda SQLCipher bir taban ve kilit isteğe
bağlı bir ek katman; tarayıcıda öyle bir taban yok. Anahtar olmadan defter
mühürlenemiyor, yani parola belirlemek "istersen" değil, şifrelemenin
kendisi. Kurulum ekranı yeni bir kutu değil — mevcut kilit ekranı metin
değiştiriyor (K-013'ün tasarım refleksi korundu).

Defterin baytları JSON döküm olarak değil `sqlite3_js_db_export` ile ham
alınıyor: FTS sanal tabloları ve senkron muhasebesi dahil her şey birebir
duruyor. Döküm yolu seçilseydi `senkron_iz` her açılışta sıfırlanır ve
defterin tamamı yeniden gönderilecek diye işaretlenirdi.

**İki yuva.** Tek dosyaya yazılsaydı, yazması yarıda kalan bir sekme
defteri bütünüyle götürürdü. Yazma eski yuvaya gidiyor, okuma yeniden
eskiye doğru deneniyor.

### Kabul edilen bedeller

- **Parola unutulursa bu tarayıcıdaki defter gider.** Cihazdaki biyometri
  yedeği burada yok. İki kaçış yolu var ve ayar kağıdı ikisini de söylüyor:
  mühürlü yedek dosyası, ve senkron açıksa Defter Kimliği.
- **Sarmal `localStorage`ta duruyor**, cihazdaki gibi Keychain'de değil.
  Çevrimdışı deneme mümkün; bu yüzden en az 8 karakter isteniyor ve
  Argon2id parametreleri (t=3, m=48 MiB) olduğu gibi kullanılıyor.
- **Son mühürden sonraki yazı, sekme çökerse gider.** `pagehide` ve
  `visibilitychange` yakalanıyor, çökme yakalanamıyor.
- **Tarayıcı depoyu silebilir.** `navigator.storage.persist()` isteniyor;
  verilmezse ayar kağıdı bunu ilk not olarak söylüyor.

### Yerelde görülemeyen beşinci şey

`arac/muhurDenemesi.mjs` (`npm run muhur`) gerçek Chromium'da koşuyor:
OPFS, worker ve sqlite-wasm vitest'te yok.

Deneme kırılarak sınandı ve o sırada **kendi içinde bir kusur** çıktı:
tarama yalnızca OPFS köküne bakıyordu, oysa sqlite-wasm düz veritabanını
bir alt klasörde tutuyor. Yani "metin geçmiyor" kontrolü hiçbir şey
aramadan geçebilirdi — K-036'daki boş taramanın aynısı. Özyinelemeli
yapıldı ve kırık sürümde 315 kB'lık şifresiz veritabanını işaretle
birlikte gerçekten buluyor.

TAŞIMA ayrıca iki aşamada, kalıcı tarayıcı profiliyle ve tam olarak
canlıdaki senaryoyla denendi: kilidi hiç olmayan şifresiz bir defter →
yükseltme → kurulum ekranı → parola. Kayıt duruyor, düz kopya silinmiş.

`VITE_ONIZLEME` **kaldırıldı.** Dayandığı iki cümle de artık yanlış.

---

## 2026-08-31 · K-036 · Cihazlar arası senkron: uçtan uca şifreli, kurtarma kodu kimlikli

Kullanıcı defteri birden çok cihazda kullanmak istedi. Bu istek ürünün en
temel sözüne dokunuyor, o yüzden önce muhasebesi.

### İlke muhasebesi

| İlke | Durum |
|---|---|
| **2.1** kriz anında susar | Etkilenmiyor. Sınıflandırma cihazda, hiçbir yere yazılmıyor; sunucuya giden blob şifreli. |
| **2.2** yakılan sayfa yanar | Etkilenmiyor. `ekran/yak.ts` senkrona hiç dokunmuyor ve iki ayrı test bunu tarıyor. |
| **2.3** ham metin cihazdan çıkmaz | **İlk cümlesi ayakta, ikincisi revize edildi.** Ham metin gerçekten çıkmıyor: çıkan şey AES-GCM şifreli blob ve anahtar cihazdan hiç ayrılmıyor. Ama *"arka planda sessizce hiçbir şey yüklenmez"* artık doğru değil — senkron açıksa arka planda yükleme oluyor. Cümle PROJE.md'de değiştirildi, gizlice bırakılmadı. |
| **2.4** arşiv uydurmaz | Etkilenmiyor. |

### Çürütülen karar: K-034

`KARARLAR.md`nin başındaki kural bir kararı geri almak isteyenin önce
gerekçesini çürütmesini şart koşuyor. Çürütülmesi gereken tek cümle
**K-034**'ün taşıyıcı direği:

> Bize ait hiçbir uç nokta yok.

Artık yanlış. Çürütme şu: bu cümlenin koruduğu şey uç noktanın *yokluğu*
değil, **defterin okunamazlığı**ydı. Uçtan uca şifrelemeyle okunamazlık uç
nokta olmadan da sağlanıyor — sunucu anlamsız bayt görüyor. K-002 (cihazda
şifreli SQLite) ve K-031 (anahtar kullanıcının) **korunuyor**: yerel
veritabanı hâlâ asıl kaynak ve senkron anahtarı da cihazdan çıkmıyor.

Bedeli açık ve ödendi: mağaza beyanı `Data Not Collected` olmaktan çıktı,
gizlilik politikası baştan yazıldı.

### Sunucunun gördüğü üstveri — dürüst liste

Şifreli olsa bile sıfır sızıntı diye bir şey yok. Neon'da duran:

- opak hesap kimliği (kurtarma kodundan türetilmiş; kişisel veri değil),
- satır başına: opak satır kimliği, sunucunun attığı sürüm sayacı,
  şifreli gövde, sunucunun aldığı an.

Yani sunucu **kaç satırınız olduğunu, ne sıklıkta eşitlediğinizi ve kabaca
ne kadar yazdığınızı** öğreniyor. Öğrenmedikleri: metin, tarih, saat,
defter adı, başlıklar, temalar, fotoğraflar — ve **hangi satırın
silindiği** (aşağıya bakın).

Yazma saati de sızmıyor: zarfın içindeki sıralama alanı duvar saati değil,
**Lamport sayacı**.

### Kimlik: e-posta yok, parola yok, hesap yok

Tek bir **Defter Kimliği** var — 128 bit, Crockford base32, sağlamalı
(mevcut `cekirdek/kurtarma.ts` makinesi). Kullanıcı ikinci cihazda onu
yazıyor, başka hiçbir şey sorulmuyor.

Koddan üç bağımsız değer HKDF ile ayrışıyor: sunucunun gördüğü opak
kimlik, Better Auth parolası ve AES-GCM anahtarı. Biri sızsa diğerleri
hakkında bilgi vermiyor.

Neon'un Managed Better Auth'unda anonim giriş eklentisi yok, o yüzden
e-posta+parola akışı **türetilmiş sentetik kimlikle** kullanılıyor:
`<opak>@defter.invalid`. `.invalid` RFC 2606'da tam bu iş için ayrılmış —
hiçbir yere posta gitmiyor, kullanıcı bunu ne görüyor ne giriyor.
Doğrulama kapalı olduğu (`require_email_verification: false`) MCP üzerinden
ölçüldü; planın tek gerçek bilinmeyeni buydu.

### Yerel asıl

SQLite tek kaynak olmaya devam ediyor. Senkron üstüne takılan bir katman;
kapalıyken uygulama bugünkü gibi tamamen çevrimdışı çalışıyor ve tek istek
çıkmıyor (tarayıcıda ölçüldü).

Değişiklik izi **tetikleyicilerle** tutuluyor, `Depo` metodlarıyla değil:
hangi kod yolundan yazılırsa yazılsın iz düşsün. Elle çağrılan bir kayıt
fonksiyonu bir yerde unutulur; tetikleyici unutulmaz.

### Yol boyunca bulunan iki hata

**1. Silinen kayıt diriliyordu.** İlk tasarımda mezar taşı sürüm
taşımıyordu (`govde` null idi). A bir kaydı siliyor, sonra kendi daha önce
gönderdiği canlı satırı geri çekiyor, yerelde satır olmadığı için "uzak
kazanır" deniyor ve kayıt geri geliyordu. İki cihazlı test yakaladı.

Düzeltme zarfı sadeleştirdi: `silindi` bayrağı kalktı, silme de şifreli
gövdenin içinde (`alanlar: null`). İki kazanç birden — silme artık
karşılaştırılabilir bir sürüm taşıyor, **ve sunucu hangi satırın
silindiğini bilmiyor**; her satır aynı görünüyor.

**2. Aynı anda yapılan düzeltmeler ıraksıyordu.** İki cihaz birbirini
görmeden düzeltince Lamport değerleri eşit çıkıyor ve "beraberlikte yerel
kazanır" kuralı her cihazı kendininkinde bırakıyordu: defter ikiye
ayrılıyordu. Beraberlik artık **içerikle** bozuluyor — iki taraf da aynı
iki değeri gördüğü için aynı kazananı seçiyor ve buluşuyorlar.

### Çakışmada metin asla kaybolmuyor

Kaybeden metin **kenar notuna** dönüyor. Kenar notu zaten "bir kayda
sonradan eklenen şey" için var, arşivde görünüyor ve kaybolmuyor (K-024).
Yeni makine değil, mevcut olanın kullanımı. Bir günlükte sessiz "son yazan
kazanır" kabul edilemez.

### Ağ sınırı gevşemedi, sıkılaştı

Keşifte çıkan en önemli bulgu: **mevcut testlerin hiçbiri "yeni bir dış
adres eklenmesin" demiyordu.** `gomuGizlilik.test.ts` yalnızca
`gomu-isci.ts`'i, `anlatim.test.ts` yalnızca `anlatim.ts` + `yak.ts`'i
tarıyordu; yeni bir `veri/sunucu.ts` takımı **kırmadan** eklenebilirdi.

`test/senkronGizlilik.test.ts` bunu kapattı: ağa çıkabilen dosyaların TAM
listesi sabit (`model.ts`, `gomu-isci.ts`, `senkronDepo.ts`), ve ağ
katmanının şifreleme anahtarına dokunmadığı da taranıyor. İki muhafız da
kasten kırılarak denendi — muhafız denenmemişse muhafız değildir.

### SDK yok, düz `fetch`

`@neondatabase/neon-js` cazipti, alınmadı. Data API düz PostgREST, Better
Auth düz REST; ikisi de birkaç satır. Ağ yüzeyi ne kadar küçük ve okunur
olursa "metnim nereye gidiyor" sorusu o kadar kolay cevaplanıyor.
`veri/senkronDepo.ts` baştan sona beş dakikada okunuyor.

### Kabul edilen bedeller

- Sunucu üstveri görüyor (yukarıdaki liste).
- Defter Kimliği kaybolursa sunucudaki kopya da açılmıyor — biz de
  açamıyoruz. Kodu bilen defteri okuyabiliyor; parola gibi saklanmalı.
- Neon ücretsiz planında dal başına 512 MB. Fotoğraflar base64 (K-023) ve
  şifreleme ~%37 büyütüyor; ayar kağıdı kullanılan alanı gösteriyor.
- Managed Better Auth beta ve yalnızca AWS bölgelerinde.

### Henüz doğrulanmayanlar

Bu geliştirme ortamının ağ politikası Neon'un auth uç noktasını
engelliyor. Doğrulananlar: şema, RLS politikası, rol yetkileri
(`anonymous` rolünün tabloda hiçbir yetkisi yok), e-posta doğrulamasının
kapalı olduğu, ve iki cihazlı tam turun bellekteki sahte sunucuyla
çalıştığı.

**Doğrulanmayan ve gerçek ağda denenmesi gerekenler:** sentetik
`.invalid` e-postayla kayıt, çerezli JWT akışının Capacitor webview'ında
çalışması, canlı iki-hesap RLS testi. `yayin/MAGAZA.md` kontrol listesinde
duruyorlar.

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
