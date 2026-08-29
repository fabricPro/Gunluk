import type { Gun, Kayit, KenarNotu } from './tipler.js'
import { AY_SIRA, ayAnahtar, ayEk, bas, sayiEk, saatSayi, tamTarih } from './tr.js'

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
}

export interface SorguSonuc {
  bos: boolean
  paragraflar: string[]
  kullanilan: Bulgu[]
  /** Defterde işaretlenecek arama terimi. */
  terim: string
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

const BOS: SorguSonuc = { bos: true, paragraflar: [], kullanilan: [], terim: '' }

/** Sorudaki ay adını yakalar ve o aya ait tüm ay anahtarlarını döndürür. */
function donemBul(soru: string, mevcutAylar: string[]): { aylar: string[]; ad: string } | null {
  for (const [ad, i] of Object.entries(AY_SIRA)) {
    if (!soru.includes(ad)) continue
    const yil = soru.match(/20\d\d/)?.[0]
    const bulunan = mevcutAylar.filter(
      (a) => Number(a.slice(5, 7)) - 1 === i && (!yil || a.startsWith(yil)),
    )
    if (bulunan.length) return { aylar: bulunan, ad: bulunan.map(ayEk).join(' ve ') }
    return null
  }
  if (/geçen ay/.test(soru) && mevcutAylar.length > 1) {
    const a = mevcutAylar[mevcutAylar.length - 2]!
    return { aylar: [a], ad: ayEk(a) }
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
): SorguSonuc {
  const s = soru.toLocaleLowerCase('tr').trim()
  if (!s) return BOS

  const mevcutAylar = [...new Set(gunler.map((g) => ayAnahtar(g.tarih)))].sort()
  const donem = donemBul(s, mevcutAylar)

  const eslesenTemalar = temalar.filter(
    (t) => s.includes(t.ad.toLocaleLowerCase('tr')) || t.anahtar.some((a) => s.includes(a)),
  )
  const temaAdi = new Map(temalar.map((t) => [t.id, t.ad]))

  /* Ay ve tema adlarını sorudan düş, kalan sözcükler serbest arama terimi. */
  let temiz = s
  for (const ad of Object.keys(AY_SIRA)) temiz = temiz.split(ad).join(' ')
  for (const t of eslesenTemalar) temiz = temiz.split(t.ad.toLocaleLowerCase('tr')).join(' ')
  const kelimeler = temiz
    .replace(/[.,!?;:«»"']/g, ' ')
    .split(/\s+/)
    .filter((k) => k.length > 3 && !DURAK.has(k))

  const havuz = donem ? gunler.filter((g) => donem.aylar.includes(ayAnahtar(g.tarih))) : gunler
  const temaKilidi = eslesenTemalar.map((t) => t.id)

  const bulgular: Bulgu[] = []
  for (const gun of havuz) {
    for (const kayit of gun.kayitlar) {
      /* Tema kilidi: tema adı geçtiyse o temayı taşımayan kayıt elenir. */
      if (temaKilidi.length && !temaKilidi.some((id) => kayit.temalar.includes(id))) continue
      let puan = 0
      const metin = kayit.metin.toLocaleLowerCase('tr')
      const notlar = kenarlar.get(kayit.id) ?? []
      for (const id of temaKilidi) if (kayit.temalar.includes(id)) puan += 4

      /*
       * Sözcük kayıtta YA DA kenar notunda geçiyorsa +2 — sözcük başına en
       * fazla bir kez. Not eşleşmesi sıralamayı şişirmiyor: mesele
       * bulunabilirlik, üstünlük değil. İkisini ayrı saymak, bir kez
       * yazılıp bir kez de not düşülen konuyu haksız yere öne çıkarırdı.
       */
      const eslesenNotlar: KenarNotu[] = []
      for (const k of kelimeler) {
        const kayitta = metin.includes(k)
        const nottakiler = notlar.filter((n) => n.metin.toLocaleLowerCase('tr').includes(k))
        for (const n of nottakiler) if (!eslesenNotlar.includes(n)) eslesenNotlar.push(n)
        if (kayitta || nottakiler.length) puan += 2
      }
      /* Dönem sorusunda o ayın tamamı geçerli — yoksa hiç sonuç dönmez. */
      if (!puan && donem) puan = 1
      if (puan > 0) bulgular.push({ puan, kayit, gunAd: gun.ad, kenarlar: eslesenNotlar })
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
      `${bas(donem.ad)} ${kapsam} kez yazmışsın.` +
        (bulgular.length < kapsam ? ` Bu soruyla ilgili ${bulgular.length} kayıt buldum.` : ''),
    )
  else p.push(`Defterinde bununla ilgili ${bulgular.length} kayıt var.`)

  /*
   * Yalnızca kenar notu yüzünden bulunan kayıtlar ayrıca söyleniyor.
   * Yorum değil, kaynak beyanı: cevabın nereden geldiği görünmeli.
   */
  const yalnizNot = bulgular.filter(
    (b) =>
      b.kenarlar.length &&
      !kelimeler.some((k) => b.kayit.metin.toLocaleLowerCase('tr').includes(k)),
  ).length
  if (yalnizNot)
    p.push(
      yalnizNot === bulgular.length
        ? `${bulgular.length === 1 ? 'Bu kaydı' : 'Bunların hepsini'} kenar notundan buldum.`
        : `Bunların ${sayiEk(yalnizNot)} kenar notundan geldi.`,
    )

  if (enSik.length)
    p.push(
      `O kayıtlarda en sık geçenler: ${enSik
        .map(([id, n]) => `<b>${temaAdi.get(id) ?? id}</b> (${n})`)
        .join(', ')}.`,
    )
  if (gece > bulgular.length * 0.35) p.push(`Bunların ${sayiEk(gece)} gece yazılmış.`)

  const sirali = bulgular.map((b) => b.kayit.tarih).sort()
  const ilk = sirali[0]!
  const son = sirali[sirali.length - 1]!
  if (ilk !== son) p.push(`İlki ${tamTarih(ilk)}, sonuncusu ${tamTarih(son)}.`)

  return {
    bos: false,
    paragraflar: p,
    kullanilan,
    terim: kelimeler[0] ?? eslesenTemalar[0]?.ad ?? '',
  }
}
