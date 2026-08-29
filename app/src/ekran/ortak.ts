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
