/**
 * MODEL ÇAĞRISININ ÇEKİRDEĞİ — ne gidiyor, ne söyleniyor.
 *
 * Bu dosya saf: ağ yok, DOM yok, veri katmanı yok. Tek işi, arşivin
 * yerelde bulduğu kayıtlardan modele gidecek metni kurmak. Böylece
 * "cihazdan ne çıkıyor" sorusunun cevabı tek bir dosyada okunabiliyor ve
 * test edilebiliyor (ilke 2.3).
 *
 * PROJE.md §7'nin uyarısı burada geçerli: *model cevabı yazar ama hangi
 * kayıtları göreceğini biz seçeriz.* Seçim `soruCoz`'da yapıldı; burada
 * yalnızca daraltılıyor — asla genişletilmiyor.
 */
import type { Bulgu } from './sorgu.js'
import { krizIsareti } from './kriz.js'
import { tamTarih } from './tr.js'

/**
 * Modele gidecek en fazla kayıt sayısı.
 *
 * Arşivin kullanıcıya gösterdiği kaynak sayısıyla AYNI olmak zorunda:
 * ilke 2.4 "kaynaklar her zaman gösterilir" diyor. Modele gösterilip
 * kullanıcıya gösterilmeyen bir kayıt o sözü bozardı.
 */
export const EN_COK_KAYIT = 4

export interface AnlatimKayit {
  /** Cevapta atıf için — kaynak kartındaki numarayla birebir aynı. */
  no: number
  kayitId: string
  tarih: string
  saat: string
  metin: string
  notlar: string[]
}

export interface Anlatim {
  soru: string
  kayitlar: AnlatimKayit[]
}

/**
 * Sistem yönergesi.
 *
 * Uzun, çünkü buradaki her cümle bir ilkenin karşılığı. Kısaltmak
 * isteyen önce hangi ilkeyi bıraktığını söylemeli.
 */
export const SISTEM = `Sen bir günlük uygulamasının arşiv bölümüsün. Kullanıcı kendi defterine bir soru sordu ve uygulama, o soruyla eşleşen kayıtları cihazda buldu. Aşağıda sana verilen kayıtlar ELİNDEKİ HER ŞEY: defterin geri kalanını görmüyorsun, göremezsin.

Kurallar:
1. Yalnızca sana verilen kayıtlardan konuş. Kayıtlarda geçmeyen hiçbir olayı, kişiyi, tarihi, yeri ya da duyguyu ekleme. Bir şey kayıtlarda yoksa "bunu yazmamışsın" de. Uydurmak, bu üründe yapılabilecek en ağır hata.
2. Her cümleni dayandırdığın kaydı köşeli parantezle göster: [1], [2]. Dayanağı olmayan cümle kurma.
3. Kısa yaz. En fazla dört cümle. Kayıtları tek tek özetleme; aralarında gerçekten duran bağı söyle. Bağ yoksa yok de.
4. Teşhis koyma, ruh hâli ölçme, örüntü adı takma, öğüt verme, teselli etme, övme. Sen terapi değilsin; bir arama sonucunun cümleye dökülmüş hâlisin.
5. Sayı, tarih, telefon, adres, kaynak, istatistik uydurma. Kayıtta yazmayan hiçbir olguyu söyleme.
6. Kullanıcıya soru sorma, ondan bir şey isteme, sohbet açma.
7. Türkçe yaz, "sen" diye hitap et, kullanıcının kendi sözcüklerini kullan. Süslü dil kurma; defterin sesi sakin ve düz.
8. Kayıtlarda kendine zarar verme ya da yaşama son verme işareti görürsen hiçbir şey yorumlama, sadece "Bunun hakkında bir şey söylemeyeceğim." de ve dur.`

/**
 * Bulguları modele gidecek biçime çevirir; gidecek bir şey yoksa null.
 *
 * İki daraltma yapıyor ve ikisi de bilerek burada:
 *  - kriz işareti taşıyan kayıt DIŞARIDA kalıyor. `soruCoz` zaten eliyor;
 *    bu ikinci süzgeç, ileride biri retrieval'ı değiştirirse ilke 2.1'in
 *    tek bir kod yolunda değil, iki yerde birden korunması için
 *    (KARARLAR.md · K-030, K-031).
 *  - en fazla `EN_COK_KAYIT` kayıt. Defterin tamamı hiçbir koşulda
 *    çıkmıyor (ilke 2.3).
 */
export function anlatimKur(soru: string, bulgular: Bulgu[]): Anlatim | null {
  const temiz = soru.trim()
  if (!temiz) return null
  const kayitlar: AnlatimKayit[] = []
  for (const b of bulgular) {
    if (kayitlar.length >= EN_COK_KAYIT) break
    if (krizIsareti(b.kayit.metin).var) continue
    kayitlar.push({
      no: kayitlar.length + 1,
      kayitId: b.kayit.id,
      tarih: b.kayit.tarih,
      saat: b.kayit.saat,
      metin: b.kayit.metin,
      notlar: b.kenarlar.map((n) => n.metin),
    })
  }
  return kayitlar.length ? { soru: temiz, kayitlar } : null
}

/** Kullanıcı mesajı — cihazdan çıkan metnin tamamı bu. */
export function kullaniciMetni(a: Anlatim): string {
  const bloklar = a.kayitlar.map((k) => {
    const notlar = k.notlar.map((n) => `\nkenar notu: ${n}`).join('')
    return `[${k.no}] ${tamTarih(k.tarih)}, ${k.saat}\n${k.metin}${notlar}`
  })
  return `Soru: ${a.soru}\n\nKayıtlar:\n\n${bloklar.join('\n\n')}`
}

/* ── yazdıktan sonra tek soru ───────────────────────────────
   PROJE.md yol haritası 12: *yorum değil, soru.* Gerekçe orada yazılı:
   "Yorum açıklamaya çalışır, soru yazdırır." */

export const SORU_SISTEM = `Kullanıcı az önce günlüğüne bir şey yazdı. Senin tek işin, ona yazmaya devam ettirecek TEK BİR SORU sormak.

Kurallar:
1. Yalnızca bir soru cümlesi yaz. Başka hiçbir şey yazma: selam yok, giriş yok, açıklama yok, tırnak yok.
2. Yorum yapma. Yazdıklarını özetleme, adlandırma, tekrar etme, "anlıyorum" deme, teselli etme, övme, öğüt verme.
3. Teşhis koyma, duygu ölçme, örüntü adı takma. Sen terapi değilsin.
4. Soru kısa olsun — en fazla on beş sözcük. Türkçe yaz, "sen" diye hitap et.
5. Soru, yazdığı şeyin İÇİNDEKİ somut bir ayrıntıya dokunsun; genel geçer olmasın. "Bugün nasıl hissettin?" gibi bir soru işe yaramaz.
6. Cevabı kendin varsayma; kayıtta yazmayan bir olayı ya da kişiyi soruya sokma.
7. Kullanıcıyı bir şey yapmaya çağırma, tavsiye verme, plan önerme.`

/**
 * Kayıttan soru istenebilir mi ve istenecekse dışarı ne çıkacak.
 *
 * Kriz işareti taşıyan kayıt için null: ilke 2.1'de uygulama SUSAR, soru
 * sormak susmanın tersidir (KARARLAR.md · K-030, K-032).
 */
export function soruIstegi(metin: string): string | null {
  const t = metin.trim()
  if (!t) return null
  if (krizIsareti(t).var) return null
  return t
}
