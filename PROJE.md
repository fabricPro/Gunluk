# DEFTER

Dolduğunda biten, sana soru soran, on yıl sonra sorduğunda cevap veren bir defter.

**Durum:** kavram demosu tamam (`defter.html`), üretim geliştirmesi başlıyor.
**Hedef:** App Store / Play Store, tüketici ürünü. Türkçe öncelikli, sonra İngilizce.
**Hedef kitle:** 18–30 yaş, günlük tutmak isteyip tutamayan insanlar.

---

## 1. Ürün tezi

Piyasadaki günlük uygulamaları iki gruba ayrılıyor:

- **Arşivciler** (Day One, Apple Journal) — mükemmel kaydediyorlar, hiçbir şey söylemiyorlar.
- **AI yorumcular** (Rosebud, Stoic, Mindsera) — sürekli yorum yapıyorlar, hepsi destekleyici, hiçbiri karşı çıkmıyor.

İkisinin de kaçırdığı şey aynı: **yazma isteğini üreten şey ne arşiv ne yorumdur.**

Bu ürün defter tarafından kuruluyor. AI yorumcu değil, arşivci. Sorulmadan konuşmaz.

**Satır:** Dolduğunda biten, sana soru soran, on yıl sonra sorduğunda cevap veren bir defter.

---

## 2. Değişmez ilkeler

Bu dördü ürünün kimliği. Bir özellik bunlardan biriyle çelişiyorsa özellik gider.

### 2.1 Kriz anında uygulama susar
Kendine zarar verme veya ağır bunalım işareti içeren bir kayıt **yorumlanmaz, analiz edilmez, örüntüye dahil edilmez, arşiv cevabında kullanılmaz.** Tek yapılan şey sessiz bir kart: gerçek desteğe yönlendirme (Türkiye'de 112, bir yakını). Alarm yok, bildirim yok, panik yok.

App Store incelemesi bunu soracak. Ondan önce biz çözmüş olacağız.

### 2.2 Yakılan sayfa gerçekten yanar
Hiçbir yere yazılmaz. Diske değmez, belleğe kalıcı düşmez, **sayaç bile tutulmaz.** "Kaç kez yaktın" bilgisi bile bu sözü bozar. Bu, kullanıcının en kötü şeyi yazmasını sağlayan tek mekanizma; bir kez sızarsa ürünün tamamı güvenilmez olur.

### 2.3 Ham metin cihazdan çıkmaz
Yazılanlar cihazda, şifreli. AI çağrısı gerekiyorsa yalnızca gereken parça, kullanıcının açık eylemiyle (soru sorması) gider. Arka planda sessizce hiçbir şey yüklenmez.

### 2.4 Arşiv uydurmaz
Cevap yalnızca kullanıcının kendi kayıtlarından kurulur ve **kullanılan kayıtlar her zaman gösterilir** (cilt + sayfa numarasıyla). Kayıt yoksa cevap: *"Bununla ilgili bir şey yazmamışsın. Yazmadığın bir şeyi uydurmam."*

---

## 3. Yapı

Üç ekran. Daha fazlası değil.

### DEFTER
Uygulamanın tamamı burası.
- **Ciltli ve sayfalı.** Defterin sayfa sayısını kullanıcı belirler (varsayılan 45). Sayfa kapasitesi ekrana göre ölçülür. Sonsuz kaydırma yok.
- Yazma yeri son sayfanın devamı — ayrı kutu, form, "yeni giriş" butonu yok.
- Sayfa çevirme: `‹ ›`, ok tuşları, dokunmatik kaydırma. Sayfa soldan menteşelenip döner.
- Yan kesit (sol şerit): her çizgi bir sayfa, ciltlere ayrılmış. Başlıklı sayfalar altın renkli.
- **Sayfa başlığı:** kullanıcı sayfaya ad verebilir. Başlık sayfa numarasına değil **içeriğe** bağlıdır (`tarih|kayıt` anahtarı) — yoksa yeni yazı eklendikçe başlıklar kayar.
- **Fihrist:** başlıklı sayfaların ciltlere göre listesi, noktalı satırlarla. Ciltlere ad verilebilir.
- **Kenar notu:** eski bir kayda sonradan düşülen not, kırmızı kalemle.
- Düzeltme iz bırakır (`· düzeltildi`). Kullanıcı geçmişini sessizce yeniden yazamaz. **Silme iz bırakmaz** — düzeltme metni değiştirir, silme yok eder; yok edilen bir geçmişin mezar taşı, silmek isteyen için hiç silmemekten kötüdür (KARARLAR.md · K-028).
- **Bugüne dön** düğmesi.
- **Kitaplık:** defter kapanır, raflar görünür. Birden çok defter, ad ve kapak; aynı adlı defterler cilt cilt devam eder. Sırta basılı tutunca defterin kartı açılır; defter buradan silinir — boşsa tek onayla, doluysa ancak adı yazılarak (KARARLAR.md · K-025).

### ARŞİV
Arama ve sorma. **Yorum yok.**
- Doğal dilde soru: *"şubatta neden bu kadar kötüydüm"*, *"kerem"*, *"annemle kavgalarım"*
- Cevap + kullanılan kayıtlar (cilt/sayfa ile). Kayda tıklayınca defterde o sayfa açılır, aranan kelime işaretli.
- **Bugün geçen sene** kartı.

### KAPSÜL
Kendine mektup.
- 1 hafta / 1 ay / 3 ay / 6 ay / 1 yıl / 5 yıl / özel tarih.
- Mühürlü — açılış gününe kadar kullanıcı da açamaz.
- Açıldığında **cevap yazılabilir.** Mektup ve cevabı yan yana durur, arada kaç gün geçtiği yazar.
- Asıl değer burada: insan kendi eski haline cevap yazarken ne kaybettiğini ve kazandığını görüyor.

### YAKILAN SAYFA
Ekran değil, eylem. Defterden çağrılır, uygulamayı tamamen dönüştürür (kor kızılı).
Tek düğme: **YAK**. Önce harfler kül olur, sonra kağıdın kendisi tutuşup ekrandan çıkar.

---

## 4. Tasarım dili

**Ana karar: kağıt gerçekten kağıt.** Karanlık ahşap masa üstünde ışık almış parşömen.

Bundan önceki tüm denemeler "profesyonel uygulama" gibi duruyordu, sebebi her yüzeyin aynı koyulukta olmasıydı. Ekranda **tek aydınlık yüzey** olmalı ve o sayfa olmalı.

```
masa      #12100C → #241D14   sıcak, koyu, ahşap
kağıt     #E0D4BA → #CBBD9C   parşömen, grain dokulu
mürekkep  #2C2118             siyah değil, koyu kahve
kırmızı   #A8402C             kenar notu / kalem
altın     #96661D             fihrist, cilt, başlık
kor       #C4462B / #F08A3C   yalnızca yakılan sayfada
```

- Yazı: Newsreader (serif, 18.5px, satır aralığı 1.74). Büyük yazı = itiraf, küçük yazı = doküman.
- Arayüz: Instrument Sans, küçük ve düşük kontrast.
- Çizgili kağıt **yok** — çizgi disiplin, disiplin ofis demek. Onun yerine grain dokusu.
- **Yazarken arayüz kaybolur.** Yazmaya başladıktan 2.6 saniye sonra üst şerit, araçlar, her şey soluyor.
- **Işık saate bağlı.** Bakılan sayfadaki kayıtların saatine göre kağıdın parlaklığı ve masa ışığı değişir. 02:14'teki sayfa loş, öğle sayfası açık.

---

## 5. Karar günlüğü

Bu bölüm `KARARLAR.md` dosyasına taşındı. Denenip bilerek kaldırılmış
yaklaşımlar (kuvvet ağı, tema çizelgesi, haftalık AI yorumu, sonsuz kaydırma
vb.) ve her birinin kaldırılma sebebi orada. Mimari kararlar da oraya
yazılıyor.

**Genel kural:** grafik ana olay değil. Bir görselleştirme eklerken sorulacak
soru "güzel mi" değil, **"kullanıcı bunu ikinci kez neden açsın"**.

---

## 6. Yol haritası

Sıra önemli. Her adım bir öncekine yaslanıyor.

### Faz 1 — Temel (önce bunlar)
1. ~~**Kalıcılık.**~~ **Tamam.** SQLite + SQLCipher, cihazda şifreli; göçler `PRAGMA user_version` ile numaralı (KARARLAR.md · K-002, K-008).
2. ~~**Boş defter / onboarding.**~~ **Tamam.** Karşılama ekranı yok: defter boş sayfayla açılıyor, yazma alanının üstünde günün sorusu duruyor. Yedi soru, sabit liste, yazılan güne göre ilerliyor. Sonrasında sorular susuyor, istenirse çağrılıyor (KARARLAR.md · K-019, K-020).
3. ~~**Cilt kapanma töreni.**~~ **Tamam.** Defter dolunca ad ver, kapak seç, uzat ya da kapat; kapanınca cildin özeti ve bir sonraki cilt. Sayfa sayısı artık her defterin kendi ölçüsü (KARARLAR.md · K-017, K-018).

### Faz 2 — Defterin geri kalanı
5. ~~Fotoğraf ve ek ekleme (bilet, ekran görüntüsü).~~ **Tamam.** Kayıt başına bir ek, sayfaya yapıştırılmış gibi duruyor ve sayfa bütçesinden pay alıyor. Görsel küçültülüp yeniden kodlanıyor — EXIF de böylece düşüyor (KARARLAR.md · K-023).
6. ~~Kullanıcının kenar notu düşebilmesi.~~ **Tamam.** Bir kayda yıllar içinde birden çok not; yazıldığı gün silinebilir, sonra kalıcı. Kapalı deftere de düşülebilir (KARARLAR.md · K-018, K-024).
7. ~~Gerçek kilit — PIN + biyometri.~~ **Tamam** (KARARLAR.md · K-021).
8. ~~Yedekleme ve dışa aktarma.~~ **Tamam.** Mühürlü yedek kurtarma kodundan türeyen anahtarla açılıyor; ayrıca şifresiz Markdown dışa aktarma var (KARARLAR.md · K-003, K-022).

### Faz 3 — Arşiv ve AI
9. ~~**Arama.**~~ **Tamam.** Türkçe gövdeleme (K-027) ve cihaz-içi gömü araması (K-029). "hissettiğim" artık "hissetmedim"i buluyor; anlam araması açılırsa "kötü hissettiğim günler" gibi sorular o sözcükler hiç geçmese de sonuç veriyor. Model cihazda çalışıyor — ~145 MB'lık isteğe bağlı indirme, varsayılan kapalı. Metin cihazdan çıkmıyor.
10. ~~Soru-cevap için model çağrısı — **kaynak kayıtlar her zaman gösterilecek.**~~ **Tamam.** Arama cihazda bitiyor; sonra ayrı bir düğme, en fazla 4 kaydı kullanıcının kendi Anthropic anahtarıyla doğrudan cihazdan gönderiyor — sunucu yok, düğmeye basılmadıkça tek bayt çıkmıyor. Cevaptaki `[2]` ile kaynak kartındaki `[2]` aynı kayıt. Kriz kaydı iki kez eleniyor (KARARLAR.md · K-031).
11. ~~Kriz sınıflandırıcısı ve akışı (2.1).~~ **Tamam.** Kural tabanlı, dar eşikli, cihazda; hiçbir yere yazılmıyor. Kriz kaydı arşiv cevabına ve tema sayımına girmiyor, o gün soru sorulmuyor, kağıdın üstünde sessiz bir kart 112'yi gösteriyor. Yakılan sayfada çalışmıyor (KARARLAR.md · K-030).
12. ~~İsteğe bağlı: her yazıdan sonra **tek soru.**~~ **Tamam.** Yorum değil, soru; yalnızca o kaydın metni gidiyor. **Otomatik değil:** ilke 2.3 "arka planda sessizce hiçbir şey yüklenmez" dediği için ayrı bir düğme — akış bedeli bilerek ödendi. Kriz günlerinde düğme hiç çıkmıyor (KARARLAR.md · K-032).

### Faz 4 — Yayın
13. ~~Gizlilik etiketleri, App Store metinleri, ekran görüntüleri.~~ **Tamam.** `yayin/` altında: mağaza metinleri (TR + EN), "Data Not Collected" beyanı, yaş sınırı cevapları, App Review notu ve gizlilik politikası. Ekran görüntüleri `npm run gorsel` ile üretiliyor — ilk koşuda dar ekranda **bırak düğmesinin ekran dışında kaldığını** buldu ve düzeltildi (KARARLAR.md · K-034).
14. İngilizce yerelleştirme.

---

## 7. Teknik notlar

- Demo tek dosya, **sıfır dış bağımlılık**, çevrimdışı çalışıyor. Bu sadelik korunmaya değer.
- Sayfa akışı: kayıtlar karakter maliyetine göre sayfalara akıtılıyor (`sayfalariKur()`). Kayıt eklendiğinde sayfalar yeniden hesaplanıyor.
- Türkçe ek uyumu için yardımcılar var (`ayEk`, `sayiEk`, `bas`). Tema/kişi adları kullanıcıdan geleceği için ilgi hâli (`tamlayan`) de gerekecek — demoda vardı, sonraki sürümde düştü, geri gelmeli.
- Sesli yazma: Web Speech API `tr-TR`. Native'de platformun kendi dikte servisi.
- El yazısı desteği kapsam dışı bırakıldı (KARARLAR.md · K-007). Kayıt metni düz metin.
- Arşiv cevabı üretimi (`soruCoz`) iki hata yaptı ve düzeltildi, tekrar etmesin:
  - Tema adı geçtiğinde havuz o temaya kilitlenmeli, yoksa alakasız kayıtlar sızıyor ("kerem hakkında ne yazdım" → "yazdım" kelimesi tez kayıtlarını topluyordu).
  - Dönem sorusunda (`şubatta…`) o ayın tamamı geçerli sayılmalı, yoksa hiç sonuç dönmüyor.
- **Model çağrısında en kritik nokta:** model cevabı yazar ama **hangi kayıtları göreceğini biz seçeriz.** Yanlış kayıt verilirse model güzel ve yanlış bir cümle kurar. Retrieval, üretimden daha önemli.
