import type { Depo } from './veri/depo.js'

/**
 * SU SEVİYESİNİN DENKLEŞTİRİLMESİ — senkron kurulmadan önce.
 *
 * `senkron.sonGorulen`, sunucudaki `defter_blob.surum` akışındaki konum:
 * "bundan büyük sürümleri henüz görmedim". Sayıyı sunucu atıyor ve
 * `defter_surum_dizi` BÜTÜN hesaplar için tek dizi — yani bu sayı yalnızca
 * TEK BİR hesabın akışında anlamlı (`veri/sema/sunucu.sql`).
 *
 * Canlıda bunun bedeli ödendi. Kullanıcının iki tarayıcısı aynı hesaptaydı;
 * biri yazdığını itiyor, öteki hiçbir şey çekmiyordu. İtme yeni (yüksek) bir
 * sürüm aldığı için tek yön çalışıyor GİBİ görünüyordu:
 *
 *   · Cihaz başka bir hesapta seviyeyi 6'ya çıkarmıştı. Yeni hesabın
 *     satırları 2–4'tü; hiçbiri "6'dan büyük" değil, hiçbiri hiç istenmedi.
 *     `hesabaTasi` seviyeyi sıfırlıyordu ama `giris` ve `ac` yolları
 *     sıfırlamıyordu.
 *   · Bir kez çözülemeyen satır indiyse (başka bir Defter Kimliği'yle
 *     şifreli) seviye onun ÜSTÜNE çıkıyor ve o satır o cihazın akışından
 *     kalıcı olarak düşüyor: sunucudaki `surum` bir daha değişmiyor.
 *
 * İkisinin de tek bir doğru cevabı var: **seviye hesaba özgüdür.** Hesap
 * değiştiyse sıfırdan başlanıyor (KARARLAR.md · K-048).
 *
 * Tekrar çekmek zararsız: `catismaKarari` aynı içeriği "yerel" diye geçiyor,
 * yerelde daha yeni olan satır ezilmiyor. Bedeli yalnızca bir kerelik
 * indirme.
 */

/** Su seviyesi — cihaza özgü, senkronlanmıyor. */
export const SU_SEVIYESI = 'senkron.sonGorulen'
/** Seviyenin hangi hesabın akışında ölçüldüğü. */
export const SEVIYE_HESABI = 'senkron.hesap'
/**
 * Bir kerelik onarım damgası.
 *
 * Yukarıdaki iki kusur ateşlenmiş cihazlarda hesap DEĞİŞMİYOR — yani hesap
 * karşılaştırması onları kurtarmıyor; seviye yanlış yerde takılı kalmaya
 * devam ediyor. Bu damga, düzeltmeyi ilk kez gören her cihazda seviyeyi bir
 * kez sıfırlayıp defteri baştan indiriyor.
 *
 * Sürüm numarası taşıyor: ileride aynı şey gerekirse damga yenilenir.
 */
export const TAM_CEKIM = 'senkron.tamCekim.1'
/**
 * Son gerçek çekmede açılamayan satır sayısı.
 *
 * Bellekte tutmak yetmiyordu: sayı her turda sıfırlanıyor ve boştaki bir
 * defterde tur hep boş dönüyor. Ayar kağıdı açıldığında ekranda 0
 * görünürdü — yani "sessizce atlama"yı bitirmek için eklenen satır da
 * sessiz kalırdı.
 */
export const OKUNAMAYAN = 'senkron.okunamayan'

/**
 * Su seviyesini bu hesaba göre denkleştirir; sıfırlandıysa `true` döner.
 *
 * `hesapAnahtari` hesabı ayırt eden herhangi bir dize olabilir — çağıran
 * taraf türetilmiş e-postanın kısasını veriyor. Buraya parola ya da
 * şifreleme anahtarı GİRMİYOR.
 */
export async function suSeviyesiniDenkle(
  depo: Depo,
  hesapAnahtari: string,
): Promise<boolean> {
  const oncekiHesap = await depo.ayarOku(SEVIYE_HESABI)
  const tamCekimYapildi = (await depo.ayarOku(TAM_CEKIM)) === '1'
  const sifirla = oncekiHesap !== hesapAnahtari || !tamCekimYapildi

  if (sifirla) await depo.ayarYaz(SU_SEVIYESI, '0')
  if (oncekiHesap !== hesapAnahtari) await depo.ayarYaz(SEVIYE_HESABI, hesapAnahtari)
  if (!tamCekimYapildi) await depo.ayarYaz(TAM_CEKIM, '1')
  return sifirla
}

/**
 * Kullanıcının elindeki kurtarma yolu: defteri baştan indir.
 *
 * Ayar kağıdındaki düğme bunu çağırıyor. Yerelde hiçbir şey silinmiyor;
 * yalnızca "hiçbirini görmedim" deniyor ve sunucudaki her satır bir kez daha
 * değerlendiriliyor. Böyle bir yol olmadığı için, seviyesi yanlış yerde
 * takılan bir cihazın kullanıcı tarafından düzeltilmesi mümkün değildi.
 */
export async function bastanIndir(depo: Depo): Promise<void> {
  await depo.ayarYaz(SU_SEVIYESI, '0')
  /* Sayı yeni çekmede yeniden ölçülecek; eskisini taşımak yalan olurdu. */
  await depo.ayarYaz(OKUNAMAYAN, '0')
}
