/**
 * Kapak seti.
 *
 * Hepsi CSS ile üretiliyor, görsel dosya yok — uygulama çevrimdışı ve
 * hafif kalsın. Her varyantın `sinif` değeri kitaplik.css'teki kurala
 * karşılık gelir.
 */
export interface Kapak {
  anahtar: string
  ad: string
}

export const KAPAKLAR: Kapak[] = [
  { anahtar: 'deri', ad: 'Koyu deri' },
  { anahtar: 'bez', ad: 'Bez' },
  { anahtar: 'kraft', ad: 'Kraft' },
  { anahtar: 'murekkep', ad: 'Mürekkep' },
  { anahtar: 'kiraz', ad: 'Kiraz' },
  { anahtar: 'zeytin', ad: 'Zeytin' },
  { anahtar: 'gece', ad: 'Gece' },
  { anahtar: 'altin', ad: 'Altın yaldız' },
]

export const KAPAK_VAR = (anahtar: string): boolean =>
  KAPAKLAR.some((k) => k.anahtar === anahtar)

export const VARSAYILAN_KAPAK = 'deri'
