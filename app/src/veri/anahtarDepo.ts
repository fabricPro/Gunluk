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

/**
 * Hesabın TÜRETİLMİŞ kimlik bilgisi — `<opak eposta>\n<türetilmiş parola>`.
 *
 * Neden saklanıyor: yeniden yüklemeden sonra elde şifre yok, yalnızca
 * Defter Kimliği var. Senkron da defter satırlarının durduğu HESAPLA
 * oturum açmak zorunda; açamazsa kendi hesabını yaratır ve kullanıcı
 * defterini boş görür (KARARLAR.md · K-043).
 *
 * Kodun yanında, aynı korumalı depoda duruyor: ikisi de aynı sınıftan
 * sır ve zaten aynı yerdeler, yeni bir açık yüzey açılmıyor. Kullanıcının
 * yazdığı şifre BURADA DA durmuyor — duran şey ondan türetilmiş,
 * yalnızca bu hesaba yarayan bir dize.
 */
export const HESAP_KIMLIGI = 'defter.hesap.kimlik'

import { aesAnahtar, b64Oku, b64Yaz, onaltilikOku } from '../cekirdek/gizle.js'
import { muhruAc, muhurMu, muhurle } from '../cekirdek/muhur.js'
import { dayatilanAnahtar } from './kripto.js'

export interface AnahtarDepo {
  oku(): Promise<string | null>
  yaz(a: string): Promise<void>
  sil(): Promise<void>
}

/**
 * Tarayıcı — localStorage, ama SARMALANMIŞ.
 *
 * Eskiden burada düz metin duruyordu ve ayar kağıdı bunu açıkça
 * söylüyordu (K-013). Artık değer, kilidin ana anahtarıyla mühürleniyor:
 * kilit kapalıyken localStorage'ı okuyan biri yalnızca şifreli bayt
 * görüyor (KARARLAR.md · K-037).
 *
 * Cihazın karşılığı Keychain / Android Keystore; orada işletim sistemi
 * yapıyor, burada biz.
 */
const kodla = new TextEncoder()
const cozumle = new TextDecoder()

/** Bellekteki ana anahtardan AES anahtarı; kilitliyken `null`. */
async function sarmalayan(): Promise<CryptoKey | null> {
  const av = dayatilanAnahtar()
  return av ? aesAnahtar(onaltilikOku(av)) : null
}

/** base64 olmayan değerde `atob` atıyor; eski düz metinler öyle. */
function baytlar(ham: string): Uint8Array | null {
  try {
    return b64Oku(ham)
  } catch {
    return null
  }
}

export const tarayiciAnahtarDepo = (ad = MODEL_ANAHTARI): AnahtarDepo => {
  const depo: AnahtarDepo = {
    async oku() {
      const ham = localStorage.getItem(ad)
      if (!ham) return null
      const anahtar = await sarmalayan()
      /* Kilitliyken okunmuyor — sarmalamanın bütün anlamı bu. */
      if (!anahtar) return null

      const bayt = baytlar(ham)
      if (!bayt || !muhurMu(bayt)) {
        /*
         * Sarmalamadan önce yazılmış düz değer. Sessizce kaybolmasın:
         * mühürlenip geri yazılıyor ve bu açılıştan sonra düz kopya
         * kalmıyor.
         */
        await depo.yaz(ham)
        return ham
      }
      const acik = await muhruAc(bayt, anahtar)
      return acik ? cozumle.decode(acik) : null
    },
    async yaz(a) {
      const anahtar = await sarmalayan()
      if (!anahtar) throw new Error('anahtar-yok')
      localStorage.setItem(ad, b64Yaz(await muhurle(kodla.encode(a), anahtar)))
    },
    async sil() {
      localStorage.removeItem(ad)
    },
  }
  return depo
}

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
