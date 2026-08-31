# Gizlilik politikası — Defter

Son güncelleme: 31 Ağustos 2026

*(English version below.)*

## Kısa cevap

**Defter hiçbir veri toplamaz.** Sunucumuz yok, hesap sistemi yok,
analitik yok, reklam yok, izleme yok. Yazdıklarınız cihazınızda, şifreli
olarak durur ve oradan çıkmaz.

Bir kopyanızı isteseniz veremeyiz — bizde yok, çünkü bize hiç gelmedi.

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

Uygulama varsayılan ayarlarıyla **tamamen çevrimdışıdır**. İki isteğe
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

Bu özelliklerin ikisi de kapalıyken uygulama hiçbir ağ isteği yapmaz.

## Üçüncü taraflar

Reklam ağı, analitik sağlayıcı, çökme raporu servisi veya sosyal medya
SDK'sı kullanmıyoruz. Uygulamada üçüncü taraf izleyici yoktur.

## Çocuklar

Uygulama 17 yaş altı için tasarlanmamıştır ve hiç kimseden yaş, ad,
e-posta veya başka bir kimlik bilgisi istemez.

## Haklarınız

Verileriniz zaten yalnızca sizde olduğu için erişim, düzeltme ve silme
tamamen sizin elinizde: kayıt, kenar notu, defter ve uygulamanın tamamı
uygulama içinden silinebilir. Bizden talep etmenize gerek yoktur; zaten
bizde bir şey yoktur.

## Değişiklikler

Bu politika değişirse üstündeki tarih güncellenir ve değişiklik
uygulamanın sürüm notlarında belirtilir.

## İletişim

[destek adresi buraya]

---

# Privacy Policy — Defter

Last updated: 31 August 2026

## Short answer

**Defter collects no data.** We have no server, no accounts, no
analytics, no advertising, no tracking. What you write stays encrypted on
your device.

If you asked us for a copy of your diary, we could not provide one — we
do not have it, because it never reached us.

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

With default settings the app is **fully offline**. Two optional features
reach the network if you enable them:

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

With both features off, the app makes no network requests at all.

## Third parties

We use no advertising network, analytics provider, crash-reporting
service or social SDK. There are no third-party trackers in the app.

## Children

The app is not designed for people under 17 and never asks anyone for an
age, name, email address or any other identifying information.

## Your rights

Because your data exists only on your device, access, correction and
deletion are entirely in your hands: entries, margin notes, notebooks and
the whole app can be deleted from within the app. There is nothing to
request from us, because we hold nothing.

## Changes

If this policy changes, the date above is updated and the change is noted
in the app's release notes.

## Contact

[support address here]
