# Karar günlüğü

Bu dosya zamanla deponun en değerli parçası olacak. Her büyük karar buraya
yazılır: ne seçildi, neden, ve reddedilen alternatifin neden reddedildiği.
Bir kararı geri almak isteyen (biz dahil) önce buradaki gerekçeyi çürütmek
zorunda.

Yeni karar en üste eklenir.

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
