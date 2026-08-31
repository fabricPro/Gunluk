import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { krizIsareti } from '../src/cekirdek/kriz.js'

/**
 * İngilizce kriz sınıflandırıcısı — ilke 2.1.
 *
 * Türkçe tablonun birebir karşılığı ve aynı ağırlıkta. Yarım bir
 * yerelleştirme arayüzü çevirir ve bu makineyi Türkçe bırakırdı;
 * İngilizce yazan bir kullanıcı için özellik sessizce hiç çalışmazdı
 * (KARARLAR.md · K-035).
 *
 * "Tetiklememeli" tablosu yine testin yarısı. O tablo boşalırsa özellik
 * çalışıyor değil, bozulmuş demektir.
 */

const kriz = (m: string): boolean => krizIsareti(m, 'en').var

describe('ingilizce · tetiklemeli', () => {
  const acik = [
    'i want to kill myself',
    'I have been thinking about killing myself',
    'i want to die',
    'i just wanna die',
    'i wish i was dead',
    'i wish i were dead',
    "i don't want to live anymore",
    'i dont want to be alive',
    'i cut myself last night',
    'i keep hurting myself',
    'i thought about ending my life',
    'i want to take my own life',
    'i have been suicidal for weeks',
    'i keep thinking about suicide',
    'everyone would be better off without me',
    'they would be better off dead is what i keep thinking about myself',
    'i hope i never wake up',
    'goodbye everyone, thank you for everything',
  ]
  for (const m of acik) it(`«${m}»`, () => expect(kriz(m)).toBe(true))
})

describe('ingilizce · tetiklememeli — deyimler', () => {
  const deyim = [
    'this job is killing me',
    'my feet are killing me after that walk',
    'the deadline was killing me all week',
    'kill me now, another meeting',
    'i could kill for a coffee right now',
    'she absolutely killed it on stage',
    'i am dying to see the new place',
    'dying to know how it ends',
    'i was dying of laughter',
    'dying of boredom in this office',
    'i am starving to death, forgot to eat again',
    'bored to death in that lecture',
    'came home dead tired',
    'i am dead serious about quitting',
    'that cake was to die for',
    'i would die for a proper holiday',
    'i nearly died of embarrassment',
    'quitting now would be career suicide',
    'we watched a film about a suicide mission',
    'i cut myself shaving this morning',
    'i hurt myself playing football again',
    'it scared me half to death',
    'today was awful',
    'everything feels pointless lately',
    'i am so tired of all of this',
    'i feel completely empty',
    'the exam finished me off',
  ]
  for (const m of deyim) it(`«${m}»`, () => expect(kriz(m)).toBe(false))
})

describe('ingilizce · deyim kaçış kapısı değil', () => {
  it('deyimle başlayan kayıtta gerçek işaret hâlâ yakalanıyor', () => {
    expect(
      kriz(
        'this job is killing me and i am dying to leave, but honestly i want to kill myself',
      ),
    ).toBe(true)
  })
})

describe('dil ayrımı', () => {
  it('Türkçe metin İngilizce tabloyla taranmıyor, tersi de', () => {
    expect(krizIsareti('kendimi öldürmek istiyorum', 'tr').var).toBe(true)
    expect(krizIsareti('i want to kill myself', 'en').var).toBe(true)
  })

  /*
   * `dil` argümanının varsayılanı YOK: derleyici her çağrı yerini
   * kontrol etsin. Varsayılan 'tr' iken `defter.ts`te iki, `modelAkis`te
   * bir çağrı dili geçirmeyi atlamıştı — İngilizce yazan bir kullanıcının
   * kriz cümlesi hiç yakalanmıyordu (KARARLAR.md · K-035).
   */
  it('dil argümanı zorunlu — kaynak taraması', () => {
    const kaynak = readFileSync(new URL('../src/cekirdek/kriz.ts', import.meta.url), 'utf8')
    expect(kaynak).toContain('metin: string, dil: Dil)')
    expect(kaynak).not.toContain("dil: Dil = 'tr'")
  })

  it('yanlış dille taranan metin yakalanmıyor — hatanın kendisi bu', () => {
    /* Bu davranışı SABİTLİYORUZ ki neden zorunlu olduğu görünsün. */
    expect(krizIsareti('i want to kill myself', 'tr').var).toBe(false)
    expect(krizIsareti('kendimi öldürmek istiyorum', 'en').var).toBe(false)
  })
})
