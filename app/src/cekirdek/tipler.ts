/* Çekirdek tipler. Bu katman DOM ve veritabanı bilmez. */

export interface Kayit {
  id: string
  tarih: string // 'YYYY-MM-DD'
  saat: string // 'HH:MM'
  metin: string
  temalar: string[]
  duzenlendi: boolean
  /**
   * Bu kayıt yazılırken defterin sorduğu soru.
   * `metin`'den ayrı durur: arama ve arşiv yalnızca kullanıcının kendi
   * yazdığını görür (KARARLAR.md · K-020).
   */
  soru: string | null
}

/**
 * Eski bir kayda sonradan düşülen not (PROJE.md §4).
 *
 * Bir kayda birden çok not düşülebilir — 2026'da bir, 2028'de bir. Arşivi
 * ikinci kez açmanın sebebi bu (KARARLAR.md · K-024).
 */
export interface KenarNotu {
  id: string
  kayitId: string
  metin: string
  /** Notun düşüldüğü gün, 'YYYY-MM-DD'. */
  tarih: string
  /** Yazılma anı. Not yalnızca yazıldığı gün silinebilir. */
  olusturma: number
}

/**
 * Sayfaya iliştirilen ekin ÜSTVERİSİ — gövdesi yok.
 *
 * Sayfa akışı ve bellekteki model yalnızca bunu taşır. Gövde (base64)
 * yalnızca görünen sayfa için, tek tek istenir: on yıllık bir defterin
 * bütün fotoğraflarını bellekte tutmanın anlamı yok.
 */
export interface EkBilgi {
  kayitId: string
  tur: string
  /** Maliyet orana bağlı olduğu için en ve boy akışa kadar gidiyor. */
  en: number
  boy: number
  bayt: number
}

/** Üstveri + gövde. Yalnızca yazarken ve gösterirken kurulur. */
export interface Ek extends EkBilgi {
  /** base64 gövde, 'data:' öneki yok. */
  veri: string
}

export interface Gun {
  tarih: string
  ad: string // 'pazartesi'
  kayitlar: Kayit[]
}

/* ── sayfa öğeleri ────────────────────────────────────────── */

export interface GunBasligi {
  tip: 'gun'
  tarih: string
  ad: string
}
/**
 * Sayfaya düşen kayıt parçası.
 *
 * Akışın atomu kayıt değil parçadır: bir sayfaya sığmayan kayıt sözcük
 * sınırından kesilip sonraki sayfadan devam eder (KARARLAR.md · K-014).
 * Parçalar birleştirildiğinde özgün metin birebir geri gelir.
 */
export interface KayitOgesi {
  tip: 'kayit'
  kayitId: string
  tarih: string
  /** Bu sayfaya düşen metin parçası. */
  metin: string
  /** 0 = kaydın başı. Saat damgası yalnızca burada görünür. */
  parcaNo: number
  /** Kaydın son parçası mı — kenar notu ve ek buraya iliştirilir. */
  sonParca: boolean
}
export interface KenarOgesi {
  tip: 'kenar'
  /** Notun kimliği — ekran silme hakkını buradan çözer. */
  id: string
  kayitId: string
  metin: string
  tarih: string
}
/**
 * Kaydın son parçasından sonra basılan ek.
 * Gövde burada değil: ekran base64'ü ayrıca ister.
 */
export interface EkOgesi {
  tip: 'ek'
  kayitId: string
  tur: string
  en: number
  boy: number
}
export type SayfaOgesi = GunBasligi | KayitOgesi | KenarOgesi | EkOgesi

export interface Sayfa {
  no: number // 1'den başlayan mutlak sayfa numarası
  cilt: number
  ciltSayfa: number // cilt içindeki sayfa numarası, 1..CILT_SAYFA
  ogeler: SayfaOgesi[]
  hacim: number
  /**
   * Sayfanın başlık anahtarı: sayfadaki ilk kaydın kimliği.
   * Başlık sayfa numarasına değil içeriğe bağlı (KARARLAR.md · K-005).
   */
  anahtar: string | null
}

export interface Cilt {
  no: number
  ad: string | null
  sayfa: number
  kapali: boolean
  ilk?: Sayfa
  son?: Sayfa
}

/* ── zaman kapsülü ────────────────────────────────────────── */

export interface Kapsul {
  id: string
  yazilma: string // 'YYYY-MM-DD'
  acilma: string // bu güne kadar mühürlü — kullanıcı da açamaz
  metin: string
  cevap: string | null
  cevapTarihi: string | null
}

/* ── kitaplık ─────────────────────────────────────────────── */

/**
 * Rafta duran bir defter.
 *
 * Cilt soyut bir bölüm değil, aynı adlı defterin devamı: bir defter dolunca
 * kapanır ve aynı adla bir sonraki cilt doğar (KARARLAR.md · K-016).
 */
export interface DefterBilgi {
  id: string
  ad: string
  cilt: number
  kapak: string
  raf: number
  sira: number
  /** Bu defterin kendi sayfa sınırı. Dolunca tören açılır. */
  sayfaSiniri: number
  kapandi: boolean
  /** Kapanma anı; kapanmamışsa null. */
  kapanma: number | null
  /** İçindeki kayıt sayısı — kitaplıkta sırtın kalınlığını belirler. */
  kayitSayisi: number
}
