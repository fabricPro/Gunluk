/**
 * Model anahtarının saklandığı yer.
 *
 * Anahtar kullanıcının kendi Anthropic anahtarı: sunucumuz yok, ara
 * katmanımız yok, çağrı doğrudan cihazdan gidiyor (KARARLAR.md · K-031).
 * Bu yüzden anahtar da cihazda kalmak zorunda — Keychain / Android
 * Keystore'da, kilit kaydıyla aynı yerde.
 *
 * Veritabanında DEĞİL. Şifreli yedeğe girse, yedeği paylaşan kullanıcı
 * farkında olmadan faturalı bir anahtarı da paylaşmış olurdu.
 */

const ADI = 'defter.model.anahtar'

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
export const tarayiciAnahtarDepo = (): AnahtarDepo => ({
  async oku() {
    return localStorage.getItem(ADI)
  },
  async yaz(a) {
    localStorage.setItem(ADI, a)
  },
  async sil() {
    localStorage.removeItem(ADI)
  },
})

export async function cihazAnahtarDepo(): Promise<AnahtarDepo> {
  const { SecureStorage } = await import('@aparajita/capacitor-secure-storage')
  return {
    async oku() {
      return ((await SecureStorage.get(ADI)) as string | null) ?? null
    },
    async yaz(a) {
      await SecureStorage.set(ADI, a)
    },
    async sil() {
      await SecureStorage.remove(ADI)
    },
  }
}

/**
 * Anahtar biçimi doğru mu — çağrıyı boşuna kurmamak için.
 *
 * Doğrulama İDDİA DEĞİL: anahtarın geçerli olduğunu değil, yanlışlıkla
 * başka bir şey yapıştırılmadığını söylüyor.
 */
export const anahtarBicimi = (a: string): boolean => /^sk-ant-[\w-]{20,}$/.test(a.trim())
