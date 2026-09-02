import { ac, kapat, type KilitParam } from './cekirdek/gizle.js'
import { kurtarmaCoz, kurtarmaUret, kurtarmaYaz } from './cekirdek/kurtarma.js'
import {
  HESAP_PARAM,
  hesapKimligiTuret,
  type HesapKimlik,
} from './cekirdek/hesapKimlik.js'
import type { KasaOkuma, KasaSatir } from './veri/senkronDepo.js'

/**
 * HESAP AKIŞI — şifreleme burada, ağ orada.
 *
 * `veri/senkronDepo.ts`teki `Kasa` yalnızca iki dize taşıyor. Defter
 * Kimliği'ni sarmalayan ve açan yer burası; ağ katmanı anahtarı hiç
 * görmüyor. Senkron zarfıyla aynı disiplin (KARARLAR.md · K-036, K-039).
 *
 * Sunucu somut sınıf olarak değil arayüz olarak görülüyor: testler
 * bellekte duran bir taklit koyup tam turu ağsız koşturuyor.
 */

export interface KasaSunucu {
  oku(): Promise<KasaOkuma>
  yaz(satir: KasaSatir): Promise<void>
  sil(): Promise<void>
}

/**
 * `hesapAc` ve `girisYap`ın cevabı.
 *
 * Eskiden ikisi de `string | null` dönüyordu ve `null` dört ayrı şeyi
 * birden anlatıyordu. Canlıda tam olarak bunun bedeli ödendi: sunucu
 * 200 dönerken kullanıcı "böyle bir defter yok" görüyordu ve hatanın
 * ağda mı, satır düzeyi güvenlikte mi, şifre çözmede mi olduğu
 * ayırt edilemiyordu (KARARLAR.md · K-042).
 *
 *   `yok`        — bu ad ve şifreyle hesap yok
 *   `satirYok`   — hesap VAR, oturum açıldı, ama kasa satırı gelmedi
 *   `cozulemedi` — satır geldi ama bu şifreyle AÇILMADI
 *   `gecersiz`   — ad ya da şifre biçim olarak kabul edilmedi
 */
export type KasaSonuc =
  | { durum: 'tamam'; kod: string }
  | { durum: 'yok' }
  | { durum: 'satirYok' }
  | { durum: 'cozulemedi' }
  | { durum: 'gecersiz' }

/** Kimliği verilen kasa için sunucuyu kuran şey — çağıran taraf sağlıyor. */
export type KasaYapici = (kimlik: HesapKimlik) => KasaSunucu

/**
 * Yeni hesap açar ve Defter Kimliği'ni üretip kasaya yazar.
 *
 * Dönen kod kullanıcıya BİR KEZ gösteriliyor: şifresini unutursa tek
 * yolu bu.
 *
 * Var olan bir hesabın ad ve şifresiyle çağrılırsa yeni kod ÜRETİLMİYOR;
 * kasadaki okunup döndürülüyor. Kasa AÇILAMIYORSA da yeni kod
 * üretilmiyor: `cozulemedi` dönüyor ve satıra dokunulmuyor. İkisi de
 * veri kaybının en sessiz yoluydu (K-039, K-042).
 */
export async function hesapAc(
  ad: string,
  sifre: string,
  yap: KasaYapici,
  param: KilitParam = HESAP_PARAM,
): Promise<KasaSonuc> {
  const kimlik = await hesapKimligiTuret(ad, sifre, param)
  if (!kimlik) return { durum: 'gecersiz' }

  const kasa = yap(kimlik)
  const mevcut = await kasa.oku()

  if (mevcut.durum === 'var') {
    const gizli = await ac(mevcut.satir, kimlik.sifre).catch(() => null)
    const kod = gizli && kurtarmaYaz(gizli)
    if (kod) return { durum: 'tamam', kod }
    /*
     * VAR OLAN BİR KASANIN ÜSTÜNE YAZILMIYOR.
     *
     * Burada eskiden yeni bir Defter Kimliği üretilip kasanın üstüne
     * yazılıyordu. Sunucudaki defteri açan tek anahtar o eski koddu:
     * üstüne yazmak, kullanıcı "hesap aç"a bastı diye yıllık bir
     * defteri sessizce ve KALICI olarak okunamaz hâle getirirdi.
     *
     * Açılamayan bir kasa ya yanlış şifre ya da bozulmuş bir satır
     * demek. İkisinde de doğru davranış aynı: dur ve söyle
     * (KARARLAR.md · K-042).
     */
    return { durum: 'cozulemedi' }
  }

  const kod = kurtarmaUret()
  await kasa.yaz(await kapat(kurtarmaCoz(kod)!, kimlik.sifre))
  return { durum: 'tamam', kod }
}

/**
 * Giriş yapar ve Defter Kimliği'ni getirir.
 *
 * Dönen `KasaSonuc` hangi katmanda durulduğunu söylüyor; çağıran taraf
 * kullanıcıya doğru cümleyi kurabilsin diye (K-042).
 *
 * Hesap YARATILMIYOR: `Kasa.oku` oturumu `yarat = false` ile açıyor.
 * Yaratsaydı şifresini yanlış yazan kullanıcıya sessizce boş bir defter
 * açılır ve "giriş başarılı" denirdi — kullanıcı defterini kaybettiğini
 * anlamadan üstüne yazmaya başlardı.
 */
export async function girisYap(
  ad: string,
  sifre: string,
  yap: KasaYapici,
  param: KilitParam = HESAP_PARAM,
): Promise<KasaSonuc> {
  const kimlik = await hesapKimligiTuret(ad, sifre, param)
  if (!kimlik) return { durum: 'gecersiz' }

  const okuma = await yap(kimlik).oku()
  if (okuma.durum === 'hesapYok') return { durum: 'yok' }
  if (okuma.durum === 'satirYok') return { durum: 'satirYok' }

  /* GCM etiketi tutmazsa `ac` atıyor: yanlış şifre çökme değil, cevabı
     "hayır" olan bir soru. */
  const gizli = await ac(okuma.satir, kimlik.sifre).catch(() => null)
  const kod = gizli && kurtarmaYaz(gizli)
  return kod ? { durum: 'tamam', kod } : { durum: 'cozulemedi' }
}

/**
 * Ad ya da şifre değişince hesabı taşır.
 *
 * Kimlik ikisinden birden türediği için değişim hesabın KENDİSİNİ
 * değiştiriyor. Sıra bağlayıcı: **önce yeni kasa yazılıyor, sonra eski
 * satır siliniyor.** Ters sırada, arada bir hata olsa kullanıcı hem eski
 * hem yeni kasasız kalırdı.
 *
 * Eski kasayı silmek başarısız olursa görmezden geliniyor: yeni kasa
 * yazıldığına göre giriş çalışıyor, geride kalan satır yalnızca çöp — ve
 * o da eski şifreyle şifreli.
 */
export async function hesapTasi(
  eskiAd: string,
  eskiSifre: string,
  yeniAd: string,
  yeniSifre: string,
  kod: string,
  yap: KasaYapici,
  param: KilitParam = HESAP_PARAM,
): Promise<boolean> {
  const gizli = kurtarmaCoz(kod)
  if (!gizli) return false
  const yeni = await hesapKimligiTuret(yeniAd, yeniSifre, param)
  if (!yeni) return false

  await yap(yeni).yaz(await kapat(gizli, yeni.sifre))

  const eski = await hesapKimligiTuret(eskiAd, eskiSifre, param)
  if (eski && eski.kimlik !== yeni.kimlik)
    await yap(eski).sil().catch(() => {})
  return true
}
