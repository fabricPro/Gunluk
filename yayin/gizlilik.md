# Gizlilik politikası — Defter

Son güncelleme: 31 Ağustos 2026 · senkron eklendiğinde güncellendi

*(English version below.)*

## Kısa cevap

**Defter varsayılan ayarlarıyla hiçbir veri toplamaz.** Analitik yok,
reklam yok, izleme yok, hesap yok. Yazdıklarınız cihazınızda, şifreli
olarak durur.

**Cihazlar arası senkronu açarsanız** defteriniz bir sunucuda (Neon,
Frankfurt) yedeklenir — ama **şifreli olarak, ve biz onu okuyamayız.**
Her satır cihazınızda şifrelenir; şifre çözme anahtarı cihazınızdan hiç
çıkmaz. Sunucuda duran şey bizim için anlamsız bayt dizisidir.

Defterinizin bir kopyasını isteseniz size okunabilir hâlde veremeyiz —
elimizdeki şifreli bloğu açamayız, anahtarı yok.

## Ne saklanıyor, nerede

Günlük kayıtlarınız, kenar notlarınız, eklediğiniz görseller, defter
adlarınız ve ayarlarınız cihazınızdaki tek bir veritabanı dosyasında
tutulur. Bu dosya SQLCipher ile şifrelidir; şifreleme anahtarı iOS
Keychain / Android Keystore içinde saklanır ve cihazdan çıkmaz.

Uygulamayı kaldırdığınızda bu dosya da silinir.

## "Yakılan sayfa"

Yakılan sayfaya yazdığınız metin **hiçbir yere yazılmaz**: veritabanına
değmez, diske düşmez, geçici dosya bırakmaz. Kaç kez kullandığınız bile
sayılmaz.

## Cihazdan ne zaman bir şey çıkar

Uygulama varsayılan ayarlarıyla **tamamen çevrimdışıdır**. Üç isteğe
bağlı özellik açılırsa ağa çıkılır:

**1. Anlam araması (varsayılan kapalı).** Açtığınızda bir kerelik dil
modeli indirmesi yapılır (`cdn.jsdelivr.net`). Bu yalnızca bir
*indirmedir*: yazdığınız hiçbir metin gönderilmez. Model indikten sonra
cihazınızda çalışır.

**2. Model cevabı (varsayılan kapalı).** Bu özellik için kendi Anthropic
API anahtarınızı girmeniz gerekir. Arşivde arama yaptıktan sonra ayrı bir
düğmeye basarsanız, o aramada bulunan **en fazla 4 kaydın metni** ve
sorunuz doğrudan cihazınızdan `api.anthropic.com` adresine gider.
Aracılık ettiğimiz bir sunucu yoktur; istek bizim sistemlerimizden
geçmez. Defterinizin geri kalanı, defter adlarınız, başlıklarınız ve
görselleriniz gönderilmez.

Anthropic'e giden veri, Anthropic'in kendi koşullarına tabidir.

**"Yazdıktan sonra tek soru" (varsayılan kapalı)** de aynı anahtarı
kullanır ve yalnızca siz düğmeye bastığınızda, yalnızca o tek kaydın
metnini gönderir.

**3. Cihazlar arası senkron (varsayılan kapalı).** Açtığınızda defteriniz
`*.aws.neon.tech` üzerindeki bir Postgres veritabanında saklanır (AWS
Frankfurt, eu-central-1).

*Ne saklanır:* her kayıt, kenar notu, defter, başlık, ek ve kapsül için
bir satır — **hepsi cihazınızda AES-256-GCM ile şifrelenmiş hâlde.**
Şifre çözme anahtarı, ekranda size gösterilen **Defter Kimliği**'nden
cihazınızda türetilir ve hiçbir zaman gönderilmez.

*Sunucunun gördüğü üstveri (dürüst liste):* size ait opak bir hesap
kimliği, satır başına opak bir satır kimliği, bir sürüm sayacı, şifreli
verinin boyutu ve sunucuya ulaştığı an. Yani **kaç satırınız olduğu, ne
sıklıkta eşitlediğiniz ve kabaca ne kadar yazdığınız.**

*Sunucunun görmedikleri:* metninizin kendisi, kayıtların tarih ve
saatleri, defter adları, sayfa başlıkları, temalar, fotoğraflar, hangi
satırın silindiği. Yazma saatiniz de sızmaz: sıralama için duvar saati
değil mantıksal bir sayaç kullanılır.

*Hesap:* e-posta, ad, telefon ya da başka bir kimlik bilgisi istenmez.
Kimlik doğrulaması, Defter Kimliği'nden türetilen ve hiçbir yere
ulaşmayan sentetik bir adresle yapılır.

*Hesap:* kullanıcı adı ve şifreyle giriş yaparsınız. **Bunların ikisi de
sunucuya ulaşmaz.** Kullanıcı adı, şifreden anahtar üretilirken kullanılan
tuzun içinde kalır; sunucunun gördüğü tek şey ikisinden türeyen opak bir
kimliktir. E-posta, telefon ya da başka bir bilgi istenmez.

**Şifrenizi unutursanız sıfırlayamayız.** Sıfırlama, defterinizi açan
anahtarı sunucuda çözülebilir hâlde tutmayı gerektirirdi — yani bizim
okuyabilmemizi. İkinci yolunuz, hesap açarken bir kez gösterilen Defter
Kimliği'dir; onu bir yere yazın.

Hesap açmadan da kullanabilirsiniz. O zaman defter yalnızca cihazınızda
kalır ve tek bir istek bile çıkmaz.

*Hesap açarsanız* sunucuda ikinci bir şey daha durur:
**Defter Kimliği'nizin parolanızla şifrelenmiş bir kopyası.** Amacı,
tarayıcınızdaki her şey silinse bile defterinize geri dönebilmeniz.
Parolanız hiçbir zaman bize ulaşmaz; şifreyi açan anahtar ondan
cihazınızda türer, dolayısıyla o kopyayı biz de açamayız.

Dürüst olmak gerekirse bu bir bedeldir: kurtarma parolası açılmadan
sunucudaki defteri açmanın tek yolu 128 bitlik rastgele bir kodu
kırmaktır. Açtıktan sonra ikinci bir hedef doğar ve onu koruyan tek şey
parolanızın gücüdür. Bu yüzden en az 12 karakter isteniyor ve anahtar
kasa için bilerek daha yavaş üretiliyor. İstemezseniz açmayın; her şey
kurtarma parolası olmadan da çalışır.

*Tarayıcı sürümünde defteriniz de şifrelidir.* İlk açılışta bir parola
istenir; veritabanı yalnızca bellekte açılır ve diske o paroladan türeyen
anahtarla mühürlenmiş hâlde yazılır. Defter Kimliği ve model anahtarınız
da aynı anahtarla sarmalanır. Parolayı unutursanız o tarayıcıdaki defter
bir daha açılmaz; bizde bir kopyası yoktur.

*Tarayıcı sürümünde bir ara durak var.* `defter-umber.vercel.app`
adresinden kullandığınızda senkron istekleri veritabanına doğrudan değil,
bizim Vercel'deki ince bir vekilimiz üzerinden gider. Sebebi teknik:
tarayıcılar başka bir adrese giden oturum çerezlerini engelliyor, vekil
olmadan senkron tarayıcıda hiç çalışmazdı.

Vekilden **geçen**: oturum çereziniz, kimlik jetonunuz ve şifreli
bloklar. Vekilden **geçmeyen**: şifre çözme anahtarı ve metninizin
kendisi — ikisi de cihazınızdan hiç çıkmaz, dolayısıyla vekil de
okuyamaz. Vekil hiçbir kayıt tutmaz. Cihaz uygulamasında bu ara durak
yoktur; istek doğrudan gider.

*Silme:* ayarlardan senkronu kapattığınızda sunucudaki şifreli kopya
silinir. Bizden talep etmenize gerek yoktur.

*Defter Kimliği'ni kaybederseniz* sunucudaki kopya da açılamaz — biz de
açamayız. Bu kodu bilen kişi defterinizi okuyabilir; parolanız gibi
saklayın.

Bu üç özelliğin hepsi kapalıyken uygulama hiçbir ağ isteği yapmaz.

## Üçüncü taraflar

Reklam ağı, analitik sağlayıcı, çökme raporu servisi veya sosyal medya
SDK'sı kullanmıyoruz. Uygulamada üçüncü taraf izleyici yoktur.

Senkronu açarsanız şifreli veriniz **Neon** (Neon Inc.) tarafından
işletilen bir Postgres veritabanında, AWS Frankfurt bölgesinde saklanır.
Neon şifreli bloğu açamaz; anahtar bizde de onlarda da yoktur.

## Çocuklar

Uygulama 17 yaş altı için tasarlanmamıştır ve hiç kimseden yaş, ad,
e-posta veya başka bir kimlik bilgisi istemez.

## Haklarınız

Erişim, düzeltme ve silme tamamen sizin elinizde: kayıt, kenar notu,
defter ve uygulamanın tamamı uygulama içinden silinebilir. Senkron
açıksa, kapatmak sunucudaki şifreli kopyayı da siler.

Bize bir erişim talebi göndermeniz durumunda size verebileceğimiz tek
şey, hesabınıza ait şifreli blokların ham hâlidir — biz onları
okuyamayız.

## Değişiklikler

Bu politika değişirse üstündeki tarih güncellenir ve değişiklik
uygulamanın sürüm notlarında belirtilir.

## İletişim

[destek adresi buraya]

---

# Privacy Policy — Defter

Last updated: 31 August 2026 · updated when sync was added

## Short answer

**With default settings, Defter collects no data.** No analytics, no
advertising, no tracking, no accounts. What you write stays encrypted on
your device.

**If you turn on sync across devices,** your notebook is stored on a
server (Neon, Frankfurt) — but **encrypted, and we cannot read it.**
Every row is encrypted on your device; the decryption key never leaves
it. What sits on the server is meaningless bytes to us.

If you asked us for a readable copy of your diary, we could not provide
one — we cannot open the encrypted blocks we hold.

## What is stored, and where

Your entries, margin notes, attached images, notebook names and settings
are kept in a single database file on your device. That file is encrypted
with SQLCipher; the encryption key is held in the iOS Keychain / Android
Keystore and never leaves the device.

Removing the app deletes the file.

## The "burned page"

Text written on the burned page is **never written anywhere**: it does
not touch the database, does not reach disk, and leaves no temporary
file. Not even a usage counter is kept.

## When anything leaves the device

With default settings the app is **fully offline**. Three optional
features reach the network if you enable them:

**1. Semantic search (off by default).** Enabling it performs a one-time
language-model download from `cdn.jsdelivr.net`. This is a *download
only*: none of your text is sent. The model then runs on your device.

**2. Model answers (off by default).** This requires your own Anthropic
API key. After you run a search in the archive, pressing a separate
button sends your question and the text of **at most 4 matching entries**
directly from your device to `api.anthropic.com`. There is no server of
ours in between; the request does not pass through our systems. The rest
of your diary, your notebook names, titles and images are not sent.

Data sent to Anthropic is subject to Anthropic's own terms.

**"One question after writing" (off by default)** uses the same key and
sends only that single entry's text, and only when you press the button.

**3. Sync across devices (off by default).** When enabled, your notebook
is stored in a Postgres database on `*.aws.neon.tech` (AWS Frankfurt,
eu-central-1).

*What is stored:* one row for each entry, margin note, notebook, title,
attachment and capsule — **all encrypted on your device with
AES-256-GCM.** The decryption key is derived on your device from the
**Notebook Key** shown to you on screen, and is never transmitted.

*Metadata the server can see (the honest list):* an opaque account
identifier, an opaque row identifier per row, a version counter, the size
of the encrypted data, and when it arrived. That is: **how many rows you
have, how often you sync, and roughly how much you write.**

*What the server cannot see:* your text, the dates and times of entries,
notebook names, page titles, themes, photos, or which rows were deleted.
Your writing times do not leak either: ordering uses a logical counter,
not a wall clock.

*Account:* no email address, name, phone number or other identifying
information is requested. Authentication uses a synthetic address derived
from your Notebook Key that reaches nowhere.

*Deletion:* turning sync off in settings deletes the encrypted copy from
the server. There is nothing to request from us.

*If you lose your Notebook Key,* the copy on the server cannot be opened
— not by us either. Anyone who has this code can read your diary; keep it
like a password.

With all three features off, the app makes no network requests at all.

## Third parties

We use no advertising network, analytics provider, crash-reporting
service or social SDK. There are no third-party trackers in the app.

If you enable sync, your encrypted data is stored in a Postgres database
operated by **Neon** (Neon Inc.) in the AWS Frankfurt region. Neon cannot
open the encrypted blocks; neither we nor they hold the key.

*Accounts:* you sign in with a username and a password. **Neither of them
reaches the server.** The username stays inside the salt used to derive the
key from your password; all the server sees is an opaque identity derived
from the two. No email, no phone number, nothing else is asked for.

**If you forget your password we cannot reset it.** A reset would require
keeping the key that opens your notebook in a form the server could
decrypt — that is, in a form we could read. Your second way in is the
Notebook Key, shown once when you create the account; write it down.

You can also use the app without an account. Then the notebook stays on
your device and not a single request leaves it.

*If you have an account,* one more thing is kept on the
server: **a copy of your Notebook Key, encrypted with your passphrase.**
Its purpose is to let you get back into your notebook even if everything
in your browser is wiped. Your passphrase never reaches us; the key that
opens that copy is derived from it on your device, so we cannot open it
either.

To be honest about the cost: without a recovery passphrase, the only way
into the notebook on the server is breaking a 128-bit random code. With
one, a second target exists and the only thing protecting it is the
strength of your passphrase. That is why at least 12 characters are
required and why the key for the vault is deliberately slower to derive.
If you would rather not have it, don't set one — everything works
without it.

*In the browser your notebook is encrypted too.* On first open you are
asked for a passphrase; the database is opened in memory only and written
to disk sealed with a key derived from that passphrase. Your Notebook Key
and model key are wrapped with the same key. If you forget the passphrase
that notebook cannot be opened again; we hold no copy of it.

*The browser version has one stop in between.* When you use the app at
`defter-umber.vercel.app`, sync requests do not go to the database
directly but through a thin proxy of ours hosted on **Vercel**. The
reason is technical: browsers block session cookies sent to a different
address, and without the proxy sync would not work in a browser at all.

What passes through the proxy: your session cookie, your identity token
and the encrypted blocks. What does not: the decryption key and your text
— neither ever leaves your device, so the proxy cannot read them either.
The proxy keeps no logs. The device app has no such stop; requests go
directly.

## Children

The app is not designed for people under 17 and never asks anyone for an
age, name, email address or any other identifying information.

## Your rights

Access, correction and deletion are entirely in your hands: entries,
margin notes, notebooks and the whole app can be deleted from within the
app. If sync is on, turning it off also deletes the encrypted copy on the
server.

If you send us an access request, the only thing we could give you is the
raw encrypted blocks belonging to your account — we cannot read them.

## Changes

If this policy changes, the date above is updated and the change is noted
in the app's release notes.

## Contact

[support address here]
