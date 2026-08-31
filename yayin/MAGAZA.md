# Mağaza metinleri ve gizlilik beyanları

Bu dosya App Store Connect ve Google Play Console'a **olduğu gibi**
girilecek metinleri tutuyor. Buradaki her cümle koddaki bir davranışa
karşılık geliyor; kod değişirse bu dosya da değişir.

**Kural:** mağazada söylenen her şey doğrulanabilir olmalı. "Verilerinizi
asla paylaşmayız" gibi ölçülemez bir cümle yerine, hangi çağrının ne
zaman yapıldığı yazılıyor.

---

## 1. Kimlik

| Alan | Değer |
|---|---|
| Ad | Defter |
| Diller | Türkçe, İngilizce |
| Alt başlık (TR) | Yazdığın yerde kalır |
| Alt başlık (EN) | A diary that stays on your device |
| Kategori | Sağlık ve Fitness → yok. **Yaşam Tarzı** (birincil), **Verimlilik** (ikincil) |
| Sunucu | Neon Postgres, AWS eu-central-1 (Frankfurt) — yalnızca senkron açıkken |
| Yaş sınırı | 17+ (aşağıya bak) |
| Fiyat | Ücretsiz, uygulama içi satın alma yok |

**Kategori neden Sağlık değil:** uygulama bir sağlık aracı değil. Sağlık
kategorisi teşhis/ölçüm çağrışımı taşır ve PROJE.md §5 bunu açıkça
reddediyor. Sağlık kategorisinde listelenmek, olmadığımız şeyi ima etmek
olurdu.

---

## 2. Yaş sınırı — Apple soruları

| Soru | Cevap | Gerekçe |
|---|---|---|
| Realistic Violence | None | |
| Sexual Content or Nudity | None | |
| Profanity or Crude Humor | None | Uygulama metin üretmiyor; kullanıcının kendi yazdığı görünüyor. |
| Alcohol, Tobacco, or Drug Use | None | |
| Horror/Fear Themes | None | |
| Medical/Treatment Information | **None** | Uygulama teşhis koymuyor, tedavi önermiyor, risk puanı vermiyor. Kriz kartı yalnızca acil servis numarasını gösteriyor; bu tıbbi bilgi değil, yönlendirme. |
| Unrestricted Web Access | No | Uygulama içinde tarayıcı yok. |
| User Generated Content | Yes, ama **paylaşılmıyor** | Kullanıcı yazıyor; içerik cihazda kalıyor, başka kullanıcıya ulaşmıyor, bir akış yok. Moderasyon gerektiren bir yüzey yok. |

**17+ neden:** kullanıcı kendi günlüğüne her şeyi yazabilir ve uygulama
onu sansürlemez. Yaş sınırını düşük tutup sonra "içerik denetlenmiyor"
demek tutarsız olurdu.

---

## 3. Apple gizlilik etiketleri (Privacy Nutrition Labels)

**Beyan artık `Data Not Collected` DEĞİL.** Senkron eklendiğinde bu beyan
düştü (KARARLAR.md · K-036) ve bilerek düşürüldü: sunucuda kullanıcı
içeriği duruyor, şifreli olsa bile.

| Veri türü | Toplanıyor mu | Bağlantı | Amaç |
|---|---|---|---|
| **Other User Content** | Evet — **yalnızca senkron açıksa** | Kullanıcıya bağlı DEĞİL | App Functionality |
| **User ID** | Evet — **yalnızca senkron açıksa** | Kullanıcıya bağlı DEĞİL | App Functionality |
| Diğer bütün türler | Hayır | — | — |

**"Kullanıcıya bağlı değil" neden doğru:** hesap kimliği, kullanıcının
cihazında üretilen 128 bitlik rastgele bir koddan türeyen opak bir
dizedir. E-posta, ad, telefon, cihaz kimliği, reklam kimliği ya da başka
hiçbir kimlik bilgisi istenmiyor ve saklanmıyor; bu kimliği gerçek bir
insana bağlayacak hiçbir veri elimizde yok.

**"Tracking" beyanı: Hayır.** Üçüncü taraflara veri aktarılmıyor, reklam
ağı yok, veri simsarı yok, cihazlar arası reklam eşleştirmesi yok.

Beyanın dayandığı gerçekler:

- Analitik yok, çökme raporu servisi yok, reklam SDK'sı yok, izleme yok.
- Günlük metni cihazda ve şifreli (SQLCipher); anahtar Keychain /
  Android Keystore'da.
- Uygulamanın çağırabileceği dış adresler:
  1. `cdn.jsdelivr.net` — anlam araması AÇILIRSA, bir kerelik model
     indirmesi. Yalnızca indirme; gövde gönderilmiyor.
  2. `api.anthropic.com` — model cevabı AÇILIRSA ve kullanıcı düğmeye
     BASARSA. Giden: sorusu + en fazla 4 kaydın metni. Anahtar
     kullanıcının kendi anahtarı; fatura kullanıcıya.
  3. `*.aws.neon.tech` — senkron AÇILIRSA. Giden: cihazda AES-256-GCM
     ile şifrelenmiş satırlar. **Şifre çözme anahtarı cihazdan hiç
     çıkmıyor; sunucu içeriği okuyamıyor.**

  Üçü de varsayılan kapalı.

### App Review'a not (Review Notes alanına)

> Uygulamanın varsayılan hâli tamamen çevrimdışıdır ve tüm veri cihazda
> şifreli tutulur (SQLCipher). Üç isteğe bağlı, varsayılan olarak kapalı
> özellik dış ağa çıkar:
>
> 1. **Anlam araması:** açıldığında CDN'den bir dil modeli indirilir ve
>    cihazda çalışır. Kullanıcı metni gönderilmez.
> 2. **Model cevabı:** kullanıcı kendi Anthropic API anahtarını girerse ve
>    arşivde "bu kayıtlardan bir cevap yaz" düğmesine basarsa, yalnızca o
>    aramada bulunan en fazla 4 kaydın metni doğrudan cihazdan
>    Anthropic'e gider. Bizim aracılık ettiğimiz bir sunucu yoktur.
> 3. **Cihazlar arası senkron:** açıldığında defter bir Postgres
>    veritabanında (Neon, AWS Frankfurt) saklanır. **Uçtan uca
>    şifrelidir:** her satır cihazda AES-256-GCM ile şifrelenir ve
>    şifre çözme anahtarı cihazdan hiç çıkmaz. Sunucu içeriği okuyamaz.
>    Hesap için e-posta, ad ya da telefon istenmez; kimlik, kullanıcının
>    cihazında üretilen bir koddan türetilir. Kullanıcı senkronu
>    kapattığında sunucudaki şifreli kopya silinir.
>
> Üçü de kapalıyken uygulama hiçbir ağ isteği yapmaz.
>
> **Kriz akışı hakkında:** uygulama kendine zarar verme işareti içeren bir
> kayıt yazıldığında bir *tıbbi değerlendirme yapmaz*. Teşhis koymaz, risk
> puanı üretmez, kimseye bildirim göndermez, hiçbir şey kaydetmez. Yaptığı
> tek şey o gün soru sormayı bırakmak ve sayfanın üstünde sakin bir kart
> göstermektir: acil durum numarası (112) ve bir yakınına başvurma
> önerisi. Bu değerlendirme cihazda, kural tabanlı olarak yapılır ve
> sonucu hiçbir yere yazılmaz.

---

## 4. Google Play — Data safety formu

| Soru | Cevap |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | Yok — veri toplanmıyor. (İsteğe bağlı çağrılar HTTPS.) |
| Do you provide a way for users to request that their data is deleted? | Evet — uygulama içinden defter ve kayıt silinebilir; uygulamayı kaldırmak da tüm veriyi siler. |

Play "Health" bölümü: **işaretlenmiyor.** Uygulama sağlık verisi
toplamıyor, ölçmüyor, değerlendirmiyor.

---

## 5. Açıklama metinleri

### Türkçe — App Store açıklaması

> Defter bir günlük. Sana bir şey satmıyor, seni ölçmüyor, ruh hâline not
> vermiyor.
>
> **Yazdığın yerde kalır.** Hesap yok, e-posta yok, parola yok. Her şey
> cihazında ve şifreli.
>
> **İstersen cihazların arasında eşitlenir** — ve o zaman bile defterini
> biz okuyamayız: her satır cihazında şifrelenip öyle gidiyor, anahtar
> cihazından hiç çıkmıyor. Sunucudaki kopya bizim için anlamsız bayt.
>
> **Sayfa sayfa dolar.** Defter dolduğunda cilt kapanır: ona bir ad
> verirsin, bir kapak seçersin ve bir sonrakine başlarsın. Kapanan cilde
> bir daha yazılmaz — ama kenarına not düşülebilir, yıllar sonra bile.
>
> **Arşiv uydurmaz.** Defterine bir soru sorduğunda cevap yalnızca senin
> yazdıklarından kurulur ve kullanılan kayıtlar cilt ve sayfa
> numarasıyla gösterilir. Yazmadığın bir şeyi uydurmaz; yazmadıysan bunu
> söyler.
>
> **Yakılan sayfa gerçekten yanar.** Söyleyemediğin şeyi yaz ve yak.
> Diske değmez, arşive girmez, geri getirilemez. Kaç kez yaktığın bile
> tutulmaz.
>
> **Kapsül.** Bugünden bir yıl sonraki kendine yaz. Yazdığın gün kapanır,
> tarihi gelene kadar açılmaz.
>
> — Gizlilik hakkında: uygulama varsayılan olarak tamamen çevrimdışıdır.
> Üç isteğe bağlı özellik (cihaz-içi anlam araması, kendi API anahtarınla
> model cevabı, ve uçtan uca şifreli senkron) ayarlardan açılabilir; her
> biri ne gönderdiğini açıkça söyler.
>
> — Defter bir tıbbi araç değildir. Teşhis koymaz, tedavi önermez.

### Anahtar kelimeler (App Store, 100 karakter)

```
günlük,defter,journal,diary,mahrem,şifreli,senkron,sync,anı,not,kapsül
```

### Promosyon metni (170 karakter)

> Hesapsız, uçtan uca şifreli bir günlük. Cihazların arasında eşitlenir
> ama sunucu okuyamaz. Arşiv yalnızca senin yazdıklarından cevap verir.

### English — App Store description

> Defter is a diary. It doesn't sell you anything, doesn't measure you,
> doesn't score your mood.
>
> **It stays where you wrote it.** No account, no email, no password.
> Everything lives encrypted on your device.
>
> **It syncs across your devices if you want it to** — and even then we
> cannot read your diary: every row is encrypted on your device before it
> leaves, and the key never goes anywhere. The copy on the server is
> meaningless bytes to us.
>
> **It fills page by page.** When the notebook is full, the volume
> closes: you name it, choose a cover, and start the next one. A closed
> volume can't be written in again — but you can still add a margin note,
> years later.
>
> **The archive doesn't invent.** Ask your diary a question and the
> answer is built only from what you wrote, with the volume and page
> number of every record it used. If you didn't write about it, it says
> so.
>
> **The burned page really burns.** Write the thing you can't say, then
> burn it. It never touches disk, never enters the archive, can't be
> recovered. Not even a counter is kept.
>
> **Capsule.** Write to yourself a year from now. It seals the day you
> write it and won't open until the date arrives.
>
> — On privacy: the app is fully offline by default. Three optional
> features (on-device semantic search, model answers using your own API
> key, and end-to-end encrypted sync) can be turned on in settings; each
> states exactly what it sends.
>
> — Defter is not a medical device. It does not diagnose or treat.

---

## 6. Ekran görüntüleri

`yayin/gorsel/` altında, `npm run gorsel` ile üretiliyor (bkz.
`app/arac/ekranGoruntusu.mjs`). Elle çekilmiyorlar: arayüz değişince
yeniden üretiliyorlar.

Ölçüler: iPhone 6.9" (1320×2868) ve iPad 13" (2064×2752). Play Store
telefon görselleri için iPhone dosyaları kullanılabilir.

Dosya adı `{dil}-{cihaz}-{sahne}.png`: her sahne **iki dilde** çekiliyor,
çünkü uygulama iki dilde yayınlanıyor ve mağaza görselleri o dilin
metinleriyle olmak zorunda. İngilizce görsellerde defter içeriği de
İngilizce örnek veridir.

| Sahne | Ne gösteriyor | Altyazı önerisi (TR / EN) |
|---|---|---|
| `1-defter` | Yazılmış bir sayfa, günün sorusu | Defterin sayfa sayfa dolar. / Your notebook fills page by page. |
| `2-arsiv` | Kaynaklı arşiv cevabı | Cevap yalnızca senin yazdıklarından. / Answers only from what you wrote. |
| `3-yakilan-sayfa` | Yanan metin | Yakılan sayfa gerçekten yanar. / The burned page really burns. |
| `4-kapsul` | Zaman kapsülü | Bir yıl sonraki kendine yaz. / Write to yourself a year from now. |
| `5-fihrist` | Fihrist | Yıllar sonra da bulunur. / Findable years later. |

**Görsellerdeki metin gerçek kullanıcı verisi değil**, `?tohum` ile
üretilen örnek defterdir.

---

## 7. Yayın öncesi kontrol listesi

- [ ] Gizlilik politikası bir adreste yayında (bkz. `yayin/gizlilik.md`)
- [ ] Destek adresi ve URL'si girildi
- [ ] `npm run gorsel` arayüzün son hâliyle koşturuldu
- [ ] Cihazda SQLCipher doğrulandı (tarayıcı derlemesi şifresiz — K-013)
- [ ] Cihazda biyometri doğrulandı (K-021)
- [ ] Cihazda gömü modeli indirmesi doğrulandı (K-029)
- [ ] Kriz kartının cihazda göründüğü ve kaydırıldığı doğrulandı (K-030)
- [ ] Model cevabı gerçek bir anahtarla cihazda denendi (K-031)
- [ ] **Senkron gerçek ağda uçtan uca denendi (K-036).** Bu geliştirme
      ortamının ağ politikası Neon'un auth uç noktasını engelledi;
      şu üçü doğrulanmadı:
      · sentetik `@defter.invalid` e-postayla kayıt gerçekten açılıyor mu
      · çerezli JWT akışı Capacitor webview'ında çalışıyor mu
      · iki AYRI hesapla RLS canlı olarak sızdırmıyor mu
      (Şema, politika ve rol yetkileri doğrulandı: `anonymous` rolünün
      tabloda hiçbir yetkisi yok.)
- [ ] Senkron açıkken mühürlü yedek ve geri yükleme denendi
- [ ] **İngilizce kriz kartındaki acil numara açığı kapatıldı (K-035).**
      Türkçe kart 112 diyor; İngilizce kart bir numara söylemiyor, çünkü
      uygulama kullanıcının ülkesini bilmiyor ve yanlış numara vermek hiç
      vermemekten kötü. İngilizce yayın bu çözülmeden yapılmamalı: ya
      güvenilir bir bölge kaynağı, ya kullanıcıya bir kez sorulan ülke.
- [ ] Ekran görüntüleri iki dilde de tazelendi (`npm run gorsel`)
