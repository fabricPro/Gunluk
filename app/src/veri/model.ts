/**
 * MODEL ÇAĞRISI — cihazdan çıkan tek istek.
 *
 * Uygulamada ağa çıkan başka bir yer yok (gömü modelinin indirilmesi
 * dışında, o da yalnızca indirme yönünde). Bu dosya bilerek küçük ve
 * bilerek tek: "metnim nereye gidiyor" sorusunun cevabı burada bitiyor.
 *
 * Sunucu yok. Anahtar kullanıcının kendi anahtarı ve istek doğrudan
 * cihazdan Anthropic'e gidiyor — arada biz yokuz, dolayısıyla ham metnin
 * uğradığı bir makinemiz de yok (KARARLAR.md · K-031).
 *
 * SDK dinamik import'la geliyor: özellik kapalıyken tek bayt inmiyor,
 * gömü modelinde alınan tavırla aynı (K-029).
 */
import type { Anlatim } from '../cekirdek/anlatim.js'
import { SISTEM, SORU_SISTEM, kullaniciMetni, soruIstegi } from '../cekirdek/anlatim.js'

export const MODEL = 'claude-opus-5'

/**
 * Cevap dört cümleyi geçmiyor; tavan bilerek dar.
 *
 * Bu bir sohbet değil, bir arama sonucunun cümleye dökülmüş hâli. Geniş
 * tavan hem kullanıcının parasını harcar hem de modeli konuşmaya davet
 * eder — ki bu üründe konuşmak yorum yapmaya, yorum da teşhise kayar.
 */
export const EN_COK_JETON = 700

/**
 * Cevabı akıtır. `parca` her yeni metin diliminde çağrılır.
 *
 * Akıtma bilerek: kullanıcı yazılırken görüyor, hangi kayıtlara atıf
 * yapıldığını takip edebiliyor ve beklerken boş ekrana bakmıyor.
 */
export async function cevapAkit(
  anlatim: Anlatim,
  anahtar: string,
  parca: (metin: string) => void,
): Promise<void> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  /*
   * `dangerouslyAllowBrowser`: burada "tarayıcı" kullanıcının kendi
   * cihazı ve anahtar kullanıcının kendi anahtarı — sızdırılacağı bir
   * üçüncü taraf yok. SDK bu bayrakla birlikte gerekli CORS başlığını da
   * kendisi gönderiyor.
   */
  const istemci = new Anthropic({ apiKey: anahtar, dangerouslyAllowBrowser: true })
  try {
    const akis = istemci.messages.stream({
      model: MODEL,
      max_tokens: EN_COK_JETON,
      /* Kısa ve dayanaklı bir cevap için düşük çaba yetiyor; kullanıcının
         parası boşuna yanmasın. */
      output_config: { effort: 'low' },
      thinking: { type: 'adaptive' },
      system: SISTEM,
      messages: [{ role: 'user', content: kullaniciMetni(anlatim) }],
    })
    akis.on('text', parca)
    await akis.finalMessage()
  } catch (e) {
    /* SDK'nın tipli hata sınıfları — mesaj eşleştirmesi yok. */
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
      throw new Error('Anahtar kabul edilmedi. Ayarlardan kontrol et.')
    if (e instanceof Anthropic.RateLimitError)
      throw new Error('Anthropic şu an istek almıyor (kota ya da hız sınırı). Biraz sonra dene.')
    if (e instanceof Anthropic.BadRequestError) throw new Error(`İstek geçersiz sayıldı: ${e.message}`)
    if (e instanceof Anthropic.APIConnectionError)
      throw new Error('Bağlanılamadı. İnternet bağlantını kontrol et.')
    if (e instanceof Anthropic.APIError) throw new Error(`Anthropic ${e.status}: ${e.message}`)
    /*
     * Beklenmeyen hata. Kullanıcı Türkçe bir cümle görüyor, ayrıntı
     * konsola gidiyor: arayüzde İngilizce kütüphane metni belirmesin.
     */
    console.error('[defter] model çağrısı', e)
    throw new Error('Cevap alınamadı. Ayrıntı konsolda.')
  }
}

/**
 * Yazdıktan sonra tek soru — yol haritası 12.
 *
 * Akıtılmıyor: çıkan şey tek bir kısa cümle, parça parça belirmesi
 * gereksiz bir gösteri olurdu. Dışarı çıkan tek şey o kaydın metni.
 */
export const SORU_JETON = 120

export async function soruUret(kayitMetni: string, anahtar: string): Promise<string | null> {
  const gidecek = soruIstegi(kayitMetni)
  if (!gidecek) return null
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const istemci = new Anthropic({ apiKey: anahtar, dangerouslyAllowBrowser: true })
  try {
    const c = await istemci.messages.create({
      model: MODEL,
      max_tokens: SORU_JETON,
      output_config: { effort: 'low' },
      thinking: { type: 'adaptive' },
      system: SORU_SISTEM,
      messages: [{ role: 'user', content: gidecek }],
    })
    const metin = c.content
      .filter((b): b is { type: 'text'; text: string; citations: null } => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    return metin || null
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
      throw new Error('Anahtar kabul edilmedi. Ayarlardan kontrol et.')
    if (e instanceof Anthropic.RateLimitError)
      throw new Error('Anthropic şu an istek almıyor. Biraz sonra dene.')
    if (e instanceof Anthropic.APIConnectionError)
      throw new Error('Bağlanılamadı. İnternet bağlantını kontrol et.')
    console.error('[defter] soru üretimi', e)
    throw new Error('Soru alınamadı.')
  }
}
