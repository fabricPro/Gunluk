import { describe, expect, it } from 'vitest'
import { krizIsareti } from '../src/cekirdek/kriz.js'

/**
 * İlke 2.1'in makine kanıtı.
 *
 * İki tablo, iki yönlü risk. Üstteki boşsa ilke kâğıt üstünde kalır;
 * alttaki bozulursa uygulama ruh hâli ölçen bir şeye döner ve kullanıcıya
 * dürüst yazmayı bıraktırır — ki bu, hiç olmamasından kötü.
 */

/** Kart çıkmalı — açık ifadeler, çekimleriyle. */
const TETIKLEMELI = [
  'Kendimi öldürmek istiyorum.',
  'kendimi öldüreceğim',
  'Artık yaşamak istemiyorum.',
  'Ölmek istiyorum, bu kadar basit.',
  'Hayatıma son vermeyi düşünüyorum.',
  'intihar etmeyi düşünüyorum',
  'İntihar aklımdan çıkmıyor.',
  'Kendime zarar verdim yine.',
  'kendime zarar vermek istiyorum',
  'Bileklerimi kestim.',
  'Olmasam daha iyi olur herkes için.',
  'Yok olsam daha iyi.',
  'Bu sabah uyanmak istemiyorum, hiç uyanmasam.',
]

/**
 * Kart ÇIKMAMALI. Çoğu Türkçe abartma deyimi: "öl-" kökü bu kalıpların
 * merkezinde ve deyim listesi olmadan sınıflandırıcı her gün tetiklenir.
 */
const TETIKLEMEMELI = [
  /* deyimler */
  'Bu iş beni öldürüyor.',
  'Bu proje beni bitirdi resmen.',
  'Açlıktan ölüyorum, akşama kadar bir şey yemedim.',
  'Gülmekten öldüm.',
  'Ölesiye yoruldum bugün.',
  'Canıma tak etti artık.',
  'Sınav beni bitirdi.',
  'Yorgunluktan ölüyorum.',
  /* ağır ama kriz değil — dar eşik bunları kapsamıyor */
  'Bugün berbatım.',
  'Her şey anlamsız geliyor.',
  'Kendimi çok yalnız hissediyorum.',
  'Hiçbir şey istemiyorum bugün.',
  'Kimse beni anlamıyor.',
  'Umutsuzum.',
  'Çok kötü bir gün geçirdim, ağladım.',
  /* alakasız */
  'Kerem aradı, konuştuk.',
  'Tez teslim edildi.',
  '',
  '   ',
]

describe('kriz işareti · tetiklemeli', () => {
  for (const c of TETIKLEMELI)
    it(`"${c}"`, () => {
      const s = krizIsareti(c, 'tr')
      expect(s.var, `kalıp: ${s.kalip ?? 'yok'}`).toBe(true)
    })
})

describe('kriz işareti · tetiklememeli', () => {
  for (const c of TETIKLEMEMELI)
    it(`"${c.trim() || '(boş)'}"`, () => {
      const s = krizIsareti(c, 'tr')
      expect(s.var, `yanlış alarm — kalıp: ${s.kalip ?? 'yok'}`).toBe(false)
    })
})

describe('kriz işareti · davranış', () => {
  it('hangi kalıbın tetiklediğini söylüyor', () => {
    expect(krizIsareti('intihar etmeyi düşünüyorum', 'tr').kalip).toBe('intihar')
  })

  it('büyük/küçük harf ve noktalama fark etmiyor', () => {
    expect(krizIsareti('KENDİMİ ÖLDÜRMEK İSTİYORUM!!!', 'tr').var).toBe(true)
    expect(krizIsareti('kendimi   öldürmek\nistiyorum', 'tr').var).toBe(true)
  })

  it('uzun bir kaydın ortasındaki ifadeyi yakalıyor', () => {
    const uzun =
      'Bugün işe gittim, hava güzeldi. Öğlen Kerem aradı. ' +
      'Sonra eve döndüm ve bileklerimi kestim. ' +
      'Akşam annem yemek yaptı, birlikte film izledik.'
    expect(krizIsareti(uzun, 'tr').var).toBe(true)
  })

  it('deyim aynı kayıtta geçse bile açık ifade önceliğini kaybetmiyor', () => {
    /* Deyim listesi bir kaçış kapısı olmamalı. */
    const s = krizIsareti('Bu iş beni öldürüyor. Akşam eve gelince bileklerimi kestim.', 'tr')
    expect(s.var).toBe(true)
  })
})
