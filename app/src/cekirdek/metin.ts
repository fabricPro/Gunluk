/**
 * Arayüz dizeleri — iki dil, tek katalog.
 *
 * Anahtarlar öğe kimliklerini izliyor (`ay.kilit`, `yak.uyari`), böylece
 * bir dizeyi ekranda görüp koddaki yerini aramak gerekmiyor.
 *
 * **Çeviri değil, karşılık.** Türkçe metin kısa ve düz; İngilizcesi de
 * öyle olmak zorunda. Birebir çeviri İngilizcede tumturaklı düşüyordu;
 * cümleler yeniden kuruldu (KARARLAR.md · K-035).
 *
 * Bu dosya saf veri: hiçbir şey import etmiyor, hiçbir şey çağırmıyor.
 */
import type { Dil } from './dil.js'

export interface Metinler {
  [anahtar: string]: string
}

const TR: Metinler = {
  /* üst çubuk */
  'ust.marka': 'defter',
  'ust.defter': 'defter',
  'ust.arsiv': 'arşiv',
  'ust.kapsul': 'kapsül',
  'ust.ayarlar': 'ayarlar',
  'ust.kapat': 'kapat',

  /* defter araç çubuğu */
  'arac.geri': 'önceki sayfa',
  'arac.ileri': 'sonraki sayfa',
  'arac.bugune': 'bugüne dön',
  'arac.fihrist': 'fihrist',
  'arac.soruIste': 'bana bir şey sor',
  'arac.soruIsteBaska': 'başka bir şey sor',
  'arac.soruYazdan': 'yazdığıma bir soru sor',
  'arac.soruYaziliyor': 'soruluyor…',
  'arac.dikte': 'sesli yaz',
  'arac.ek': 'bir şey iliştir',
  'arac.ekBaska': 'başka bir şey iliştir',
  'arac.yak': 'yakılan sayfa',
  'arac.birak': 'bırak',

  /* defter sayfası */
  'defter.yaz': 'yaz…',
  'defter.yazSoruyla': 'buraya yaz…',
  'defter.bos': 'Defter boş.',
  'defter.bosAlt': 'İlk satırı yaz; sayfa kendiliğinden dolmaya başlar.',
  'defter.kapali': 'Bu defter kapandı. Buraya bir daha yazılmaz.',
  'defter.ozetGor': 'cildin özetini gör',
  'defter.dolu': 'Bu defter doldu.',
  'defter.torenAc': 'defteri kapat ya da uzat',
  'defter.ekKaldir': 'kaldır',
  'defter.duzelt': 'düzelt',
  'defter.kenarNotu': 'kenar notu',
  'defter.kaydet': 'kaydet',
  'defter.vazgec': 'vazgeç',
  'defter.sil': 'sil',
  'defter.kalan': 'kalan',

  /* arşiv */
  'arsiv.baslik': 'arşiv',
  'arsiv.sor': 'defterine sor…',
  'arsiv.ara': 'ara',
  'arsiv.ipucu':
    '«şubatta neden bu kadar kötüydüm» · «kerem» · «annemle kavgalarım»<br>' +
    'Cevap yalnızca senin yazdıklarından kurulur. Yazmadığın bir şey uydurulmaz.',
  'arsiv.et': 'yalnızca senin yazdıklarından',
  'arsiv.cevapEt': 'cevap',
  'arsiv.bos': 'Bununla ilgili bir şey yazmamışsın. Yazmadığın bir şeyi uydurmam.',
  'arsiv.kaynaklar': 'kullandığım kayıtlar',
  'arsiv.dokun': 'Kaydın üstüne dokun, defterde o sayfaya gider.',
  'arsiv.kenarNotu': 'kenar notu',
  'arsiv.yakin': 'aradığın sözcükler bu kayıtta geçmiyor — anlamca yakın',
  'arsiv.gecenYil': 'bugün, geçen sene',
  'arsiv.cilt': 'cilt',
  'arsiv.sayfa': 'sayfa',

  /* model cevabı */
  'model.yaz': 'bu {n} kayıttan bir cevap yaz',
  'model.yaziyor': 'yazıyor…',
  'model.yeniden': 'yeniden dene',
  'model.uyari':
    "Yalnızca yukarıdaki {n} kaydın metni Anthropic'e gider — defterin geri kalanı, " +
    'adı, başlıkları, fotoğrafları gitmez. Anahtar senin.',
  'model.et': 'model yazdı · kaynaklar yukarıda',
  'model.hata': 'Cevap alınamadı.',
  'model.soruHata': 'Soru alınamadı.',

  /* kapsül */
  'kapsul.baslik': 'zaman kapsülü',
  'kapsul.alt':
    'Kendine mektup yaz. Seçtiğin güne kadar mühürlü kalır — sen bile açamazsın.<br>' +
    'Açıldığında cevap yazarsın; mektup ve cevabı yan yana durur.',
  'kapsul.yer': 'sevgili ben,',
  'kapsul.neZaman': 'ne zaman açılsın',
  'kapsul.hafta1': '1 hafta',
  'kapsul.ay1': '1 ay',
  'kapsul.ay3': '3 ay',
  'kapsul.ay6': '6 ay',
  'kapsul.yil1': '1 yıl',
  'kapsul.yil5': '5 yıl',
  'kapsul.ozelTarih': 'kendi tarihini seç',
  'kapsul.muhurle': 'mühürle',

  /* fihrist */
  'fihrist.baslik': 'Fihrist',
  'fihrist.defteriBitir': 'bu defteri kapat',
  'fihrist.kapat': 'kapat',

  /* yakılan sayfa */
  'yak.uyari':
    'Bu sayfa <b>hiçbir yere kaydedilmiyor.</b> Aranamaz, geri getirilemez, arşive girmez. ' +
    'Yaktığında bir daha kimse — sen dahil — göremez.',
  'yak.yer': 'burada ne yazdığın kimseyi ilgilendirmiyor.',
  'yak.son': 'Gitti.',
  'yak.vazgec': 'vazgeç',
  'yak.yak': 'YAK',

  /* kilit ekranı */
  'kilit.marka': 'defter',
  'kilit.alt': 'kilitli',
  'kilit.biyo': 'biyometriyle aç',
  'kilit.parola': 'parola kullan',
  'kilit.pin': 'PIN kullan',
  'kilit.kurAlt': 'parola belirle',
  'kilit.karsilamaAlt': 'hoş geldin',
  'kilit.girisAlt': 'giriş yap',
  'kilit.hesapAlt': 'yeni defter',
  'kilit.adYer': 'kullanıcı adı',

  /* ayarlar */
  'ay.baslik': 'Ayarlar',
  'ay.kilit': 'Kilit',
  'ay.yedek': 'Yedek',
  'ay.yedekAlt':
    'Defterin tamamı tek dosyaya çıkar. Mühürlü yedek şifrelidir ve yalnızca ' +
    'kurtarma kodunla açılır; açık dışa aktarma şifresizdir, on yıl sonra bu ' +
    'uygulama olmasa da okunur.',
  'ay.yedekAl': 'mühürlü yedek al',
  'ay.geriYukle': 'yedekten geri yükle',
  'ay.mdAktar': 'Markdown olarak çıkar',
  'ay.gomu': 'Anlam araması',
  'ay.model': 'Model cevabı',
  'ay.dil': 'Dil',
  'ay.dilAlt':
    'Arayüz, defterin sorduğu sorular, arşivin cümleleri ve kriz sınıflandırıcısı ' +
    'seçtiğin dilde çalışır. Yazdıkların olduğu gibi kalır.',
  'ay.kapat': 'kapat',

  /* kurtarma kodu kartı */
  'kur.et': 'kurtarma kodu',
  'kur.baslik': 'Bunu bir yere yaz',
  'kur.metin':
    'Yedeğini yalnızca bu kod açar. Kaybedersen yedeğin de açılmaz — ' +
    'biz de açamayız, bir kopyası bizde yok.',
  'kur.kopyala': 'kopyala',
  'kur.kopyalandi': 'kopyalandı',
  'kur.onay': 'Bu kodu güvenli bir yere yazdım.',
  'kur.vazgec': 'vazgeç',
  'kur.devam': 'yedeği indir',

  /* kilit teklifi */
  'tek.et': 'bir öneri',
  'tek.baslik': 'Defterine kilit koymak ister misin?',
  'tek.metin':
    'Telefonun açıkken bile defter kapalı kalır. Bir PIN belirlersin, ' +
    'biyometrin varsa onunla açarsın. Sonra da kurabilirsin.',
  'tek.sonra': 'şimdi değil',
  'tek.kur': 'kilit kur',

  /* tören */
  'tor.et': 'bu defter doldu',
  'tor.ad': 'defterin adı',
  'tor.kapak': 'kapağı',
  'tor.uzat': 'biraz daha uzat',
  'tor.kapatDefter': 'bu defteri kapat',
  'tor.kacSayfa': 'kaç sayfa eklensin',

  /* kriz kartı — ilke 2.1 */
  'kriz.metin': 'Bunu yazdığın için bir şey söylemeyeceğim. Yalnızca burada duruyorum.',
  'kriz.yol':
    'Acil bir durumdaysan <b>112</b>. Yanında birini istersen, ' +
    'şu an arayabileceğin bir yakınını ara.',
  'kriz.kapat': 'kapat',

  'tor.uzatVaz': 'vazgeç',
  'tor.kapandi': 'kapandı',
  'tor.kitapliga': 'kitaplığa koy',

  /* kitaplık */
  'kit.baslik': 'kitaplık',
  'kit.geri': 'defterine dön',

  /* kayıt silme */
  'ks.baslik': 'Bu kayıt silinsin mi?',
  'ks.vazgec': 'vazgeç',
  'ks.sil': 'sil',

  /* defter silme */
  'dk.vazgec': 'vazgeç',
  'dk.aktar': 'önce Markdown olarak çıkar',

  /* yeni defter */
  'yd.baslik': 'Yeni defter',
  'yd.alt': 'Ad ver ve bir kapak seç. Aynı adda bir defterin varsa yenisi onun cildi olur.',
  'yd.ad': 'deftere bir ad ver…',
  'yd.sinir': 'kaç sayfa olsun',
  'yd.vazgec': 'vazgeç',
  'yd.ac': 'defteri aç',

  'defter.baslikEkle': 'başlık ekle',
  'defter.baslikDegistir': 'başlığı değiştir',
  'defter.duzeltildi': '· düzeltildi',
  'defter.duzeltmeIz': 'düzeltme iz bırakır',
  'defter.ekiKaldir': 'eki kaldır',
  'defter.sayfaNo': 'sayfa {n}/{t}',
  'defter.kapaliDefter': ' · kapalı defter',
  'defter.kalanSayfa': 'bu defterde {n} sayfa kaldı',
  'defter.dolduKisa': 'bu defter doldu',
  'defter.varsayilanAd': 'Defter',
  'defter.cilt': 'Cilt',
  'defter.kenarYer': 'bugünden bu kayda bir not düş…',
  'defter.kesitAlt': '{s} sayfa<br>{c} cilt<br>{k} kayıt',
  'defter.sayfaEt': 'sayfa {n}',
  'defter.birakKisayol': 'bırak <kbd>{k}</kbd>',
  'defter.dikteYok': 'bu tarayıcıda yok',
  'defter.dikteDili': 'tr-TR',
  'ks.kenarNotu1': '{n} kenar notu',
  'ks.kenarNotuN': '{n} kenar notu',
  'ks.birEk': 'bir ek',
  'ks.geriAlinamaz': 'Geri alınamaz.',
  /* {ek}: Türkçede "de/da" bağlacı, ünlü uyumuna göre (K-010). İngilizcede boş. */
  'ks.gidecek': 'Bu kayıtla birlikte {liste} {ek} gidecek. Geri alınamaz.',

  /* tören */
  'tor.kapatiyorsun': 'defteri kapatıyorsun',
  'tor.girisDolu': 'uzatabilirsin. Kapattığında bir daha yazamazsın.',
  'tor.girisErken': '{n} sayfa yazdın. Bu defteri şimdi kapatabilirsin — kapandıktan sonra buraya bir daha yazamazsın.',
  'tor.bosKapandi': 'Bu defter boş kapandı.',
  'tor.kayit': 'kayıt',
  'tor.gunYazdin': 'gün yazdın',
  'tor.gunSurdu': 'gün sürdü',
  'tor.enSik': 'en sık geçenler',
  'tor.adliSayfalar': 'ad verdiğin sayfalar',
  'tor.ilkYazdigin': 'ilk yazdığın',
  'tor.sonYazdigin': 'son yazdığın',
  'tor.yeniCilt': '{ad} · Cilt {n} aç',

  /* kapsül */
  'kap.acilacak': '{tarih} günü açılacak — {n} gün sonra. O güne kadar sen de açamazsın.',
  'kap.gecmisTarih': 'Geçmiş bir tarih seçilemez.',
  'kap.kalan': '{n} gün kaldı',
  'kap.yaklasikYil': ' · yaklaşık {n} yıl',
  'kap.cevabin': 'cevabın',
  'kap.cevapYer': 'o gün yazan bana…',

  /* fihrist */
  'fih.ozet': '{b} başlıklı sayfa · {s} sayfa · {c} cilt',
  'fih.ciltSayfa': '{n} sayfa',
  'fih.kapali': ' · kapalı',
  'fih.adDegistir': 'adı değiştir',
  'fih.adVer': 'deftere ad ver',
  'fih.ciltBos': 'Bu ciltte başlık yok. Bir sayfanın üstüne dokunup ad verebilirsin.',
  'fih.bos': 'Defter henüz boş. İlk sayfayı yazdığında burada görünecek.',

  /* kitaplık */
  'kit.kart': 'defterin kartı',
  'kit.ozet': '{d} defter · {k} kayıt',
  'kit.bos': 'Kitaplığın boş. Bir defter aç, adını ver, kapağını seç.',
  'kit.ipucu': 'sırtı sürükleyerek diz · <b>···</b> defterin kartını açar',
  'kit.defterBos': 'Bu defter boş — içinde hiç kayıt yok.',
  'kit.silUyari': 'Bu geri alınamaz. Silmeden önce yedek almak istersen aşağıdan çıkarabilirsin.',
  'kit.ayniAd': 'Bu adda bir defterin var — yenisi Cilt {n} olarak açılacak.',

  /* görsel */
  'gor.okunmadi': 'Bu dosya bir görsel değil ya da okunamadı.',
  'gor.islenemiyor': 'Bu tarayıcıda görsel işlenemiyor.',

  /* kilit ekranı */
  'kil.beklemeDk': 'Çok fazla deneme. {n} dakika sonra tekrar dene.',
  'kil.beklemeSn': 'Çok fazla deneme. {n} saniye sonra tekrar dene.',
  'kil.yanlis': 'Olmadı. Bir daha dene.',
  'kil.kurSor':
    'Bu tarayıcıdaki defterini bu parola açacak — en az {n} karakter. ' +
    'Unutursan defter bir daha açılmaz; bizde bir kopyası yok.',
  'kil.kurKisa': 'En az {n} karakter.',
  'kil.kurTekrar': 'Bir daha yaz.',
  'kil.kurUymadi': 'İkisi aynı değil. Baştan.',
  'kil.kurBekle': 'Anahtar hazırlanıyor…',
  'kil.girisBtn': 'giriş yap',
  'kil.hesapBtn': 'hesap aç',
  'kil.yerelBtn': 'bu cihazda kal',
  'kil.geri': 'geri',
  'kil.hesabimBtn': 'hesabımla gir',
  'kil.temizleOnay':
    'Bu cihazdaki defter SİLİNECEK.\n\nParolasını bilmiyorsan zaten ' +
    'açılamıyor; silinen şey erişilemez bir şey. Ama hesabın yoksa ' +
    'içeriği de gitmiş olacak — sunucuda kopyası yok.\n\nHesabın varsa ' +
    'defterin giriş yapınca sunucudan gelecek.\n\nDevam edilsin mi?',
  'kil.karsilama':
    'Hesabın varsa gir; defterin her cihazda seninle. Hesapsız da ' +
    'kullanabilirsin — o zaman defter yalnızca bu cihazda kalır ve tek ' +
    'bayt dışarı çıkmaz.',
  'kil.girisSor': 'Kullanıcı adın ve şifren.',
  'kil.girisBekle': 'Giriş yapılıyor…',
  'kil.girisOlmadi':
    'Bu kullanıcı adı ve şifreyle bir defter bulunamadı. Şifre yanlışsa ' +
    'başka bir hesaba bakmış oluyoruz — ikisini de kontrol et.',
  'kil.hesapSor':
    'Kullanıcı adı seç ve bir şifre yaz (en az {n} karakter). ' +
    'Şifreni unutursan defterin açılmaz; sıfırlama yok, bizde kopyası yok.',
  'kil.hesapBekle': 'Hesap açılıyor…',
  'kil.hesapOlmadi': 'Hesap açılamadı. Bağlantını kontrol et.',
  'kil.adKisa': 'Kullanıcı adı en az {n} karakter olmalı.',
  'kil.acilmadi':
    'Parola doğru ama defter açılamadı — bu tarayıcıdaki mühürlü dosya bozuk ' +
    'olabilir. Varsa mühürlü yedeğinden geri yükle; senkron açıksa başka bir ' +
    'cihazdan Defter Kimliğinle ulaşabilirsin.',

  /* ölçüm örneği — arayüzde görünmüyor, sayfa kapasitesi bununla ölçülüyor */
  'olcum.ornek':
    'Bugün yine erken kalktım ve pencereyi açtım, hava soğuktu. ' +
    'Aşağıda birileri konuşuyordu, uzun süre onları dinledim. ' +
    'Sonra çay koydum ve düşündüm ki bu aylarda ilk defa bir şey istiyorum. ',
  'olcum.gunBasligi': 'perşembe, 1 ocak 2026',

  'kap.muhurlu': 'mühürlü · {tarih} tarihinde yazıldı',
  'kap.muhurNot': 'Bu mektubu {tarih} gününe kadar sen bile açamazsın.',
  'kap.acildi': 'açıldı · {yaz} → {ac} · {n} gün beklendi',
  'kap.cevapYaz': 'bu mektuba cevap yaz',
  'kap.cevapEkle': 'cevabı ekle',
  'kit.icinde': 'İçinde <b>{k} kayıt</b>, <b>{g} gün</b>',
  'kit.kenarEk': ', <b>{n} kenar notu</b>',
  'kit.ekEk': ', <b>{n} ek</b>',
  'kit.tekGun': '.<br>{tarih} günü.',
  'kit.aralik': '.<br>{ilk} ile {son} arası.',
  'kit.nokta': '.',
  'tor.sayfaKisa': 's. {n}',

  /* ayarlar — kilit */
  'ay.pinKisa': 'En az 4 hane ya da karakter olmalı.',
  'ay.kilitAcikBiyo': 'Kilit açık. PIN ya da biyometriyle açılıyor.',
  'ay.kilitAcikPin': 'Kilit açık. Yalnızca PIN ile açılıyor.',
  'ay.kilitYok': 'Kilit kurulu değil — defter doğrudan açılıyor.',
  'ay.kilitKur': 'kilit kur',
  'ay.pinDegistir': 'PIN değiştir',
  'ay.biyoAc': 'biyometriyi aç',
  'ay.biyoKapat': 'biyometriyi kapat',
  'ay.kilitKaldir': 'kilidi kaldır',
  'ay.notSifresiz':
    'Kilit kurulu olmadığı için veritabanı <b>şifresiz</b> duruyor. Tarayıcıda ' +
    'defteri şifreleyen şey kilidin ta kendisi: parola olmadan mühürlenemez.',
  'ay.notKaliciDegil':
    'Bu tarayıcı depoyu <b>kalıcı</b> saymadı: yer sıkışırsa defteri silebilir. ' +
    'Mühürlü yedek al, ya da senkronu aç.',
  'ay.notTarayiciMuhur':
    'Bu tarayıcıda defter, parolandan türeyen anahtarla <b>mühürlü</b> duruyor; ' +
    'diskte açık hâli yok. Parolayı unutursan bu defter bir daha açılmaz — ' +
    'bizde kopyası yok. İki kaçış yolu var: mühürlü yedek dosyası ve senkron ' +
    'açıksa Defter Kimliği.',
  'ay.notBiyo':
    'Biyometri hızlıdır ama anahtarın açılabilir bir kopyasını cihazda bırakır. ' +
    'Yalnızca PIN istiyorsan biyometriyi kapalı bırak.',
  'ay.notModelAnahtar':
    'Kilit kurulu olmadığı için model anahtarı <b>korumasız</b> duruyor. Kilit ' +
    'kurunca o da mühürleniyor.',
  'ay.notPinUnutma':
    'PIN’i unutursan biyometri yolu açık kaldığı sürece defterine erişebilirsin. ' +
    'İkisini de kaybedersen defter açılmaz.',
  'ay.yeniPin': 'Yeni PIN (6 hane) ya da bir parola:',
  'ay.pinTekrar': 'Bir daha yaz:',
  'ay.pinFarkli': 'İkisi aynı değil.',
  'ay.biyoSor': 'Biyometriyle de açmak ister misin?',
  'ay.pinSuanki': 'Şu anki PIN:',
  'ay.pinYeni': 'Yeni PIN:',
  'ay.pinYanlis': 'Şu anki PIN yanlış.',
  'ay.biyoYok': 'Bu cihazda biyometri kullanılamıyor.',
  'ay.kilitKaldirOnay': 'Kilit kaldırılsın mı? Defter bundan sonra doğrudan açılır.',

  /* ayarlar — gömü */
  'ay.gomuKapaliMetin':
    'Kapalı. Açarsan defterin <b>anlamca</b> aranabilir olur — “kötü hissettiğim ' +
    'günler” gibi sorular, o sözcükler kayıtta geçmese de sonuç verir.<br>' +
    'Bir kerelik <b>~145 MB</b> indirilir ve cihazda kalır. ' +
    '<b>Yazdıkların cihazdan çıkmaz</b>: model metne gelir, metin modele gitmez.',
  'ay.gomuHata':
    'Bir sorun çıktı: {hata}<br>Arama bu sırada da çalışıyor, yalnızca anlam ' +
    'yakınlığı devre dışı.',
  'ay.gomuIsliyor': '{asama} — {biten}/{toplam} kayıt',
  'ay.gomuIndeksleniyor': 'indeksleniyor',
  'ay.gomuSirada': 'Açık. {n} kayıt sırada.',
  'ay.gomuBitti': 'Açık. {n} kayıt indekslendi.',
  'ay.gomuKapatBtn': 'kapat ve vektörleri sil',
  'ay.gomuAcBtn': 'indir ve aç',
  'ay.gomuKapatOnay': 'Anlam araması kapatılsın mı? İndekslenmiş vektörler silinir.',

  /* ayarlar — model */
  'ay.modelKapaliMetin':
    'Kapalı. Arşivdeki cevap şu an <b>senin kayıtlarından derlenmiş bir özet</b>; ' +
    'istersen aynı kayıtlardan bir modelin cümle kurmasını isteyebilirsin.<br>' +
    'Bunun için <b>kendi Anthropic API anahtarın</b> gerekiyor — sunucumuz yok, ' +
    'çağrı doğrudan bu cihazdan gider ve faturası sana yazılır.<br>' +
    'Arşivde ayrı bir düğme çıkar; ona basmadıkça <b>hiçbir şey cihazdan çıkmaz</b>. ' +
    'Bastığında da yalnızca ekranda gördüğün <b>en fazla 4 kayıt</b> gider.',
  'ay.modelAcikMetin':
    'Açık. Anahtar cihazda saklı (…{kuyruk}). Arşivde arama yaptıktan sonra ' +
    '“bu kayıtlardan bir cevap yaz” düğmesi çıkar. Düğmeye basmadıkça çağrı olmaz.<br>',
  'ay.modelSoruAcik':
    'Defterde de <b>“yazdığıma bir soru sor”</b> düğmesi var: son yazdığın kaydı ' +
    'gönderip tek bir soru getirir. Yorum değil, soru. Kriz işaretli bir kayıttan ' +
    'sonra o düğme hiç çıkmaz.',
  'ay.modelSoruKapali': 'Defterde yazdıktan sonra tek soru isteme kapalı.',
  'ay.modelSoruAcBtn': 'yazdıktan sonra soru iste',
  'ay.modelSoruKapatBtn': 'yazdıktan sonra soruyu kapat',
  'ay.modelAnahtarDegistir': 'anahtarı değiştir',
  'ay.modelAnahtarSil': 'anahtarı sil',
  'ay.modelAnahtarGir': 'anahtarımı gir',
  'ay.modelAnahtarSor': 'Anthropic API anahtarın (sk-ant-… ile başlar):',
  'ay.modelAnahtarBicim': 'Bu bir Anthropic anahtarına benzemiyor. sk-ant- ile başlaması gerekiyor.',
  'ay.modelAnahtarSilOnay': 'Anahtar silinsin mi? Model cevabı bir daha çağrılamaz.',

  /* ayarlar — yedek */
  'ay.yedekKod': 'Bu yedeğin kurtarma kodu:',
  'ay.yedekIcerik': 'Yedekte {n} kayıt var.',
  'ay.yedekSilinecek': 'Bu cihazdaki {n} kayıt SİLİNECEK ve yerine yedek geçecek.',
  'ay.yedekDevam': 'Devam edilsin mi?',
  'ay.yedekEmin': 'Emin misin? Bu geri alınamaz.',
  'ay.yedekYuklendi': 'Yedek geri yüklendi.',
  'ay.yedekAcilmadi': 'Yedek açılamadı.',

  /* kapak adları */
  'kapak.deri': 'Koyu deri',
  'kapak.bez': 'Bez',
  'kapak.kraft': 'Kraft',
  'kapak.murekkep': 'Mürekkep',
  'kapak.kiraz': 'Kiraz',
  'kapak.zeytin': 'Zeytin',
  'kapak.gece': 'Gece',
  'kapak.altin': 'Altın yaldız',
  'genel.anahtarYok': 'Anahtar girilmemiş.',
  'defter.kesitCilt': 'cilt <b>{n}</b>',

  /* ── senkron (K-036) ─────────────────────────────────── */
  'ay.senkron': 'Cihazlar arası senkron',
  'ay.senkronAcik':
    'Açık. Defterin <b>{n}</b> satırı sunucuda, hepsi şifreli (~{boyut}).',
  'ay.senkronBekleyen': '<br><b>{n}</b> değişiklik sırada.',
  'ay.senkronCalisiyor': '<br>{asama}…',
  'ay.senkronHata': '<br>Son deneme başarısız: {hata}',
  'ay.senkronSonSenkron': '<br>Son eşitleme: {zaman}',
  'ay.senkronHicSenkron': '<br>Henüz eşitlenmedi.',
  'ay.senkronSimdi': 'şimdi eşitle',
  'ay.senkronKimlikGoster': 'Defter Kimliğini göster',
  'ay.hesapYok':
    'Bu defter yalnızca bu cihazda. Hesap açarsan her cihazdan ulaşırsın ve ' +
    'buradaki kayıtlar da yüklenir.',
  'ay.hesapAcBtn': 'hesap aç ve buluta taşı',
  'ay.hesapAdSor': 'Kullanıcı adı (en az {n} karakter):',
  'ay.hesapSifreSor':
    'Şifre (en az {n} karakter). Unutursan defterin açılmaz — sıfırlama yok:',
  'ay.hesapAciliyor': 'Hesap açılıyor…',
  'ay.hesapOlmadi': 'Hesap açılamadı. Bağlantını kontrol et.',
  'ay.cikis': 'çıkış yap',
  'ay.cikisOnay':
    'Çıkış yapılsın mı?\n\nBu CİHAZDAKİ defter, kilit ve anahtarlar ' +
    'silinecek. Sunucudaki şifreli kopya DURUYOR: aynı kullanıcı adı ve ' +
    'şifreyle geri girersin.',
  'ay.senkronKilitli': 'Defter kilitliyken senkron durur — anahtar bellekte değil.',
  'ay.senkronTarayici':
    'Kilit kurulu olmadığı için Defter Kimliği <b>korumasız</b> duruyor. Kilit ' +
    'kurunca o da mühürleniyor.',

  /* Defter Kimliği kartı */
  'sk.et': 'Defter Kimliği',
  'sk.baslik': 'Bunu bir yere yaz',
  'sk.metin':
    'Diğer cihazda bu kodu yazacaksın. Sunucudaki şifreli kopyayı yalnızca bu ' +
    'kod açar — kaybedersen biz de açamayız, bir kopyası bizde yok. ' +
    'Bu kodu bilen defterini okuyabilir; parolan gibi sakla.',
  'sk.kopyala': 'kopyala',
  'sk.kopyalandi': 'kopyalandı',
  'sk.onay': 'Bu kodu güvenli bir yere yazdım.',
  'sk.vazgec': 'vazgeç',
  'sk.devam': 'senkronu başlat',
  'sk.kapat': 'kapat',

  /* ağ hataları — `veri/` katmanı da bu katalogdan okuyor */
  'ag.baglanilamadi': 'Bağlanılamadı. İnternet bağlantını kontrol et.',
  'ag.senkronOturum':
    'Oturum kurulamadı — tarayıcı çerezi engelliyor olabilir. Cihaz uygulamasında dene.',
  'ag.senkronKimlik': 'Defter Kimliği kabul edilmedi.',
  'ag.senkronSunucu': 'Sunucu şu an cevap vermiyor. Biraz sonra yeniden denenecek.',
  'ag.modelAnahtar': 'Anahtar kabul edilmedi. Ayarlardan kontrol et.',
  'ag.modelKota': 'Anthropic şu an istek almıyor (kota ya da hız sınırı). Biraz sonra dene.',
  'ag.modelGecersiz': 'İstek geçersiz sayıldı: {mesaj}',

  /* veri katmanı — kullanıcıya görünen hatalar */
  'veri.surumYeni': 'Daha yeni bir sürümle yazılmış defter eski uygulamayla açılamaz.',
  'veri.dokumDegil': 'Bu bir defter yedeği değil.',
  'veri.dokumYeni': 'Bu yedek daha yeni bir sürümle alınmış. Önce uygulamayı güncelle.',
  'veri.yedekDegil': 'Bu bir Defter yedeği değil.',
  'veri.yedekBicim': 'Bu yedeğin biçimi tanınmıyor.',
  'veri.kodGecersiz': 'Kurtarma kodu geçersiz.',
  'veri.kodAcmiyor': 'Kurtarma kodu bu yedeği açmıyor.',
  'veri.gzipYok': 'Bu yedek sıkıştırılmış ve bu ortam gzip açamıyor. Başka bir cihazda dene.',
  'veri.guvenliDepoYok': 'Cihazda güvenli anahtar deposu bulunamadı. Defter şifresiz açılmaz.',
  'veri.modelInmedi': 'Model indirilemedi — ağ bağlantını kontrol et.',
  'kilit.biyoSebep': 'Defterini aç',
  'kilit.biyoVazgec': 'Vazgeç',
}

const EN: Metinler = {
  'ust.marka': 'defter',
  'ust.defter': 'notebook',
  'ust.arsiv': 'archive',
  'ust.kapsul': 'capsule',
  'ust.ayarlar': 'settings',
  'ust.kapat': 'lock',

  'arac.geri': 'previous page',
  'arac.ileri': 'next page',
  'arac.bugune': 'back to today',
  'arac.fihrist': 'index',
  'arac.soruIste': 'ask me something',
  'arac.soruIsteBaska': 'ask me something else',
  'arac.soruYazdan': 'ask about what I wrote',
  'arac.soruYaziliyor': 'asking…',
  'arac.dikte': 'dictate',
  'arac.ek': 'attach something',
  'arac.ekBaska': 'attach something else',
  'arac.yak': 'burned page',
  'arac.birak': 'leave it',

  'defter.yaz': 'write…',
  'defter.yazSoruyla': 'write here…',
  'defter.bos': 'The notebook is empty.',
  'defter.bosAlt': 'Write the first line; the page starts filling on its own.',
  'defter.kapali': 'This notebook is closed. Nothing more can be written here.',
  'defter.ozetGor': 'see the volume summary',
  'defter.dolu': 'This notebook is full.',
  'defter.torenAc': 'close or extend the notebook',
  'defter.ekKaldir': 'remove',
  'defter.duzelt': 'edit',
  'defter.kenarNotu': 'margin note',
  'defter.kaydet': 'save',
  'defter.vazgec': 'cancel',
  'defter.sil': 'delete',
  'defter.kalan': 'left',

  'arsiv.baslik': 'archive',
  'arsiv.sor': 'ask your diary…',
  'arsiv.ara': 'search',
  'arsiv.ipucu':
    '«why was february so bad» · «kerem» · «arguments with my mother»<br>' +
    "The answer is built only from what you wrote. Nothing you didn't write is invented.",
  'arsiv.et': 'only from what you wrote',
  'arsiv.cevapEt': 'answer',
  'arsiv.bos': "You haven't written about this. I won't invent something you didn't write.",
  'arsiv.kaynaklar': 'the entries I used',
  'arsiv.dokun': 'Tap an entry to open that page in the notebook.',
  'arsiv.kenarNotu': 'margin note',
  'arsiv.yakin': "the words you searched for don't appear here — close in meaning",
  'arsiv.gecenYil': 'today, last year',
  'arsiv.cilt': 'volume',
  'arsiv.sayfa': 'page',

  'model.yaz': 'write an answer from these {n} entries',
  'model.yaziyor': 'writing…',
  'model.yeniden': 'try again',
  'model.uyari':
    'Only the text of the {n} entries above goes to Anthropic — not the rest of your ' +
    'diary, not its name, titles or photos. The key is yours.',
  'model.et': 'written by the model · sources above',
  'model.hata': "Couldn't get an answer.",
  'model.soruHata': "Couldn't get a question.",

  'kapsul.baslik': 'time capsule',
  'kapsul.alt':
    "Write yourself a letter. It stays sealed until the day you choose — you can't open it either.<br>" +
    'When it opens you write a reply; the letter and the reply sit side by side.',
  'kapsul.yer': 'dear me,',
  'kapsul.neZaman': 'when should it open',
  'kapsul.hafta1': '1 week',
  'kapsul.ay1': '1 month',
  'kapsul.ay3': '3 months',
  'kapsul.ay6': '6 months',
  'kapsul.yil1': '1 year',
  'kapsul.yil5': '5 years',
  'kapsul.ozelTarih': 'pick your own date',
  'kapsul.muhurle': 'seal it',

  'fihrist.baslik': 'Index',
  'fihrist.defteriBitir': 'close this notebook',
  'fihrist.kapat': 'close',

  'yak.uyari':
    'This page is <b>saved nowhere.</b> It cannot be searched, cannot be recovered, ' +
    'never enters the archive. Once burned, nobody — including you — can see it again.',
  'yak.yer': "what you write here is nobody's business.",
  'yak.son': 'Gone.',
  'yak.vazgec': 'cancel',
  'yak.yak': 'BURN',

  'kilit.marka': 'defter',
  'kilit.alt': 'locked',
  'kilit.biyo': 'unlock with biometrics',
  'kilit.parola': 'use a passphrase',
  'kilit.pin': 'use a PIN',
  'kilit.kurAlt': 'set a passphrase',
  'kilit.karsilamaAlt': 'welcome',
  'kilit.girisAlt': 'sign in',
  'kilit.hesapAlt': 'new notebook',
  'kilit.adYer': 'username',

  'ay.baslik': 'Settings',
  'ay.kilit': 'Lock',
  'ay.yedek': 'Backup',
  'ay.yedekAlt':
    'The whole notebook goes into a single file. A sealed backup is encrypted and opens ' +
    'only with your recovery code; a plain export is unencrypted and will still be ' +
    'readable in ten years, with or without this app.',
  'ay.yedekAl': 'take a sealed backup',
  'ay.geriYukle': 'restore from backup',
  'ay.mdAktar': 'export as Markdown',
  'ay.gomu': 'Semantic search',
  'ay.model': 'Model answers',
  'ay.dil': 'Language',
  'ay.dilAlt':
    "The interface, the notebook's questions, the archive's sentences and the crisis " +
    'classifier all run in the language you choose. What you wrote stays as it is.',
  'ay.kapat': 'close',

  'kur.et': 'recovery code',
  'kur.baslik': 'Write this down somewhere',
  'kur.metin':
    "Only this code opens your backup. Lose it and the backup won't open either — " +
    "we can't open it for you, we don't have a copy.",
  'kur.kopyala': 'copy',
  'kur.kopyalandi': 'copied',
  'kur.onay': "I've written this code down somewhere safe.",
  'kur.vazgec': 'cancel',
  'kur.devam': 'download the backup',

  'tek.et': 'a suggestion',
  'tek.baslik': 'Want to put a lock on your notebook?',
  'tek.metin':
    'The notebook stays closed even while your phone is open. You set a PIN, and if you ' +
    'have biometrics you unlock with those. You can also set it up later.',
  'tek.sonra': 'not now',
  'tek.kur': 'set up a lock',

  'tor.et': 'this notebook is full',
  'tor.ad': "the notebook's name",
  'tor.kapak': 'its cover',
  'tor.uzat': 'extend it a little',
  'tor.kapatDefter': 'close this notebook',
  'tor.kacSayfa': 'how many pages to add',

  'kriz.metin': "I'm not going to say anything about what you wrote. I'm just here.",
  'kriz.yol':
    'If this is an emergency, call your local emergency number. If you want someone ' +
    'with you, call someone close to you now.',
  'kriz.kapat': 'close',

  'tor.uzatVaz': 'cancel',
  'tor.kapandi': 'closed',
  'tor.kitapliga': 'put it on the shelf',

  'kit.baslik': 'library',
  'kit.geri': 'back to your notebook',

  'ks.baslik': 'Delete this entry?',
  'ks.vazgec': 'cancel',
  'ks.sil': 'delete',

  'dk.vazgec': 'cancel',
  'dk.aktar': 'export as Markdown first',

  'yd.baslik': 'New notebook',
  'yd.alt': 'Give it a name and pick a cover. If you already have one with this name, the new one becomes its next volume.',
  'yd.ad': 'give the notebook a name…',
  'yd.sinir': 'how many pages',
  'yd.vazgec': 'cancel',
  'yd.ac': 'open the notebook',

  'defter.baslikEkle': 'add a title',
  'defter.baslikDegistir': 'change the title',
  'defter.duzeltildi': '· edited',
  'defter.duzeltmeIz': 'editing leaves a mark',
  'defter.ekiKaldir': 'remove the attachment',
  'defter.sayfaNo': 'page {n}/{t}',
  'defter.kapaliDefter': ' · closed notebook',
  'defter.kalanSayfa': '{n} pages left in this notebook',
  'defter.dolduKisa': 'this notebook is full',
  'defter.varsayilanAd': 'Notebook',
  'defter.cilt': 'Volume',
  'defter.kenarYer': 'add a note to this entry from today…',
  'defter.kesitAlt': '{s} pages<br>{c} volumes<br>{k} entries',
  'defter.sayfaEt': 'page {n}',
  'defter.birakKisayol': 'leave it <kbd>{k}</kbd>',
  'defter.dikteYok': 'not available in this browser',
  'defter.dikteDili': 'en-US',
  'ks.kenarNotu1': '{n} margin note',
  'ks.kenarNotuN': '{n} margin notes',
  'ks.birEk': 'an attachment',
  'ks.geriAlinamaz': 'This cannot be undone.',
  'ks.gidecek': 'Deleting this entry also removes {liste}{ek}. This cannot be undone.',

  'tor.kapatiyorsun': "you're closing the notebook",
  'tor.girisDolu': 'you can extend it. Once closed, you cannot write here again.',
  'tor.girisErken': 'You wrote {n} pages. You can close this notebook now — once closed, you cannot write here again.',
  'tor.bosKapandi': 'This notebook closed empty.',
  'tor.kayit': 'entries',
  'tor.gunYazdin': 'days you wrote',
  'tor.gunSurdu': 'days it lasted',
  'tor.enSik': 'most frequent',
  'tor.adliSayfalar': 'pages you named',
  'tor.ilkYazdigin': 'the first thing you wrote',
  'tor.sonYazdigin': 'the last thing you wrote',
  'tor.yeniCilt': 'open {ad} · Volume {n}',

  'kap.acilacak': 'It opens on {tarih} — {n} days from now. Until then you cannot open it either.',
  'kap.gecmisTarih': 'A past date cannot be chosen.',
  'kap.kalan': '{n} days left',
  'kap.yaklasikYil': ' · about {n} years',
  'kap.cevabin': 'your reply',
  'kap.cevapYer': 'to the one who wrote that day…',

  'fih.ozet': '{b} titled pages · {s} pages · {c} volumes',
  'fih.ciltSayfa': '{n} pages',
  'fih.kapali': ' · closed',
  'fih.adDegistir': 'change the name',
  'fih.adVer': 'name the notebook',
  'fih.ciltBos': 'No titles in this volume. Tap the top of a page to name it.',
  'fih.bos': 'The notebook is still empty. It will show up here once you write the first page.',

  'kit.kart': "the notebook's card",
  'kit.ozet': '{d} notebooks · {k} entries',
  'kit.bos': 'Your library is empty. Open a notebook, name it, pick a cover.',
  'kit.ipucu': 'drag a spine to rearrange · <b>···</b> opens the notebook card',
  'kit.defterBos': 'This notebook is empty — it holds no entries.',
  'kit.silUyari': 'This cannot be undone. If you want a backup first, you can export it below.',
  'kit.ayniAd': 'You already have a notebook with this name — the new one opens as Volume {n}.',

  'gor.okunmadi': "This file isn't an image, or it couldn't be read.",
  'gor.islenemiyor': "This browser can't process images.",

  'kil.beklemeDk': 'Too many attempts. Try again in {n} minutes.',
  'kil.beklemeSn': 'Too many attempts. Try again in {n} seconds.',
  'kil.yanlis': "That didn't work. Try again.",
  'kil.kurSor':
    'This passphrase will open your notebook in this browser — at least {n} ' +
    'characters. If you forget it the notebook cannot be opened again; we ' +
    'hold no copy of it.',
  'kil.kurKisa': 'At least {n} characters.',
  'kil.kurTekrar': 'Type it once more.',
  'kil.kurUymadi': "Those two don't match. Start over.",
  'kil.kurBekle': 'Preparing the key…',
  'kil.girisBtn': 'sign in',
  'kil.hesapBtn': 'create an account',
  'kil.yerelBtn': 'keep it on this device',
  'kil.geri': 'back',
  'kil.hesabimBtn': 'use my account',
  'kil.temizleOnay':
    'The notebook ON THIS DEVICE will be DELETED.\n\nIf you do not know its ' +
    'passphrase it cannot be opened anyway, so what goes is something you ' +
    'cannot reach. But if you have no account its contents are gone too — ' +
    'there is no copy on the server.\n\nIf you do have an account, your ' +
    'notebook comes back when you sign in.\n\nContinue?',
  'kil.karsilama':
    'Sign in if you have an account and your notebook follows you to every ' +
    'device. You can also use it without one — then the notebook stays on ' +
    'this device and not a single byte leaves it.',
  'kil.girisSor': 'Your username and password.',
  'kil.girisBekle': 'Signing in…',
  'kil.girisOlmadi':
    'No notebook was found for that username and password. A wrong password ' +
    'points at a different account — check both.',
  'kil.hesapSor':
    'Pick a username and a password (at least {n} characters). If you forget ' +
    'the password your notebook cannot be opened; there is no reset and we ' +
    'hold no copy.',
  'kil.hesapBekle': 'Creating the account…',
  'kil.hesapOlmadi': 'The account could not be created. Check your connection.',
  'kil.adKisa': 'The username must be at least {n} characters.',
  'kil.acilmadi':
    'The passphrase is right but the notebook would not open — the sealed file ' +
    'in this browser may be damaged. Restore from a sealed backup if you have ' +
    'one; if sync is on you can reach it from another device with your ' +
    'Notebook Key.',

  'olcum.ornek':
    'I got up early again and opened the window; the air was cold. ' +
    'Someone was talking down in the street and I listened to them for a long while. ' +
    'Then I made tea and thought that for the first time in months I want something. ',
  'olcum.gunBasligi': 'thursday, 1 January 2026',

  'kap.muhurlu': 'sealed · written on {tarih}',
  'kap.muhurNot': "Not even you can open this letter before {tarih}.",
  'kap.acildi': 'opened · {yaz} → {ac} · waited {n} days',
  'kap.cevapYaz': 'write a reply to this letter',
  'kap.cevapEkle': 'add the reply',
  'kit.icinde': 'It holds <b>{k} entries</b> across <b>{g} days</b>',
  'kit.kenarEk': ', <b>{n} margin notes</b>',
  'kit.ekEk': ', <b>{n} attachments</b>',
  'kit.tekGun': '.<br>On {tarih}.',
  'kit.aralik': '.<br>From {ilk} to {son}.',
  'kit.nokta': '.',
  'tor.sayfaKisa': 'p. {n}',

  'ay.pinKisa': 'It must be at least 4 digits or characters.',
  'ay.kilitAcikBiyo': 'The lock is on. It opens with a PIN or biometrics.',
  'ay.kilitAcikPin': 'The lock is on. It opens with a PIN only.',
  'ay.kilitYok': 'No lock is set — the notebook opens directly.',
  'ay.kilitKur': 'set up a lock',
  'ay.pinDegistir': 'change PIN',
  'ay.biyoAc': 'turn on biometrics',
  'ay.biyoKapat': 'turn off biometrics',
  'ay.kilitKaldir': 'remove the lock',
  'ay.notSifresiz':
    'With no lock set the database sits <b>unencrypted</b>. In a browser the lock ' +
    'is the encryption: without a passphrase there is nothing to seal it with.',
  'ay.notKaliciDegil':
    'This browser did not mark the storage as <b>persistent</b>: it may delete the ' +
    'notebook when space runs low. Take a sealed backup, or turn on sync.',
  'ay.notTarayiciMuhur':
    'In this browser the notebook is <b>sealed</b> with a key derived from your ' +
    'passphrase; no open copy is on disk. Forget the passphrase and this notebook ' +
    'cannot be opened again — we hold no copy. Two ways out: a sealed backup file, ' +
    'and, if sync is on, your Notebook Key.',
  'ay.notBiyo':
    'Biometrics are fast, but they leave an openable copy of the key on the device. ' +
    'If you want the PIN alone, leave biometrics off.',
  'ay.notModelAnahtar':
    'With no lock set the model key sits <b>unprotected</b>. Setting a lock seals ' +
    'it too.',
  'ay.notPinUnutma':
    'If you forget the PIN you can still get in while the biometric path is on. ' +
    'Lose both and the notebook will not open.',
  'ay.yeniPin': 'New PIN (6 digits) or a passphrase:',
  'ay.pinTekrar': 'Type it again:',
  'ay.pinFarkli': "Those two don't match.",
  'ay.biyoSor': 'Open with biometrics as well?',
  'ay.pinSuanki': 'Current PIN:',
  'ay.pinYeni': 'New PIN:',
  'ay.pinYanlis': 'The current PIN is wrong.',
  'ay.biyoYok': 'Biometrics are not available on this device.',
  'ay.kilitKaldirOnay': 'Remove the lock? The notebook will open directly from now on.',

  'ay.gomuKapaliMetin':
    'Off. Turn it on and your notebook becomes searchable <b>by meaning</b> — a question ' +
    'like “the days I felt bad” returns results even when those words never appear.<br>' +
    'A one-time <b>~145 MB</b> download stays on the device. ' +
    '<b>What you write never leaves the device</b>: the model comes to the text, the ' +
    'text does not go to the model.',
  'ay.gomuHata':
    'Something went wrong: {hata}<br>Search still works meanwhile; only the meaning ' +
    'match is off.',
  'ay.gomuIsliyor': '{asama} — {biten}/{toplam} entries',
  'ay.gomuIndeksleniyor': 'indexing',
  'ay.gomuSirada': 'On. {n} entries queued.',
  'ay.gomuBitti': 'On. {n} entries indexed.',
  'ay.gomuKapatBtn': 'turn off and delete the vectors',
  'ay.gomuAcBtn': 'download and turn on',
  'ay.gomuKapatOnay': 'Turn off semantic search? The indexed vectors will be deleted.',

  'ay.modelKapaliMetin':
    'Off. The archive answer is currently <b>a summary assembled from your own ' +
    'entries</b>; if you like, a model can put those same entries into sentences.<br>' +
    'That needs <b>your own Anthropic API key</b> — we have no server, the call goes ' +
    'straight from this device, and it is billed to you.<br>' +
    'A separate button appears in the archive; until you press it <b>nothing leaves ' +
    'the device</b>. When you do, only the <b>4 entries at most</b> you see on screen go.',
  'ay.modelAcikMetin':
    'On. The key is stored on the device (…{kuyruk}). After a search in the archive a ' +
    '“write an answer from these entries” button appears. No call happens until you ' +
    'press it.<br>',
  'ay.modelSoruAcik':
    'The notebook also shows an <b>“ask about what I wrote”</b> button: it sends your ' +
    'last entry and brings back one question. A question, not a comment. It never ' +
    'appears after an entry with a crisis sign.',
  'ay.modelSoruKapali': 'Asking for a question after writing is off.',
  'ay.modelSoruAcBtn': 'ask a question after writing',
  'ay.modelSoruKapatBtn': 'stop asking after writing',
  'ay.modelAnahtarDegistir': 'change the key',
  'ay.modelAnahtarSil': 'delete the key',
  'ay.modelAnahtarGir': 'enter my key',
  'ay.modelAnahtarSor': 'Your Anthropic API key (starts with sk-ant-…):',
  'ay.modelAnahtarBicim': "That doesn't look like an Anthropic key. It should start with sk-ant-.",
  'ay.modelAnahtarSilOnay': 'Delete the key? Model answers can no longer be requested.',

  'ay.yedekKod': "This backup's recovery code:",
  'ay.yedekIcerik': 'The backup holds {n} entries.',
  'ay.yedekSilinecek': 'The {n} entries on this device WILL BE DELETED and replaced by the backup.',
  'ay.yedekDevam': 'Continue?',
  'ay.yedekEmin': 'Are you sure? This cannot be undone.',
  'ay.yedekYuklendi': 'The backup has been restored.',
  'ay.yedekAcilmadi': "The backup couldn't be opened.",

  'kapak.deri': 'Dark leather',
  'kapak.bez': 'Cloth',
  'kapak.kraft': 'Kraft',
  'kapak.murekkep': 'Ink',
  'kapak.kiraz': 'Cherry',
  'kapak.zeytin': 'Olive',
  'kapak.gece': 'Night',
  'kapak.altin': 'Gold leaf',
  'genel.anahtarYok': 'No key has been entered.',
  'defter.kesitCilt': 'vol. <b>{n}</b>',

  'ay.senkron': 'Sync across devices',
  'ay.senkronAcik':
    'On. <b>{n}</b> rows of your notebook are on the server, all encrypted (~{boyut}).',
  'ay.senkronBekleyen': '<br><b>{n}</b> changes queued.',
  'ay.senkronCalisiyor': '<br>{asama}…',
  'ay.senkronHata': '<br>Last attempt failed: {hata}',
  'ay.senkronSonSenkron': '<br>Last sync: {zaman}',
  'ay.senkronHicSenkron': '<br>Not synced yet.',
  'ay.senkronSimdi': 'sync now',
  'ay.senkronKimlikGoster': 'show the Notebook Key',
  'ay.hesapYok':
    'This notebook is on this device only. Create an account and you reach it ' +
    'from every device — what is here gets uploaded too.',
  'ay.hesapAcBtn': 'create an account and move to the cloud',
  'ay.hesapAdSor': 'Username (at least {n} characters):',
  'ay.hesapSifreSor':
    'Password (at least {n} characters). If you forget it your notebook cannot ' +
    'be opened — there is no reset:',
  'ay.hesapAciliyor': 'Creating the account…',
  'ay.hesapOlmadi': 'The account could not be created. Check your connection.',
  'ay.cikis': 'sign out',
  'ay.cikisOnay':
    'Sign out?\n\nThe notebook, the lock and the keys ON THIS DEVICE will be ' +
    'deleted. The encrypted copy on the server STAYS: sign back in with the ' +
    'same username and password.',
  'ay.senkronKilitli': 'Sync pauses while the notebook is locked — the key is not in memory.',
  'ay.senkronTarayici':
    'With no lock set your Notebook Key sits <b>unprotected</b>. Setting a lock ' +
    'seals it too.',

  'sk.et': 'Notebook Key',
  'sk.baslik': 'Write this down somewhere',
  'sk.metin':
    'You will type this code on your other device. It is the only thing that ' +
    "opens the encrypted copy on the server — lose it and we can't open it " +
    'either, we have no copy. Anyone who has this code can read your diary; ' +
    'keep it like a password.',
  'sk.kopyala': 'copy',
  'sk.kopyalandi': 'copied',
  'sk.onay': "I've written this code down somewhere safe.",
  'sk.vazgec': 'cancel',
  'sk.devam': 'start syncing',
  'sk.kapat': 'close',

  'ag.baglanilamadi': "Couldn't connect. Check your internet connection.",
  'ag.senkronOturum':
    "Couldn't sign in — your browser may be blocking cookies. Try the device app.",
  'ag.senkronKimlik': 'The Notebook Key was not accepted.',
  'ag.senkronSunucu': "The server isn't responding right now. It will retry shortly.",
  'ag.modelAnahtar': 'The key was not accepted. Check it in settings.',
  'ag.modelKota': "Anthropic isn't accepting requests right now (quota or rate limit). Try later.",
  'ag.modelGecersiz': 'The request was rejected: {mesaj}',

  'veri.surumYeni': 'A notebook written by a newer version cannot be opened by an older app.',
  'veri.dokumDegil': 'This is not a notebook backup.',
  'veri.dokumYeni': 'This backup was made with a newer version. Update the app first.',
  'veri.yedekDegil': 'This is not a Defter backup.',
  'veri.yedekBicim': "This backup's format is not recognised.",
  'veri.kodGecersiz': 'The recovery code is not valid.',
  'veri.kodAcmiyor': 'That recovery code does not open this backup.',
  'veri.gzipYok': 'This backup is compressed and this environment cannot unzip it. Try another device.',
  'veri.guvenliDepoYok': 'No secure key store found on this device. The notebook will not open unencrypted.',
  'veri.modelInmedi': "The model couldn't be downloaded — check your connection.",
  'kilit.biyoSebep': 'Open your notebook',
  'kilit.biyoVazgec': 'Cancel',
}

export const METIN: Record<Dil, Metinler> = { tr: TR, en: EN }

/* ── etkin dil ─────────────────────────────────────────────
   Dil `cekirdek/`te tutuluyor, `ekran/`da değil: `veri/senkronDepo.ts`
   ve `veri/model.ts` de kullanıcıya gösterilecek hata cümlesi kuruyor
   ve o cümleler de çevrilmek zorunda. Katman kuralı gereği `veri/`
   `ekran/`dan bir şey alamaz (KARARLAR.md · K-035, K-036).

   Dil açılışta bir kez kuruluyor ve değişince sayfa yeniden yükleniyor;
   modül düzeyinde tek bir değer yeterli. */

let aktifDil: Dil = 'tr'

export const dil = (): Dil => aktifDil

export const dilAyarla = (d: Dil): void => {
  aktifDil = d
}

/** Katalogdan dize; `{n}` gibi yer tutucular ikinci argümanla dolar. */
export function S(anahtar: string, degerler?: Record<string, string | number>): string {
  let m = METIN[aktifDil][anahtar] ?? METIN.tr[anahtar] ?? anahtar
  if (degerler)
    for (const [k, v] of Object.entries(degerler)) m = m.split(`{${k}}`).join(String(v))
  return m
}
