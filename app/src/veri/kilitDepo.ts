import type { KilitKaydi } from './kilit.js'

/**
 * Kilit kaydının saklandığı yer — veritabanının DIŞI.
 *
 * Kayıt, veritabanı açılmadan okunmak zorunda: anahtar oradan çıkıyor.
 * Cihazda Keychain/Android Keystore, tarayıcıda localStorage.
 */

const KAYIT_ADI = 'defter.kilit'
const BIYOMETRI_ADI = 'defter.kilit.biyometri'

export interface KilitDepo {
  oku(): Promise<KilitKaydi | null>
  yaz(k: KilitKaydi): Promise<void>
  sil(): Promise<void>
  /** Cihazda biyometri var mı ve kullanılabilir mi. */
  biyometriVarMi(): Promise<boolean>
  /** Biyometri yolunu kurar: ana anahtarın bir kopyasını güvenli depoya yazar. */
  biyometriKur(anaAnahtar: string): Promise<void>
  /** Biyometriyle doğrulayıp ana anahtarı okur; olmazsa null. */
  biyometriIleAc(): Promise<string | null>
  biyometriKaldir(): Promise<void>
}

/* ── tarayıcı ─────────────────────────────────────────────────
   Önizleme derlemesi. Burada biyometri yok ve veritabanı zaten şifresiz
   (K-013); kilit yalnızca bir ekran. */

export const tarayiciDepo = (): KilitDepo => ({
  async oku() {
    const ham = localStorage.getItem(KAYIT_ADI)
    return ham ? (JSON.parse(ham) as KilitKaydi) : null
  },
  async yaz(k) {
    localStorage.setItem(KAYIT_ADI, JSON.stringify(k))
  },
  async sil() {
    localStorage.removeItem(KAYIT_ADI)
    localStorage.removeItem(BIYOMETRI_ADI)
  },
  async biyometriVarMi() {
    return false
  },
  async biyometriKur() {
    /* Tarayıcıda biyometri yok. */
  },
  async biyometriIleAc() {
    return null
  },
  async biyometriKaldir() {
    localStorage.removeItem(BIYOMETRI_ADI)
  },
})

/* ── cihaz ────────────────────────────────────────────────────
   Keychain / Android Keystore + biyometrik doğrulama.

   ÖNEMLİ SINIR: kullandığımız güvenli depo eklentisi öge bazında
   biyometrik erişim denetimi (iOS kSecAccessControlBiometryCurrentSet,
   Android setUserAuthenticationRequired) sunmuyor — API'si yalnızca
   set/get/remove. Yani akış "biyometriyle doğrula, sonra depodan oku".
   Sağlam bir cihazda depo işletim sisteminin kumuyla korunuyor, ama kök
   erişimi olan bir cihazda doğrulama atlanabilir ve anahtar okunabilir.
   Bu yüzden biyometri açmak, anahtarın açılabilir bir kopyasını cihazda
   bırakmak demektir; yalnızca PIN isteyen kullanıcı biyometriyi kapalı
   bırakmalı. (KARARLAR.md · K-021) */

export async function cihazDepo(): Promise<KilitDepo> {
  const { SecureStorage } = await import('@aparajita/capacitor-secure-storage')
  const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')

  const biyometriVarMi = async (): Promise<boolean> => {
    try {
      return (await BiometricAuth.checkBiometry()).isAvailable
    } catch {
      return false
    }
  }

  return {
    async oku() {
      const ham = (await SecureStorage.get(KAYIT_ADI)) as string | null
      return ham ? (JSON.parse(ham) as KilitKaydi) : null
    },
    async yaz(k) {
      await SecureStorage.set(KAYIT_ADI, JSON.stringify(k))
    },
    async sil() {
      await SecureStorage.remove(KAYIT_ADI)
      await SecureStorage.remove(BIYOMETRI_ADI)
    },
    biyometriVarMi,
    async biyometriKur(anaAnahtar) {
      await SecureStorage.set(BIYOMETRI_ADI, anaAnahtar)
    },
    async biyometriIleAc() {
      if (!(await biyometriVarMi())) return null
      try {
        await BiometricAuth.authenticate({
          reason: 'Defterini aç',
          cancelTitle: 'Vazgeç',
          allowDeviceCredential: true,
        })
      } catch {
        return null
      }
      return ((await SecureStorage.get(BIYOMETRI_ADI)) as string | null) ?? null
    },
    async biyometriKaldir() {
      await SecureStorage.remove(BIYOMETRI_ADI)
    },
  }
}
