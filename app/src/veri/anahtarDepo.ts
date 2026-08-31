/**
 * Cihazda saklanan sırlar.
 *
 * Anahtar kullanıcının kendi Anthropic anahtarı: sunucumuz yok, ara
 * katmanımız yok, çağrı doğrudan cihazdan gidiyor (KARARLAR.md · K-031).
 * Bu yüzden anahtar da cihazda kalmak zorunda — Keychain / Android
 * Keystore'da, kilit kaydıyla aynı yerde.
 *
 * Veritabanında DEĞİL. Şifreli yedeğe girse, yedeği paylaşan kullanıcı
 * farkında olmadan faturalı bir anahtarı da paylaşmış olurdu.
 */

/** Kullanıcının kendi Anthropic anahtarı (K-031). */
export const MODEL_ANAHTARI = 'defter.model.anahtar'

/**
 * Defter Kimliği — senkron kodu (K-036).
 *
 * Veritabanında DEĞİL, burada. Veritabanında dursa mühürlü yedeğe
 * girerdi ve yedeğini paylaşan kullanıcı farkında olmadan defterinin
 * tamamına erişimi de paylaşmış olurdu.
 */
export const SENKRON_KODU = 'defter.senkron.kod'

export interface AnahtarDepo {
  oku(): Promise<string | null>
  yaz(a: string): Promise<void>
  sil(): Promise<void>
}

/**
 * Tarayıcı önizlemesi — localStorage.
 *
 * Burada gerçek bir koruma yok, tıpkı veritabanının şifresiz olması gibi
 * (K-013). Ayar kağıdı bunu açıkça söylüyor.
 */
export const tarayiciAnahtarDepo = (ad = MODEL_ANAHTARI): AnahtarDepo => ({
  async oku() {
    return localStorage.getItem(ad)
  },
  async yaz(a) {
    localStorage.setItem(ad, a)
  },
  async sil() {
    localStorage.removeItem(ad)
  },
})

export async function cihazAnahtarDepo(ad = MODEL_ANAHTARI): Promise<AnahtarDepo> {
  const { SecureStorage } = await import('@aparajita/capacitor-secure-storage')
  return {
    async oku() {
      return ((await SecureStorage.get(ad)) as string | null) ?? null
    },
    async yaz(a) {
      await SecureStorage.set(ad, a)
    },
    async sil() {
      await SecureStorage.remove(ad)
    },
  }
}

/** Ortama göre depo seçer. */
export const anahtarDeposu = (nativeMi: boolean, ad: string): Promise<AnahtarDepo> =>
  nativeMi ? cihazAnahtarDepo(ad) : Promise.resolve(tarayiciAnahtarDepo(ad))

/**
 * Anahtar biçimi doğru mu — çağrıyı boşuna kurmamak için.
 *
 * Doğrulama İDDİA DEĞİL: anahtarın geçerli olduğunu değil, yanlışlıkla
 * başka bir şey yapıştırılmadığını söylüyor.
 */
export const anahtarBicimi = (a: string): boolean => /^sk-ant-[\w-]{20,}$/.test(a.trim())
