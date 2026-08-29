import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Depo } from '../src/veri/depo.js'
import { defteriAc } from '../src/veri/db.js'
import { testSurucusu } from './surucu.js'

const dizinler: string[] = []
const gecici = () => {
  const d = mkdtempSync(join(tmpdir(), 'defter-'))
  dizinler.push(d)
  return join(d, 'defter.db')
}

afterEach(() => {
  for (const d of dizinler.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('kalıcılık — Milestone 1in asıl sözü', () => {
  it('yazılan kayıt uygulama kapanıp açılınca yerinde durur', async () => {
    const dosya = gecici()

    const ilk = testSurucusu(dosya)
    const depo1 = new Depo(await defteriAc(ilk))
    const k = await depo1.kayitEkle({
      tarih: '2026-08-28',
      saat: '14:50',
      metin: 'Fena geçmedi. Konuşabildim, donup kalmadım.',
      temalar: ['is', 'umut'],
    })
    await depo1.baslikYaz(k.id, 'Mülakat haftası')
    await depo1.defterAdiYaz(depo1.aktifDefterId, 'Son yıl')
    await depo1.kenarEkle(k.id, 'Bunu okuyan ben: o gün başladı.', '29 ağustos 2026')
    await ilk.kapat()

    /* uygulama kapandı, yeniden açılıyor */
    const ikinci = testSurucusu(dosya)
    const depo2 = new Depo(await defteriAc(ikinci))
    const geri = await depo2.kayitGetir(k.id)
    expect(geri?.metin).toBe('Fena geçmedi. Konuşabildim, donup kalmadım.')
    expect(geri?.temalar.sort()).toEqual(['is', 'umut'])
    expect((await depo2.basliklar()).get(k.id)).toBe('Mülakat haftası')
    expect((await depo2.defterGetir(depo2.aktifDefterId))?.ad).toBe('Son yıl')
    expect((await depo2.kenarlar()).get(k.id)?.metin).toContain('o gün başladı')
    expect(await depo2.ara('konuşabildim')).toHaveLength(1)
    await ikinci.kapat()
  })

  it('ikinci açılışta göç tekrar uygulanmaz, veri bozulmaz', async () => {
    const dosya = gecici()
    const a = testSurucusu(dosya)
    await new Depo(await defteriAc(a)).kayitEkle({ tarih: '2026-01-01', saat: '00:01', metin: 'ilk' })
    await a.kapat()
    const b = testSurucusu(dosya)
    const depo = new Depo(await defteriAc(b))
    expect(await depo.kayitSayisi()).toBe(1)
    await b.kapat()
  })

  it('silinen kaydın metni dosyada kalmaz (secure_delete)', async () => {
    const dosya = gecici()
    const db = testSurucusu(dosya)
    const depo = new Depo(await defteriAc(db))
    const isaret = 'PARMAKIZI-' + 'q'.repeat(60)
    const k = await depo.kayitEkle({ tarih: '2026-05-05', saat: '12:00', metin: isaret })
    await depo.kayitSil(k.id)
    await db.calistir('PRAGMA wal_checkpoint(TRUNCATE)')
    await db.calistir('VACUUM')
    await db.kapat()

    const dizin = dosya.slice(0, dosya.lastIndexOf('/'))
    for (const ad of readdirSync(dizin))
      expect(readFileSync(join(dizin, ad)).includes(Buffer.from(isaret))).toBe(false)
  })
})
