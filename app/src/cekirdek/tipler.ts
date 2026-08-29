/* Çekirdek tipler. Bu katman DOM ve veritabanı bilmez. */

export interface Kayit {
  id: string
  tarih: string // 'YYYY-MM-DD'
  saat: string // 'HH:MM'
  metin: string
  temalar: string[]
  duzenlendi: boolean
}

export interface KenarNotu {
  id: string
  kayitId: string
  metin: string
  tarih: string // kenar notunun düşüldüğü gün, okunur biçimde
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
  /** Kaydın son parçası mı — kenar notu buraya iliştirilir. */
  sonParca: boolean
}
export interface KenarOgesi {
  tip: 'kenar'
  kayitId: string
  metin: string
  tarih: string
}
export type SayfaOgesi = GunBasligi | KayitOgesi | KenarOgesi

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
  kapandi: boolean
  /** İçindeki kayıt sayısı — kitaplıkta sırtın kalınlığını belirler. */
  kayitSayisi: number
}
