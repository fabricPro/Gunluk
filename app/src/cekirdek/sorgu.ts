import type { Gun, Kayit, KenarNotu } from './tipler.js'
import type { Dil } from './dil.js'
import { govdeler, metinGovdeleri, ortakGovde } from './govde.js'
import { krizIsareti } from './kriz.js'
import { AY_SIRA, ayAnahtar, ayEk, bas, sayiEk, saatSayi, tamTarih } from './tr.js'
import { AY_AD_EN, ayEkEn, bas as basEn, sayiEkEn, tamTarihEn } from './en.js'

export interface TemaTanim {
  id: string
  ad: string
  anahtar: string[]
}

export interface Bulgu {
  puan: number
  kayit: Kayit
  gunAd: string
  /**
   * Bu kayda düşülmüş ve soruyla eşleşen kenar notları.
   *
   * Kaynak kartında gösterilmek zorunda: kayıt yalnızca notu yüzünden
   * bulunduysa gövdeyi gösterip notu göstermemek, kullanıcıya cevabın
   * neden geldiğini saklamak olurdu (ilke 2.4 · KARARLAR.md · K-026).
   */
  kenarlar: KenarNotu[]
  /**
   * Anlamsal yakınlık — kayıt yalnızca gömü benzerliğiyle bulunduysa
   * dolu. Sözcük eşleşmesinde kaynağı gösterebiliyoruz ("şu sözcük
   * geçiyor"); burada gösteremiyoruz, o yüzden kaynak kartı bunu açıkça
   * söylemek zorunda (ilke 2.4 · KARARLAR.md · K-029).
   */
  yakinlik?: number
}

export interface SorguSonuc {
  bos: boolean
  paragraflar: string[]
  kullanilan: Bulgu[]
  /** Defterde işaretlenecek arama terimi. */
  terim: string
  /**
   * Sorgu sözcüklerinin aday gövdeleri — defterdeki vurgulama bunları
   * kullanıyor, böylece "kötü" arayan sayfada "kötüydüm"ü işaretli görüyor.
   */
  govdeler: string[]
}

/**
 * Arşivin sesi, dil dil.
 *
 * Cümleler burada, `ekran/` katmanında değil: cevabın nasıl kurulduğu
 * ürünün kimliğinin bir parçası ve iki dilde de aynı ağırlıkta olmalı.
 * Türkçe tarafta ek uyumu (`sayiEk`, `ayEk`), İngilizce tarafta tekil/
 * çoğul ayrımı var; ikisi de kendi dilinde doğru cümle kuruyor
 * (KARARLAR.md · K-035).
 */
interface SorguSes {
  aylar: readonly string[]
  gecenAy: RegExp
  durak: Set<string>
  bas(s: string): string
  tamTarih(t: string): string
  ayEk(a: string): string
  donemGiris(ad: string, kapsam: number): string
  donemDaraltma(n: number): string
  toplam(n: number): string
  yalnizHepsiYakin(tek: boolean): string
  yalnizBaziYakin(n: number): string
  yalnizHepsiNot(tek: boolean): string
  yalnizBaziNot(n: number): string
  enSik(liste: string): string
  gece(n: number): string
  aralik(ilk: string, son: string): string
}

/** Soru metninde anlam taşımayan sözcükler. */
const DURAK = new Set([
  'neden', 'niye', 'nasıl', 'nedir', 'kim', 'kimle', 'zaman', 'ne', 'olmuş', 'oldu',
  'ben', 'benim', 'bana', 'beni', 'bu', 'şu', 'şey', 'bir', 'çok', 'daha', 'için',
  'ile', 've', 'ama', 'mi', 'mı', 'mu', 'mü', 'var', 'yok', 'kadar', 'sonra', 'önce',
  'hep', 'hiç', 'geçen', 'hakkında', 'ilgili', 'yazdım', 'yazmışım', 'demiştim',
  'ettim', 'yaptım', 'yaptık', 'hissettim', 'hissediyordum', 'düşündüm', 'iyi',
  'kötü', 'kötüydüm', 'iyiydim', 'ayda', 'ayında', 'bul', 'göster', 'getir', 'anlat',
  'kavgalarım', 'kavga',
])

const DURAK_EN = new Set([
  'why', 'how', 'what', 'when', 'who', 'where', 'which', 'was', 'were', 'did',
  'does', 'the', 'and', 'but', 'for', 'with', 'about', 'that', 'this', 'they',
  'them', 'have', 'has', 'had', 'been', 'being', 'from', 'into', 'over',
  'wrote', 'write', 'written', 'said', 'say', 'felt', 'feel', 'think',
  'thought', 'good', 'bad', 'much', 'more', 'most', 'some', 'any', 'all',
  'show', 'find', 'tell', 'give', 'month', 'time', 'thing', 'things',
])

const SES: Record<Dil, SorguSes> = {
  tr: {
    aylar: Object.keys(AY_SIRA),
    gecenAy: /geçen ay/,
    durak: DURAK,
    bas,
    tamTarih,
    ayEk,
    donemGiris: (ad, kapsam) => `${bas(ad)} ${kapsam} kez yazmışsın.`,
    donemDaraltma: (n) => ` Bu soruyla ilgili ${n} kayıt buldum.`,
    toplam: (n) => `Defterinde bununla ilgili ${n} kayıt var.`,
    yalnizHepsiYakin: (tek) =>
      `${tek ? 'Bu kaydı' : 'Bunların hepsini'} anlam yakınlığıyla buldum — aradığın sözcükler geçmiyor.`,
    yalnizBaziYakin: (n) => `Bunların ${sayiEk(n)} anlam yakınlığıyla geldi.`,
    yalnizHepsiNot: (tek) => `${tek ? 'Bu kaydı' : 'Bunların hepsini'} kenar notundan buldum.`,
    yalnizBaziNot: (n) => `Bunların ${sayiEk(n)} kenar notundan geldi.`,
    enSik: (liste) => `O kayıtlarda en sık geçenler: ${liste}.`,
    gece: (n) => `Bunların ${sayiEk(n)} gece yazılmış.`,
    aralik: (ilk, son) => `İlki ${tamTarih(ilk)}, sonuncusu ${tamTarih(son)}.`,
  },
  en: {
    aylar: AY_AD_EN,
    gecenAy: /last month/,
    durak: DURAK_EN,
    bas: basEn,
    tamTarih: tamTarihEn,
    ayEk: ayEkEn,
    donemGiris: (ad, kapsam) =>
      `You wrote ${kapsam === 1 ? 'once' : `${kapsam} times`} ${ad}.`,
    donemDaraltma: (n) => ` ${n === 1 ? 'One entry' : `${n} entries`} relate to this question.`,
    toplam: (n) =>
      n === 1 ? 'There is one entry about this in your diary.' : `There are ${n} entries about this in your diary.`,
    yalnizHepsiYakin: (tek) =>
      `${tek ? 'I found it' : 'I found all of them'} by meaning — the words you searched for don't appear.`,
    yalnizBaziYakin: (n) => `${basEn(sayiEkEn(n))} came from meaning rather than wording.`,
    yalnizHepsiNot: (tek) =>
      `${tek ? 'I found it' : 'I found all of them'} through a margin note.`,
    yalnizBaziNot: (n) => `${basEn(sayiEkEn(n))} came from a margin note.`,
    enSik: (liste) => `Most frequent in those entries: ${liste}.`,
    gece: (n) => `${basEn(sayiEkEn(n))} ${n === 1 ? 'was' : 'were'} written at night.`,
    aralik: (ilk, son) =>
      `The first is ${tamTarihEn(ilk)}, the last ${tamTarihEn(son)}.`,
  },
}

const BOS: SorguSonuc = { bos: true, paragraflar: [], kullanilan: [], terim: '', govdeler: [] }

/** Sorudaki ay adını yakalar ve o aya ait tüm ay anahtarlarını döndürür. */
function donemBul(
  soru: string,
  mevcutAylar: string[],
  ses: SorguSes,
): { aylar: string[]; ad: string } | null {
  const baglac = ses === SES.en ? ' and ' : ' ve '
  for (let i = 0; i < ses.aylar.length; i++) {
    if (!soru.includes(ses.aylar[i]!)) continue
    const yil = soru.match(/20\d\d/)?.[0]
    const bulunan = mevcutAylar.filter(
      (a) => Number(a.slice(5, 7)) - 1 === i && (!yil || a.startsWith(yil)),
    )
    if (bulunan.length) return { aylar: bulunan, ad: bulunan.map(ses.ayEk).join(baglac) }
    return null
  }
  if (ses.gecenAy.test(soru) && mevcutAylar.length > 1) {
    const a = mevcutAylar[mevcutAylar.length - 2]!
    return { aylar: [a], ad: ses.ayEk(a) }
  }
  return null
}

/**
 * Doğal dildeki soruyu kullanıcının kendi kayıtlarından cevaplar.
 * Uydurma yok: cevap yalnızca bulunan kayıtlardan kurulur (ilke 2.4).
 *
 * PROJE.md §7'deki iki hata burada bilerek düzeltilmiş durumda:
 *  - tema adı geçtiğinde havuz o temaya kilitlenir, alakasız kayıt sızmaz;
 *  - dönem sorusunda o ayın tamamı geçerli sayılır, sonuç boş dönmez.
 */
export function soruCoz(
  soru: string,
  gunler: Gun[],
  temalar: TemaTanim[],
  kenarlar: Map<string, KenarNotu[]> = new Map(),
  /**
   * kayitId -> anlamsal yakınlık. Gömü araması açıkken ekran katmanı
   * dolduruyor; `soruCoz` saf ve eşzamanlı kalsın diye vektör işi dışarıda.
   */
  yakinlar: Map<string, number> = new Map(),
  dil: Dil = 'tr',
): SorguSonuc {
  const ses = SES[dil]
  const s = soru.toLocaleLowerCase(dil).trim()
  if (!s) return BOS

  const mevcutAylar = [...new Set(gunler.map((g) => ayAnahtar(g.tarih)))].sort()
  const donem = donemBul(s, mevcutAylar, ses)

  const eslesenTemalar = temalar.filter(
    (t) => s.includes(t.ad.toLocaleLowerCase(dil)) || t.anahtar.some((a) => s.includes(a)),
  )
  const temaAdi = new Map(temalar.map((t) => [t.id, t.ad]))

  /* Ay ve tema adlarını sorudan düş, kalan sözcükler serbest arama terimi. */
  let temiz = s
  for (const ad of ses.aylar) temiz = temiz.split(ad).join(' ')
  for (const t of eslesenTemalar) temiz = temiz.split(t.ad.toLocaleLowerCase(dil)).join(' ')
  const kelimeler = temiz
    .replace(/[.,!?;:«»"']/g, ' ')
    .split(/\s+/)
    .filter((k) => k.length > 3 && !ses.durak.has(k))

  /* Sorgu sözcüklerinin aday gövdeleri bir kez üretiliyor. */
  const sorguGovde = new Map(kelimeler.map((k) => [k, govdeler(k, dil)] as const))

  const havuz = donem ? gunler.filter((g) => donem.aylar.includes(ayAnahtar(g.tarih))) : gunler
  const temaKilidi = eslesenTemalar.map((t) => t.id)

  const bulgular: Bulgu[] = []
  for (const gun of havuz) {
    for (const kayit of gun.kayitlar) {
      /* Tema kilidi: tema adı geçtiyse o temayı taşımayan kayıt elenir. */
      if (temaKilidi.length && !temaKilidi.some((id) => kayit.temalar.includes(id))) continue
      let puan = 0
      const metin = kayit.metin.toLocaleLowerCase(dil)
      /*
       * İlke 2.1: kriz işareti içeren kayıt "örüntüye dahil edilmez, arşiv
       * cevabında kullanılmaz". Sayıma da girmiyor — "N kayıt var" sayısı
       * bile varlığını sızdırmamalı. Bayrak saklanmıyor, burada yeniden
       * hesaplanıyor (KARARLAR.md · K-030).
       */
      if (krizIsareti(kayit.metin, dil).var) continue

      const notlar = kenarlar.get(kayit.id) ?? []
      for (const id of temaKilidi) if (kayit.temalar.includes(id)) puan += 4

      /*
       * Sözcük kayıtta YA DA kenar notunda geçiyorsa +2 — sözcük başına en
       * fazla bir kez. Not eşleşmesi sıralamayı şişirmiyor: mesele
       * bulunabilirlik, üstünlük değil. İkisini ayrı saymak, bir kez
       * yazılıp bir kez de not düşülen konuyu haksız yere öne çıkarırdı.
       */
      const eslesenNotlar: KenarNotu[] = []
      /*
       * Gövdeler kayıt başına bir kez. Alt-dize yolu duruyor: bugünkü
       * davranış aynen korunsun, gövdeleme yalnızca KAZANÇ eklesin
       * (KARARLAR.md · K-027).
       */
      const kayitGovde = metinGovdeleri(kayit.metin, dil)
      for (const k of kelimeler) {
        const aday = sorguGovde.get(k)!
        const kayitta = metin.includes(k) || ortakGovde(aday, kayitGovde)
        const nottakiler = notlar.filter(
          (n) =>
            n.metin.toLocaleLowerCase(dil).includes(k) ||
            ortakGovde(aday, metinGovdeleri(n.metin, dil)),
        )
        for (const n of nottakiler) if (!eslesenNotlar.includes(n)) eslesenNotlar.push(n)
        if (kayitta || nottakiler.length) puan += 2
      }
      /*
       * Anlamsal yakınlık bir İPUCU, kanıt değil: en fazla 1 puan ekliyor,
       * yani tek bir sözcük eşleşmesinin (2 puan) bile altında kalıyor.
       * Aksi hâlde kullanıcının gerçekten yazdığı sözcüğü içeren kayıt,
       * "anlamca yakın" bir kaydın arkasında kalırdı.
       */
      const yakinlik = yakinlar.get(kayit.id)
      const sozcukEslesti = puan > 0
      if (yakinlik !== undefined) puan += yakinlik

      /* Dönem sorusunda o ayın tamamı geçerli — yoksa hiç sonuç dönmez. */
      if (!puan && donem) puan = 1
      if (puan > 0)
        bulgular.push({
          puan,
          kayit,
          gunAd: gun.ad,
          kenarlar: eslesenNotlar,
          /* Yalnızca sözcük eşleşmesi YOKKEN anlamsal olarak işaretleniyor;
             ikisi birden varsa kaynak zaten sözcüğün kendisi. */
          ...(yakinlik !== undefined && !sozcukEslesti ? { yakinlik } : {}),
        })
    }
  }
  if (!bulgular.length) return BOS

  bulgular.sort((a, b) => b.puan - a.puan || a.kayit.tarih.localeCompare(b.kayit.tarih))
  const kullanilan = bulgular.slice(0, 4)
  const kapsam = donem
    ? havuz.reduce((n, g) => n + g.kayitlar.length, 0)
    : bulgular.length

  const say = new Map<string, number>()
  for (const b of bulgular)
    for (const id of b.kayit.temalar) say.set(id, (say.get(id) ?? 0) + 1)
  const enSik = [...say.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  const gece = bulgular.filter((b) => {
    const h = saatSayi(b.kayit.saat)
    return h < 5 || h >= 22
  }).length

  const p: string[] = []
  if (donem)
    p.push(
      ses.donemGiris(donem.ad, kapsam) +
        (bulgular.length < kapsam ? ses.donemDaraltma(bulgular.length) : ''),
    )
  else p.push(ses.toplam(bulgular.length))

  /*
   * Yalnızca kenar notu yüzünden bulunan kayıtlar ayrıca söyleniyor.
   * Yorum değil, kaynak beyanı: cevabın nereden geldiği görünmeli.
   */
  const yalnizNot = bulgular.filter(
    (b) =>
      b.kenarlar.length &&
      !kelimeler.some(
        (k) =>
          b.kayit.metin.toLocaleLowerCase(dil).includes(k) ||
          ortakGovde(sorguGovde.get(k)!, metinGovdeleri(b.kayit.metin, dil)),
      ),
  ).length
  const yalnizYakin = bulgular.filter((b) => b.yakinlik !== undefined).length
  if (yalnizYakin)
    p.push(
      yalnizYakin === bulgular.length
        ? ses.yalnizHepsiYakin(bulgular.length === 1)
        : ses.yalnizBaziYakin(yalnizYakin),
    )

  if (yalnizNot)
    p.push(
      yalnizNot === bulgular.length
        ? ses.yalnizHepsiNot(bulgular.length === 1)
        : ses.yalnizBaziNot(yalnizNot),
    )

  if (enSik.length)
    p.push(
      ses.enSik(
        enSik.map(([id, n]) => `<b>${temaAdi.get(id) ?? id}</b> (${n})`).join(', '),
      ),
    )
  if (gece > bulgular.length * 0.35) p.push(ses.gece(gece))

  const sirali = bulgular.map((b) => b.kayit.tarih).sort()
  const ilk = sirali[0]!
  const son = sirali[sirali.length - 1]!
  if (ilk !== son) p.push(ses.aralik(ilk, son))

  return {
    bos: false,
    paragraflar: p,
    kullanilan,
    terim: kelimeler[0] ?? eslesenTemalar[0]?.ad ?? '',
    govdeler: [...new Set(kelimeler.flatMap((k) => [...sorguGovde.get(k)!]))],
  }
}
