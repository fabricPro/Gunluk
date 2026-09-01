import { ac, kapat, type KilitParam } from './cekirdek/gizle.js'
import { kurtarmaCoz, kurtarmaUret, kurtarmaYaz } from './cekirdek/kurtarma.js'
import {
  HESAP_PARAM,
  hesapKimligiTuret,
  type HesapKimlik,
} from './cekirdek/hesapKimlik.js'
import type { KasaSatir } from './veri/senkronDepo.js'

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
  oku(): Promise<KasaSatir | null>
  yaz(satir: KasaSatir): Promise<void>
  sil(): Promise<void>
}

/** Kimliği verilen kasa için sunucuyu kuran şey — çağıran taraf sağlıyor. */
export type KasaYapici = (kimlik: HesapKimlik) => KasaSunucu

/**
 * Yeni hesap açar ve Defter Kimliği'ni üretip kasaya yazar.
 *
 * Dönen kod kullanıcıya BİR KEZ gösteriliyor: şifresini unutursa tek
 * yolu bu. `null` ise ad ya da şifre kabul edilmedi.
 *
 * Var olan bir hesabın ad ve şifresiyle çağrılırsa yeni kod ÜRETİLMİYOR;
 * kasadaki okunup döndürülüyor. Böylece "hesap aç" ile "giriş yap"
 * karışsa bile defter üstüne yazılmıyor — bu, veri kaybının en sessiz
 * yoluydu.
 */
export async function hesapAc(
  ad: string,
  sifre: string,
  yap: KasaYapici,
  param: KilitParam = HESAP_PARAM,
): Promise<string | null> {
  const kimlik = await hesapKimligiTuret(ad, sifre, param)
  if (!kimlik) return null

  const kasa = yap(kimlik)
  const mevcut = await kasa.oku()
  if (mevcut) {
    const gizli = await ac(mevcut, kimlik.sifre).catch(() => null)
    if (gizli) return kurtarmaYaz(gizli)
  }

  const kod = kurtarmaUret()
  await kasa.yaz(await kapat(kurtarmaCoz(kod)!, kimlik.sifre))
  return kod
}

/**
 * Giriş yapar ve Defter Kimliği'ni getirir.
 *
 * `null` ise "bu ad ve şifreyle defter yok". Hesap YARATILMIYOR:
 * `Kasa.oku` oturumu `yarat = false` ile açıyor. Yaratsaydı şifresini
 * yanlış yazan kullanıcıya sessizce boş bir defter açılır ve "giriş
 * başarılı" denirdi — kullanıcı defterini kaybettiğini anlamadan üstüne
 * yazmaya başlardı.
 */
export async function girisYap(
  ad: string,
  sifre: string,
  yap: KasaYapici,
  param: KilitParam = HESAP_PARAM,
): Promise<string | null> {
  const kimlik = await hesapKimligiTuret(ad, sifre, param)
  if (!kimlik) return null

  const satir = await yap(kimlik).oku()
  if (!satir) return null

  /* GCM etiketi tutmazsa `ac` atıyor: yanlış şifre çökme değil, cevabı
     "hayır" olan bir soru. */
  const gizli = await ac(satir, kimlik.sifre).catch(() => null)
  return gizli ? kurtarmaYaz(gizli) : null
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
