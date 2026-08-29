import { describe, expect, it } from 'vitest'
import { soruCoz, type TemaTanim } from '../src/cekirdek/sorgu.js'
import type { Gun } from '../src/cekirdek/tipler.js'
import { gunAdi } from '../src/cekirdek/tr.js'

const TEMALAR: TemaTanim[] = [
  { id: 'kerem', ad: 'Kerem', anahtar: ['kerem'] },
  { id: 'tez', ad: 'Tez', anahtar: ['tez', 'bitirme'] },
  { id: 'annem', ad: 'Annem', anahtar: ['annem', 'anne'] },
]

let sayac = 0
const k = (tarih: string, saat: string, metin: string, temalar: string[] = []) => ({
  id: `k${++sayac}`,
  tarih,
  saat,
  metin,
  temalar,
  duzenlendi: false,
})

const gun = (tarih: string, ...kayitlar: ReturnType<typeof k>[]): Gun => ({
  tarih,
  ad: gunAdi(tarih),
  kayitlar,
})

const VERI: Gun[] = [
  gun(
    '2026-02-03',
    k('2026-02-03', '23:40', 'Kerem yine yazmadı, bekliyorum.', ['kerem']),
    k('2026-02-03', '14:00', 'Tez için bugün hiçbir şey yazmadım.', ['tez']),
  ),
  gun('2026-02-11', k('2026-02-11', '02:10', 'Kerem hakkında düşünmeyi bırakamıyorum.', ['kerem'])),
  gun('2026-02-19', k('2026-02-19', '10:00', 'Tez danışmanına yazdım, dönmedi.', ['tez'])),
  gun('2026-02-25', k('2026-02-25', '09:15', 'Annemle kahvaltı ettik, iyiydi.', ['annem'])),
  gun('2026-03-04', k('2026-03-04', '21:00', 'Kerem aradı. Konuştuk.', ['kerem'])),
  gun('2026-03-18', k('2026-03-18', '13:00', 'Tez teslim edildi.', ['tez'])),
]

describe('soruCoz — PROJE.md §7 regresyonları', () => {
  it('tema adı geçtiğinde havuz o temaya kilitlenir', () => {
    /* "yazdım" sözcüğü tez kayıtlarında da geçiyor; sızmamalı. */
    const s = soruCoz('kerem hakkında ne yazdım', VERI, TEMALAR)
    expect(s.bos).toBe(false)
    for (const b of s.kullanilan) expect(b.kayit.temalar).toContain('kerem')
    const metinler = s.kullanilan.map((b) => b.kayit.metin).join(' ')
    expect(metinler).not.toContain('Tez')
  })

  it('dönem sorusunda o ayın tamamı geçerli sayılır', () => {
    const s = soruCoz('şubatta neden bu kadar kötüydüm', VERI, TEMALAR)
    expect(s.bos).toBe(false)
    /* şubattaki beş kaydın hepsi havuzda */
    expect(s.paragraflar[0]).toContain("Şubat 2026'da 5 kez yazmışsın")
    const tarihler = s.kullanilan.map((b) => b.kayit.tarih)
    for (const t of tarihler) expect(t.startsWith('2026-02')).toBe(true)
  })
})

describe('soruCoz — genel davranış', () => {
  it('boş soru boş sonuç', () => {
    expect(soruCoz('   ', VERI, TEMALAR).bos).toBe(true)
  })

  it('kaydı olmayan konuda uydurmaz (ilke 2.4)', () => {
    const s = soruCoz('barcelona tatili', VERI, TEMALAR)
    expect(s.bos).toBe(true)
    expect(s.kullanilan).toEqual([])
  })

  it('tema + dönem birlikte daraltır', () => {
    const s = soruCoz('şubatta kerem', VERI, TEMALAR)
    expect(s.bos).toBe(false)
    for (const b of s.kullanilan) {
      expect(b.kayit.temalar).toContain('kerem')
      expect(b.kayit.tarih.startsWith('2026-02')).toBe(true)
    }
  })

  it('gece yazılanları sayar', () => {
    const s = soruCoz('kerem', VERI, TEMALAR)
    /* üç kerem kaydının ikisi gece (23:40, 02:10) */
    expect(s.paragraflar.some((p) => p.includes('gece yazılmış'))).toBe(true)
  })

  it('kaynak kayıtları her zaman döndürür', () => {
    const s = soruCoz('tez', VERI, TEMALAR)
    expect(s.kullanilan.length).toBeGreaterThan(0)
    for (const b of s.kullanilan) expect(b.kayit.id).toBeTruthy()
  })

  it('ilk ve son kaydın tarihini verir', () => {
    const s = soruCoz('tez', VERI, TEMALAR)
    expect(s.paragraflar.some((p) => p.includes('İlki 3 şubat 2026'))).toBe(true)
  })

  it('kayıt yokken çökmez', () => {
    expect(soruCoz('kerem', [], TEMALAR).bos).toBe(true)
  })
})
