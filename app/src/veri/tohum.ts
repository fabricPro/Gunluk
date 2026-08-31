import { gunAdi, iso } from '../cekirdek/tr.js'
import type { Dil } from '../cekirdek/dil.js'
import type { Depo } from './depo.js'

/**
 * Demo verisi — YALNIZCA geliştirme içindir, `?tohum=1` ile çağrılır.
 * Gerçek kullanıcı defteri sıfır kayıtla açar; boş defter ekranı Faz 1.2.
 *
 * Kavram demosundaki tohumlu üretecin aynısı: aynı çekirdek, aynı sonuç.
 */
const cekirdek = (a: number) => () => {
  a |= 0
  a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

interface Donem { ay: string; yaz: number; w: Record<string, number> }

const TEMALAR: [string, string, string[]][] = [
  ['tez', 'Tez', ['tez', 'bitirme']],
  ['is', 'İş', ['iş', 'mülakat', 'cv', 'başvuru']],
  ['annem', 'Annem', ['annem', 'anne']],
  ['ece', 'Ece', ['ece']],
  ['kerem', 'Kerem', ['kerem']],
  ['baris', 'Barış', ['barış']],
  ['uyku', 'Uyku', ['uyku', 'uyuya', 'uykusuz']],
  ['yetersiz', 'Yetersizlik', ['yetersiz', 'beceremiyorum', 'başaramıyorum']],
  ['beklemek', 'Beklemek', ['bekliyorum', 'bekledim', 'yazmadı']],
  ['umut', 'Umut', ['umut', 'iyi geldi', 'sevindim']],
  ['ev', 'Ev', ['ev', 'oda']],
  ['yuruyus', 'Yürüyüş', ['yürüyüş', 'yürüdüm']],
]

/*
 * Tema adları ve cümleler iki dilde.
 *
 * Mağaza görselleri iki dilde çekiliyor ve İngilizce listede Türkçe
 * günlük metni görünmesi ürünü bozuk gösterirdi. Aynı örüntü, aynı
 * tohum, aynı yoğunluk — yalnızca dil değişiyor (KARARLAR.md · K-035).
 */
const TEMALAR_EN: [string, string, string[]][] = [
  ['tez', 'Thesis', ['thesis', 'dissertation']],
  ['is', 'Work', ['work', 'interview', 'cv', 'application']],
  ['annem', 'Mum', ['mum', 'mother']],
  ['ece', 'Ece', ['ece']],
  ['kerem', 'Kerem', ['kerem']],
  ['baris', 'Baris', ['baris']],
  ['uyku', 'Sleep', ['sleep', 'slept', 'sleepless']],
  ['yetersiz', 'Not enough', ['not enough', "can't do", 'failing']],
  ['beklemek', 'Waiting', ['waiting', 'waited', "didn't write"]],
  ['umut', 'Hope', ['hope', 'helped', 'glad']],
  ['ev', 'Home', ['home', 'room']],
  ['yuruyus', 'Walking', ['walk', 'walked']],
]

const CUMLE_EN: Record<string, string[]> = {
  tez: [
    "Couldn't sit down for the thesis again today.",
    "My supervisor hasn't replied; I'm waiting.",
    'Wrote one paragraph, then deleted it.',
  ],
  is: [
    'Sent out three more applications.',
    "None of them came back to me.",
    'Rewrote the CV from scratch again.',
  ],
  annem: [
    'Mum asked again and I had no answer.',
    'My voice shook while talking to Mum.',
    'Lied to Mum. Said I was fine.',
  ],
  ece: [
    "Ece called, I didn't pick up.",
    'Talked to Ece; it helped.',
    'Wanted to tell Ece, and could not.',
  ],
  kerem: [
    "Kerem didn't write again.",
    "Looked at Kerem's story.",
    'Kerem liked one thing today, that was all.',
  ],
  baris: ['Met up with Baris.', 'Baris called; we talked for a long time.', 'No word from Baris.'],
  uyku: ['Fell asleep near dawn again.', 'Slept two hours.', "Can't sleep, it's three."],
  yetersiz: [
    "Couldn't manage this either.",
    'Everyone is doing something and I am standing still.',
    "I'm twenty-three and there is nothing.",
  ],
  beklemek: [
    "I'm waiting. I don't know what for.",
    "I can't stop looking at my phone.",
    "I keep waiting for something to happen.",
  ],
  umut: ['Today was a little better.', 'Maybe it will work out.', 'Felt good for the first time in a long while.'],
  ev: ['Stayed in the room all day.', "Didn't leave the house.", 'The house is very quiet.'],
  yuruyus: ['Went out for a walk; it helped.', 'Walked for an hour.', 'Walking cleared my head.'],
}

const CUMLE: Record<string, string[]> = {
  tez: ['Tez için bugün de oturamadım.', 'Danışman dönmedi, bekliyorum.', 'Bir paragraf yazdım, sonra sildim.'],
  is: ['Üç başvuru daha yaptım.', 'Hiçbirinden dönmediler.', 'CV’yi yine baştan yazdım.'],
  annem: ['Annem yine sordu, cevap veremedim.', 'Annemle konuşurken sesim titredi.', 'Anneme yalan söyledim, iyiyim dedim.'],
  ece: ['Ece aradı, açmadım.', 'Ece’yle konuştuk, iyi geldi.', 'Ece’ye anlatmak istedim, anlatamadım.'],
  kerem: ['Kerem yine yazmadı.', 'Kerem’in hikâyesine baktım.', 'Kerem bugün bir şey beğendi, sadece o.'],
  baris: ['Barış’la görüştük.', 'Barış aradı, uzun konuştuk.', 'Barış’tan haber yok.'],
  uyku: ['Yine sabaha karşı uyudum.', 'İki saat uyudum.', 'Uyuyamıyorum, saat üç.'],
  yetersiz: ['Bunu da beceremedim.', 'Herkes bir şey yapıyor, ben duruyorum.', 'Yirmi üç yaşındayım ve hiçbir şey yok.'],
  beklemek: ['Bekliyorum. Neyi bilmiyorum.', 'Telefona bakmayı bırakamıyorum.', 'Bir şey olacak diye bekliyorum.'],
  umut: ['Bugün biraz iyiydi.', 'Belki olur.', 'Uzun zamandır ilk defa iyi hissettim.'],
  ev: ['Bütün gün odadaydım.', 'Evden çıkmadım.', 'Ev çok sessiz.'],
  yuruyus: ['Yürüyüşe çıktım, iyi geldi.', 'Bir saat yürüdüm.', 'Yürürken kafam açıldı.'],
}

const DONEMLER: Donem[] = [
  { ay: '2025-06', yaz: 1.4, w: { tez: 3, ece: 2, baris: 2, umut: 2, ev: 1 } },
  { ay: '2025-07', yaz: 1.2, w: { tez: 3, baris: 3, ece: 2, uyku: 1 } },
  { ay: '2025-08', yaz: 1.0, w: { tez: 2, ev: 2, uyku: 2, yetersiz: 1 } },
  { ay: '2025-09', yaz: 1.6, w: { tez: 4, yetersiz: 2, uyku: 2, annem: 1 } },
  { ay: '2025-10', yaz: 1.8, w: { tez: 4, yetersiz: 3, annem: 2, uyku: 2 } },
  { ay: '2025-11', yaz: 1.5, w: { tez: 3, baris: 2, yetersiz: 2, ev: 2 } },
  { ay: '2025-12', yaz: 1.1, w: { tez: 2, ev: 3, annem: 2, uyku: 2 } },
  { ay: '2026-01', yaz: 1.3, w: { is: 3, yetersiz: 3, annem: 2, umut: 1 } },
  { ay: '2026-02', yaz: 0.8, w: { yetersiz: 4, uyku: 3, ev: 3, annem: 1 } },
  { ay: '2026-03', yaz: 0.7, w: { yetersiz: 4, uyku: 3, ev: 3 } },
  { ay: '2026-04', yaz: 1.2, w: { is: 3, yuruyus: 2, umut: 2, annem: 2 } },
  { ay: '2026-05', yaz: 1.9, w: { kerem: 4, beklemek: 3, is: 2, umut: 2 } },
  { ay: '2026-06', yaz: 2.2, w: { kerem: 4, beklemek: 4, yetersiz: 2, ece: 2 } },
  { ay: '2026-07', yaz: 2.0, w: { kerem: 3, beklemek: 3, is: 3, annem: 2 } },
  { ay: '2026-08', yaz: 2.4, w: { is: 4, kerem: 3, beklemek: 2, umut: 2, yuruyus: 1 } },
]

export async function tohumEk(
  depo: Depo,
  bitis = '2026-08-28',
  dil: Dil = 'tr',
): Promise<number> {
  if ((await depo.kayitSayisi()) > 0) return 0
  const rnd = cekirdek(20260828)
  const sec = <T>(d: T[]): T => d[Math.floor(rnd() * d.length)]!
  const en = dil === 'en'
  const temalar = en ? TEMALAR_EN : TEMALAR
  const cumleler = en ? CUMLE_EN : CUMLE

  for (const [id, ad, anahtar] of temalar) await depo.temaTanimla(id, ad, anahtar)

  const agirlikliSec = (w: Record<string, number>, adet: number): string[] => {
    const havuz: string[] = []
    for (const [k, v] of Object.entries(w)) for (let i = 0; i < v; i++) havuz.push(k)
    const s = new Set<string>()
    let n = 0
    while (s.size < adet && n++ < 40) s.add(sec(havuz))
    return [...s]
  }
  const saatSec = (tm: string[]): number => {
    if (tm.some((t) => t === 'kerem' || t === 'beklemek') && rnd() < 0.5)
      return rnd() < 0.5 ? 22 + Math.floor(rnd() * 2) : Math.floor(rnd() * 4)
    if (tm.includes('uyku') && rnd() < 0.4)
      return rnd() < 0.5 ? 1 + Math.floor(rnd() * 3) : 8 + Math.floor(rnd() * 2)
    return 9 + Math.floor(rnd() * 13)
  }

  let adetToplam = 0
  let ilkKayitId: string | null = null
  const sonGun = new Date(bitis + 'T12:00')
  const gunlukKayitlar: { tarih: string; saat: string; metin: string; temalar: string[] }[] = []
  for (const d = new Date(2025, 5, 1); d <= sonGun; d.setDate(d.getDate() + 1)) {
    const tarih = iso(d)
    const dn = DONEMLER.find((x) => x.ay === tarih.slice(0, 7))
    if (!dn) continue
    let adet = 0
    if (rnd() < dn.yaz / 3.2)
      adet = 1 + (rnd() < dn.yaz / 3.6 ? 1 : 0) + (rnd() < dn.yaz / 7.5 ? 1 : 0)
    if (!adet) continue
    const gunlukler: { saat: string; metin: string; temalar: string[] }[] = []
    for (let i = 0; i < adet; i++) {
      const tm = agirlikliSec(dn.w, 1 + (rnd() < 0.55 ? 1 : 0))
      const s = saatSec(tm)
      gunlukler.push({
        saat: `${String(s).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}`,
        metin: tm.map((x) => sec(cumleler[x] ?? ['…'])).join(' '),
        temalar: tm,
      })
    }
    gunlukler.sort((a, b) => a.saat.localeCompare(b.saat))
    for (const k of gunlukler) gunlukKayitlar.push({ tarih, ...k })
  }

  /* Tek işlem — yüzlerce ayrı yazma yerine. */
  await depo.islem(async () => {
    for (const k of gunlukKayitlar) {
      const kayit = await depo.kayitEkle(k)
      ilkKayitId ??= kayit.id
      adetToplam++
    }
    await depo.defterAdiYaz(depo.aktifDefterId, en ? 'Last year' : 'Son yıl')
    /* Tohum verisi 45 sayfayı aşıyor; defter dolu görünüp yazmayı
       engellemesin diye sınırı içeriğe göre açıyoruz. */
    await depo.sayfaSiniriYaz(depo.aktifDefterId, 120)
    if (ilkKayitId) await depo.baslikYaz(ilkKayitId, en ? 'Last summer' : 'Son yaz')
  })
  console.info(`[defter] tohum: ${adetToplam} kayıt eklendi (${gunAdi(bitis)} gününe kadar).`)
  return adetToplam
}
