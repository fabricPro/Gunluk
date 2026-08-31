import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { Depo } from '../src/veri/depo.js'
import { defteriAc } from '../src/veri/db.js'
import type { SqlSurucu } from '../src/veri/db.js'
import { dokumAl } from '../src/veri/dokum.js'
import { testSurucusu } from './surucu.js'

let db: SqlSurucu
let depo: Depo

beforeEach(async () => {
  db = await defteriAc(testSurucusu())
  depo = new Depo(db)
})

/**
 * İlke 2.1'in ikinci yarısının kanıtı: kriz işareti HİÇBİR YERE YAZILMAZ.
 *
 * Saklanan bir bayrak kullanıcının en kötü anlarının kalıcı kaydı olurdu ve
 * "teşhis çağrışımı yasak" kuralının (PROJE.md §5) tam karşılığıdır. Bu
 * testler o sözün makine kanıtı — `test/yakma.test.ts`'in refleksiyle aynı.
 */
describe('kriz işareti saklanmıyor', () => {
  it('şemada kriz/risk/skor benzeri bir sütun yok', async () => {
    const sutunlar: string[] = []
    for (const t of await db.hepsi<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    ))
      for (const c of await db.hepsi<{ name: string }>(`PRAGMA table_info("${t.name}")`))
        sutunlar.push(`${t.name}.${c.name}`)

    /* Sütun adını parçalara ayırıp tam sözcük karşılaştır: "kapsul.acilma"
       içindeki "acil" bir yanlış eşleşmeydi. */
    const yasak = new Set(['kriz', 'risk', 'skor', 'score', 'duygu', 'mood', 'tehlike'])
    for (const s of sutunlar)
      for (const parca of s.split(/[._]/)) expect(yasak.has(parca.toLowerCase())).toBe(false)
  })

  it('kriz içeren kayıt yazıldıktan sonra dökümde fazladan alan yok', async () => {
    const duz = await depo.kayitEkle({
      tarih: '2026-05-01', saat: '10:00', metin: 'Kerem aradı, konuştuk.',
    })
    const krizli = await depo.kayitEkle({
      tarih: '2026-05-01', saat: '23:50', metin: 'Kendimi öldürmek istiyorum.',
    })
    const d = await dokumAl(db)
    const satirlar = d.tablolar.kayit!
    const a = satirlar.find((r) => r.id === duz.id)!
    const b = satirlar.find((r) => r.id === krizli.id)!
    /* İki kaydın alan listesi birebir aynı olmalı: kriz kaydı işaretli değil. */
    expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort())
  })

  it('döküm metninde kriz bayrağı geçmiyor', async () => {
    await depo.kayitEkle({
      tarih: '2026-05-01', saat: '23:50', metin: 'Kendimi öldürmek istiyorum.',
    })
    const metin = JSON.stringify(await dokumAl(db))
    /* Kullanıcının kendi metni var, ama uygulamanın bir değerlendirmesi yok. */
    expect(metin).toContain('Kendimi öldürmek istiyorum.')
    expect(metin).not.toMatch(/"kriz"|"risk"|"skor"|"tehlike"/i)
  })

  it('ayar tablosuna kriz kaydı düşmüyor', async () => {
    await depo.kayitEkle({
      tarih: '2026-05-01', saat: '23:50', metin: 'Kendimi öldürmek istiyorum.',
    })
    const ayarlar = await db.hepsi<{ anahtar: string }>('SELECT anahtar FROM ayar')
    for (const a of ayarlar) expect(a.anahtar).not.toMatch(/kriz|risk|skor/i)
  })

  it('sınıflandırıcı hiçbir veri katmanı modülü import etmiyor', () => {
    const kaynak = readFileSync(new URL('../src/cekirdek/kriz.ts', import.meta.url), 'utf8')
    const satirlar = [...kaynak.matchAll(/^import([^']*)'([^']+)'/gm)]
    /*
     * Tek izinli import: dil TÜRÜ. `import type` derlemede tamamen
     * siliniyor, yani çalışma zamanında bu modül hâlâ hiçbir şeye
     * bağlı değil. Buraya gerçek bir import eklenirse test düşer ve
     * düşmesi gerekir (K-030, K-035).
     */
    expect(satirlar.map((m) => m[2]!)).toEqual(['./dil.js'])
    for (const m of satirlar) expect(m[1]!.trimStart().startsWith('type ')).toBe(true)
  })

  /* Yakılan sayfa dışarıda: orada hiçbir şey okumaz (ilke 2.2). */
  it('yakılan sayfa sınıflandırıcıyı çağırmıyor', () => {
    const yak = readFileSync(new URL('../src/ekran/yak.ts', import.meta.url), 'utf8')
    expect(yak).not.toContain('kriz')
  })
})
