import { argon2id } from 'hash-wasm'

/**
 * ORTAK KRİPTO — bayt, anahtar türetme, AES-GCM.
 *
 * Uygulamada üç yerde aynı üç şey yapılıyordu: Argon2id ile bir sırdan
 * anahtar türet, AES-GCM ile şifrele, hex/base64 çevir. `kilit.ts` ve
 * `yedek.ts` bunun iki ayrı kopyasını taşıyordu; senkron üçüncüsü
 * olmasın diye buraya çıkarıldı (KARARLAR.md · K-036).
 *
 * `cekirdek/` altında, çünkü saf: DOM bilmez, depo bilmez, ağ bilmez.
 * Yalnızca bayt üretir ve çözer. Yanındaki `kurtarma.ts` de aynı türden
 * bir ilkel (base32 + sağlama) — kripto ilkelleri bu katmanda.
 *
 * **Buraya bir `fetch` eklemeyin.** `test/senkronGizlilik.test.ts` bunu
 * tarıyor: uygulamada ağa çıkabilen dosyaların listesi sabit.
 */

/* ── bayt yardımcıları ─────────────────────────────────────── */

export const onaltilikYaz = (b: Uint8Array): string =>
  [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

export const onaltilikOku = (s: string): Uint8Array => {
  const b = new Uint8Array(s.length / 2)
  for (let i = 0; i < b.length; i++) b[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16)
  return b
}

export const b64Yaz = (b: Uint8Array): string => {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s)
}

export const b64Oku = (s: string): Uint8Array =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export const rastgele = (n: number): Uint8Array => {
  const b = new Uint8Array(n)
  crypto.getRandomValues(b)
  return b
}

/* ── anahtar türetme ───────────────────────────────────────── */

/** Argon2id parametreleri. Telefonda bir seferlik açılış maliyeti. */
export interface KilitParam {
  /** yineleme */
  t: number
  /** bellek (KiB) */
  m: number
  /** paralellik */
  p: number
}

export const VARSAYILAN_PARAM: KilitParam = { t: 3, m: 49152, p: 1 }

/**
 * Yavaş türetme — parola/PIN/kurtarma kodu gibi DÜŞÜK entropili
 * sırlardan anahtar çıkarmak için. Pahalı olması özelliği.
 */
export async function yavasTuret(
  sir: string | Uint8Array,
  tuz: Uint8Array,
  param: KilitParam = VARSAYILAN_PARAM,
  uzunluk = 32,
): Promise<Uint8Array> {
  return argon2id({
    password: sir,
    salt: tuz,
    parallelism: param.p,
    iterations: param.t,
    memorySize: param.m,
    hashLength: uzunluk,
    outputType: 'binary',
  })
}

/**
 * Hızlı ayrıştırma (HKDF-SHA256) — ZATEN yüksek entropili bir kökten
 * birbirinden bağımsız birden çok anahtar çıkarmak için.
 *
 * Argon2id'yi her anahtar için tekrar koşturmak gereksiz: pahalı olan
 * kısım kökü çıkarmaktı, o bir kez yapılıyor. Buradaki `etiket`ler
 * çıktıları birbirinden ayırıyor — birini bilen diğerini bulamıyor.
 *
 * WebCrypto'da yerleşik; yeni bağımlılık yok.
 */
export async function ayristir(
  kok: Uint8Array,
  etiket: string,
  uzunluk = 32,
): Promise<Uint8Array> {
  const ham = await crypto.subtle.importKey('raw', kok as BufferSource, 'HKDF', false, [
    'deriveBits',
  ])
  const bit = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      /* Kök zaten rastgele; HKDF'in tuzu burada boş olabilir. Ayrımı
         yapan şey `info`, yani etiket. */
      salt: new Uint8Array(0) as BufferSource,
      info: new TextEncoder().encode(etiket) as BufferSource,
    },
    ham,
    uzunluk * 8,
  )
  return new Uint8Array(bit)
}

/** Ham 32 baytı AES-GCM anahtarına çevirir. */
export const aesAnahtar = (ham: Uint8Array): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', ham as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt'])

/* ── AES-GCM ───────────────────────────────────────────────── */

export interface Kapali {
  /** onaltılık — her şifreleme için yeni. */
  iv: string
  /** base64 — şifreli metin + 16 baytlık GCM etiketi. */
  govde: string
}

/** Ham bayt hâli — hex/base64'e uğramadan. */
export interface KapaliHam {
  iv: Uint8Array
  govde: Uint8Array
}

/**
 * Ham baytlarla şifreler. IV her çağrıda yeni: aynı anahtarla aynı IV'yi
 * iki kez kullanmak GCM'i tamamen kırar.
 *
 * Metin taşıyan her yer aşağıdaki `kapat`ı kullanıyor. Bu, gövdesi
 * büyük olanlar için: yerel mühür defterin TAMAMINI her yazmada
 * şifreliyor ve base64 boyutu üçte bir büyütürdü (KARARLAR.md · K-037).
 */
export async function kapatHam(
  veri: Uint8Array,
  anahtar: CryptoKey,
  iv: Uint8Array = rastgele(12),
): Promise<KapaliHam> {
  const sifreli = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      anahtar,
      veri as BufferSource,
    ),
  )
  return { iv, govde: sifreli }
}

/**
 * Ham baytları çözer. Anahtar yanlışsa ya da bayt oynanmışsa GCM etiketi
 * tutmaz ve `crypto.subtle.decrypt` atar.
 */
export async function acHam(k: KapaliHam, anahtar: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: k.iv as BufferSource },
      anahtar,
      k.govde as BufferSource,
    ),
  )
}

/**
 * Şifreler ve hex/base64 olarak verir — JSON'a yazılacak yerler için.
 */
export async function kapat(veri: Uint8Array, anahtar: CryptoKey): Promise<Kapali> {
  const k = await kapatHam(veri, anahtar)
  return { iv: onaltilikYaz(k.iv), govde: b64Yaz(k.govde) }
}

/**
 * Çözer. Anahtar yanlışsa ya da bayt oynanmışsa GCM etiketi tutmaz ve
 * `crypto.subtle.decrypt` atar — çağıran bunu anlaşılır bir hataya
 * çevirmeli.
 */
export async function ac(k: Kapali, anahtar: CryptoKey): Promise<Uint8Array> {
  return acHam({ iv: onaltilikOku(k.iv), govde: b64Oku(k.govde) }, anahtar)
}
