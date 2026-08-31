import type { Dil } from '../cekirdek/dil.js'
import { S, dil, dilAyarla } from '../cekirdek/metin.js'

export { S, dil }
import { gunAdi, tamTarih } from '../cekirdek/tr.js'
import { gunAdiEn, tamTarihEn } from '../cekirdek/en.js'

export const $ = <T extends HTMLElement = HTMLElement>(s: string): T =>
  document.querySelector<T>(s)!
export const $$ = <T extends HTMLElement = HTMLElement>(s: string): T[] => [
  ...document.querySelectorAll<T>(s),
]

/** HTML kaçışı — kullanıcı metni asla ham gömülmez. */
export const kacir = (m: string): string =>
  m.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

/** Işık, bakılan sayfadaki kayıtların saatine göre değişir (PROJE.md §4). */
export function isikAyarla(saat: number): void {
  let renk: string, cx: number, cy: number, parlak: number
  if (saat >= 5 && saat < 9) { renk = 'rgba(196,178,150,.09)'; cx = 82; cy = 60; parlak = 0.94 }
  else if (saat >= 9 && saat < 17) { renk = 'rgba(226,196,150,.13)'; cx = 95; cy = 70; parlak = 1.06 }
  else if (saat >= 17 && saat < 21) { renk = 'rgba(226,164,92,.12)'; cx = 78; cy = 56; parlak = 0.97 }
  else if (saat >= 21 && saat < 24) { renk = 'rgba(228,150,72,.10)'; cx = 56; cy = 42; parlak = 0.84 }
  else { renk = 'rgba(232,146,66,.09)'; cx = 44; cy = 34; parlak = 0.76 }
  $('#isik').style.background =
    `radial-gradient(ellipse ${cx}% ${cy}% at 50% 36%, ${renk}, transparent 74%)`
  document.documentElement.style.setProperty('--parlak', String(parlak))
}

type EkranAdi = 'defter' | 'arsiv' | 'kapsul'
let sayfaIsigi: (() => void) | null = null

export function sayfaIsigiBagla(f: () => void): void {
  sayfaIsigi = f
}

export function ekranAc(ad: EkranAdi): void {
  for (const e of $$('.ekran')) e.classList.toggle('acik', e.id === ad)
  for (const b of $$('nav button'))
    b.setAttribute('aria-current', b.dataset.ekran === ad ? 'true' : 'false')
  if (ad === 'defter' && sayfaIsigi) sayfaIsigi()
  else isikAyarla(14)
}

/** Yazarken arayüz kaybolur; 2.6 saniye sonra geri gelir (PROJE.md §4). */
let odakZaman: ReturnType<typeof setTimeout> | undefined
export function odakVer(): void {
  document.body.classList.add('odak')
  clearTimeout(odakZaman)
  odakZaman = setTimeout(() => document.body.classList.remove('odak'), 2600)
}
export function odakBirak(): void {
  document.body.classList.remove('odak')
}

export const bugun = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const suanSaat = (): string => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/* ── dil ───────────────────────────────────────────────────
   Modül düzeyinde tek bir dil var ve açılışta bir kez kuruluyor. Her
   ekrana parametre olarak geçirmek yerine burada durması bilinçli: dil
   uygulama ömrü boyunca sabit, değişince sayfa yeniden yükleniyor.
   Yarı yarıya çevrilmiş bir ekran hiç olmuyor (KARARLAR.md · K-035). */

/**
 * Dili kurar ve HTML'deki durağan metinleri yerleştirir.
 *
 * `data-m` metni, `data-m-h` HTML'i (içinde <b> olanlar), `data-m-y`
 * yer tutucuyu, `data-m-b` başlık (title) özniteliğini dolduruyor.
 */
export function dilKur(d: Dil): void {
  dilAyarla(d)
  document.documentElement.lang = d
  for (const e of $$('[data-m]')) e.textContent = S(e.dataset.m!)
  for (const e of $$('[data-m-h]')) e.innerHTML = S(e.dataset.mH!)
  for (const e of $$<HTMLInputElement>('[data-m-y]')) e.placeholder = S(e.dataset.mY!)
  for (const e of $$('[data-m-b]')) e.title = S(e.dataset.mB!)
}


/* Tarih yazımı aktif dile göre — ekranlar hangi dilde olduğunu bilmesin. */
export const tarihYaz = (t: string): string => (dil() === 'en' ? tamTarihEn(t) : tamTarih(t))

export const gunAd = (t: string): string => (dil() === 'en' ? gunAdiEn(t) : gunAdi(t))
