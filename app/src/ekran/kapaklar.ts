import { S } from './ortak.js'
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

/*
 * Kapak anahtarları veritabanında saklanıyor ve ASLA çevrilmiyor; yalnızca
 * ekranda görünen ad dile göre değişiyor. Dil değiştiren kullanıcının
 * defterlerinin kapağı yerinde kalsın (KARARLAR.md · K-035).
 */
export const KAPAK_ANAHTARLARI = [
  'deri', 'bez', 'kraft', 'murekkep', 'kiraz', 'zeytin', 'gece', 'altin',
] as const

export const kapaklar = (): Kapak[] =>
  KAPAK_ANAHTARLARI.map((anahtar) => ({ anahtar, ad: S(`kapak.${anahtar}`) }))

export const KAPAK_VAR = (anahtar: string): boolean =>
  (KAPAK_ANAHTARLARI as readonly string[]).includes(anahtar)

export const VARSAYILAN_KAPAK = 'deri'
