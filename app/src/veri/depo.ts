import type { DefterBilgi, Ek, EkBilgi, Gun, Kapsul, Kayit, KenarNotu } from '../cekirdek/tipler.js'
import type { TemaTanim } from '../cekirdek/sorgu.js'
import { gunAdi, iso } from '../cekirdek/tr.js'
import { gunAdiEn } from '../cekirdek/en.js'
import type { Dil } from '../cekirdek/dil.js'
import type { SqlSurucu } from './db.js'

const kimlik = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

/**
 * Yazma damgası — **tekdüze artan**.
 *
 * Düz `Date.now()` aynı milisaniyede iki kez çağrıldığında aynı sayıyı
 * veriyordu; gömü bayatlığı gibi "sonra mı oldu" karşılaştırmaları o eşit
 * damgada sessizce yanlış cevap veriyordu. Saatin geri atması da aynı
 * kapıya çıkıyor. Bu sarmalayıcı her çağrıda bir öncekinden kesin olarak
 * büyük bir sayı döndürüyor.
 */
let sonDamga = 0
const simdi = (): number => (sonDamga = Math.max(Date.now(), sonDamga + 1))
const gunISO = (ms: number): string => iso(new Date(ms))

interface KayitSatir {
  id: string
  tarih: string
  saat: string
  metin: string
  duzenlendi: number
  soru: string | null
  temalar: string | null
}

const satirdanKayit = (r: KayitSatir): Kayit => ({
  id: r.id,
  tarih: r.tarih,
  saat: r.saat,
  metin: r.metin,
  duzenlendi: r.duzenlendi === 1,
  soru: r.soru,
  temalar: r.temalar ? r.temalar.split(',') : [],
})

const KAYIT_SECIM = `
  SELECT k.id, k.tarih, k.saat, k.metin, k.duzenlendi, k.soru,
         (SELECT group_concat(kt.tema_id) FROM kayit_tema kt WHERE kt.kayit_id = k.id) AS temalar
  FROM kayit k`

/**
 * Defterin veri kapısı. Çekirdek katman buraya bağımlı değil; bağımlılık
 * tek yönlü: ekran -> depo -> çekirdek.
 */
/** Uzaktan gelen bir satırın yerele uygulanması. */
export interface SenkronUygulama {
  varlik: string
  id: string
  /** Uzağın Lamport sırası. */
  sira: number
  /** null ise satır siliniyor. */
  alanlar: Record<string, unknown> | null
}

export class Depo {
  /** Okuma ve yazmanın hangi deftere ait olduğu. */
  private defterId = 'defter-1'

  /**
   * Gün adının yazılacağı dil.
   *
   * `Gun.ad` türetilmiş bir görüntü dizesi — veritabanında saklanmıyor,
   * her okumada tarihten hesaplanıyor. Bu yüzden dil değişince eski
   * kayıtlar da yeni dilde okunuyor; saklansaydı defter iki dilli
   * kalırdı (KARARLAR.md · K-035).
   */
  dil: Dil = 'tr'

  constructor(private readonly db: SqlSurucu) {}

  private gunAdi(tarih: string): string {
    return this.dil === 'en' ? gunAdiEn(tarih) : gunAdi(tarih)
  }

  defteriSec(id: string): void {
    this.defterId = id
  }

  get aktifDefterId(): string {
    return this.defterId
  }

  /** Birden çok yazmayı tek işlemde toplar. */
  islem<T>(f: () => Promise<T>): Promise<T> {
    return this.db.islem(f)
  }

  /* ── kayıt ─────────────────────────────────────────────── */

  async kayitEkle(girdi: {
    tarih: string
    saat: string
    metin: string
    temalar?: string[]
    /** O an ekranda duran soru; yoksa null. */
    soru?: string | null
  }): Promise<Kayit> {
    const id = kimlik()
    const t = simdi()
    const sonSira =
      (await this.db.tek<{ s: number | null }>(
        'SELECT max(sira) AS s FROM kayit WHERE defter_id = ? AND tarih = ?',
        [this.defterId, girdi.tarih],
      ))?.s ?? -1
    await this.db.islem(async () => {
      await this.db.calistir(
        `INSERT INTO kayit
           (id, defter_id, tarih, saat, metin, sira, olusturma, guncelleme, duzenlendi, soru)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [id, this.defterId, girdi.tarih, girdi.saat, girdi.metin, sonSira + 1, t, t,
         girdi.soru ?? null],
      )
      await this.temalariYaz(id, girdi.temalar ?? [])
    })
    return {
      id,
      tarih: girdi.tarih,
      saat: girdi.saat,
      metin: girdi.metin,
      temalar: girdi.temalar ?? [],
      duzenlendi: false,
      soru: girdi.soru ?? null,
    }
  }

  /**
   * Kaydın metnini değiştirir ve düzeltme izini bırakır.
   * Kullanıcı geçmişini sessizce yeniden yazamaz — PROJE.md §3.
   */
  async kayitDuzelt(id: string, metin: string): Promise<void> {
    await this.db.calistir(
      'UPDATE kayit SET metin = ?, guncelleme = ?, duzenlendi = 1 WHERE id = ?',
      [metin, simdi(), id],
    )
  }

  async kayitSil(id: string): Promise<void> {
    await this.db.calistir('DELETE FROM kayit WHERE id = ?', [id])
  }

  async kayitGetir(id: string): Promise<Kayit | null> {
    const r = await this.db.tek<KayitSatir>(`${KAYIT_SECIM} WHERE k.id = ?`, [id])
    return r ? satirdanKayit(r) : null
  }

  /** Tüm kayıtlar, günlere gruplanmış ve zaman sırasında. */
  async gunler(): Promise<Gun[]> {
    const satirlar = await this.db.hepsi<KayitSatir>(
      `${KAYIT_SECIM} WHERE k.defter_id = ? ORDER BY k.tarih, k.sira, k.saat`,
      [this.defterId],
    )
    const gunler: Gun[] = []
    let acik: Gun | null = null
    for (const r of satirlar) {
      if (!acik || acik.tarih !== r.tarih) {
        acik = { tarih: r.tarih, ad: this.gunAdi(r.tarih), kayitlar: [] }
        gunler.push(acik)
      }
      acik.kayitlar.push(satirdanKayit(r))
    }
    return gunler
  }

  async kayitSayisi(): Promise<number> {
    return (
      (
        await this.db.tek<{ n: number }>(
          'SELECT count(*) AS n FROM kayit WHERE defter_id = ?',
          [this.defterId],
        )
      )?.n ?? 0
    )
  }

  /* ── kitaplık ──────────────────────────────────────────── */

  /**
   * Yeni defter açar.
   *
   * Bu adda bir defter zaten varsa yenisi onun bir sonraki cildi olur
   * (K-016). Dönen değerde `cilt` kaçıncı cilt olduğunu söyler; arayüz
   * bunu kullanıcıya önceden bildirir.
   */
  async defterAc(ad: string, kapak: string, sayfaSiniri = 45): Promise<DefterBilgi> {
    const temiz = ad.trim() || 'Defter'
    const id = kimlik()
    const t = simdi()
    const sonCilt =
      (
        await this.db.tek<{ c: number | null }>(
          'SELECT max(cilt) AS c FROM defter WHERE ad = ?',
          [temiz],
        )
      )?.c ?? 0
    const cilt = sonCilt + 1
    const sonSira =
      (await this.db.tek<{ s: number | null }>('SELECT max(sira) AS s FROM defter WHERE raf = 0'))
        ?.s ?? -1
    const sinir = Math.max(5, Math.round(sayfaSiniri))
    await this.db.calistir(
      `INSERT INTO defter (id, ad, cilt, kapak, raf, sira, olusturma, kapandi, sayfa_siniri)
       VALUES (?, ?, ?, ?, 0, ?, ?, 0, ?)`,
      [id, temiz, cilt, kapak, sonSira + 1, t, sinir],
    )
    return {
      id,
      ad: temiz,
      cilt,
      kapak,
      raf: 0,
      sira: sonSira + 1,
      sayfaSiniri: sinir,
      kapandi: false,
      kapanma: null,
      kayitSayisi: 0,
    }
  }

  /** Bu adda kaçıncı cilt açılacağını önden söyler; 1 ise yeni bir seri. */
  async siradakiCilt(ad: string): Promise<number> {
    const temiz = ad.trim() || 'Defter'
    const son =
      (
        await this.db.tek<{ c: number | null }>(
          'SELECT max(cilt) AS c FROM defter WHERE ad = ?',
          [temiz],
        )
      )?.c ?? 0
    return son + 1
  }

  /** Raftaki bütün defterler, dizildikleri sırayla. */
  async defterler(): Promise<DefterBilgi[]> {
    const satirlar = await this.db.hepsi<{
      id: string
      ad: string
      cilt: number
      kapak: string
      raf: number
      sira: number
      sayfa_siniri: number
      kapandi: number
      kapanma: number | null
      kayit_sayisi: number
    }>(
      `SELECT d.id, d.ad, d.cilt, d.kapak, d.raf, d.sira, d.sayfa_siniri, d.kapandi, d.kapanma,
              (SELECT count(*) FROM kayit k WHERE k.defter_id = d.id) AS kayit_sayisi
       FROM defter d ORDER BY d.raf, d.sira, d.cilt`,
    )
    return satirlar.map((r) => ({
      id: r.id,
      ad: r.ad,
      cilt: r.cilt,
      kapak: r.kapak,
      raf: r.raf,
      sira: r.sira,
      sayfaSiniri: r.sayfa_siniri,
      kapandi: r.kapandi === 1,
      kapanma: r.kapanma,
      kayitSayisi: r.kayit_sayisi,
    }))
  }

  async defterGetir(id: string): Promise<DefterBilgi | null> {
    return (await this.defterler()).find((d) => d.id === id) ?? null
  }

  async defterAdiYaz(id: string, ad: string): Promise<void> {
    await this.db.calistir('UPDATE defter SET ad = ? WHERE id = ?', [ad.trim() || 'Defter', id])
  }

  async defterKapakYaz(id: string, kapak: string): Promise<void> {
    await this.db.calistir('UPDATE defter SET kapak = ? WHERE id = ?', [kapak, id])
  }

  /** Kullanıcının raftaki dizilişini kaydeder. */
  async rafiDiz(sirali: { id: string; raf: number; sira: number }[]): Promise<void> {
    await this.islem(async () => {
      for (const d of sirali)
        await this.db.calistir('UPDATE defter SET raf = ?, sira = ? WHERE id = ?', [
          d.raf,
          d.sira,
          d.id,
        ])
    })
  }

  /** Defteri uzatır: yeni sayfa sınırı mevcut sayfa sayısından küçük olamaz. */
  async sayfaSiniriYaz(id: string, sinir: number): Promise<void> {
    await this.db.calistir('UPDATE defter SET sayfa_siniri = ? WHERE id = ?', [
      Math.max(5, Math.round(sinir)),
      id,
    ])
  }

  /**
   * Silmeden önce gösterilecek döküm: ne kaybedileceği.
   *
   * Kullanıcıya "emin misin" diye sormak yetmez, NEYE emin olduğunu
   * göstermek gerekir. Deneme için açılmış boş bir defterle on yıllık bir
   * defter arasındaki farkı bu sayılar kuruyor (KARARLAR.md · K-025).
   */
  async defterOzeti(id: string): Promise<{
    kayit: number
    gun: number
    kenar: number
    ek: number
    ilk: string | null
    son: string | null
  }> {
    const r = await this.db.tek<{
      kayit: number
      gun: number
      ilk: string | null
      son: string | null
    }>(
      `SELECT count(*) AS kayit, count(DISTINCT tarih) AS gun,
              min(tarih) AS ilk, max(tarih) AS son
       FROM kayit WHERE defter_id = ?`,
      [id],
    )
    const kenar = await this.db.tek<{ n: number }>(
      `SELECT count(*) AS n FROM kenar e
       JOIN kayit k ON k.id = e.kayit_id WHERE k.defter_id = ?`,
      [id],
    )
    const ek = await this.db.tek<{ n: number }>(
      `SELECT count(*) AS n FROM ek e
       JOIN kayit k ON k.id = e.kayit_id WHERE k.defter_id = ?`,
      [id],
    )
    return {
      kayit: r?.kayit ?? 0,
      gun: r?.gun ?? 0,
      kenar: kenar?.n ?? 0,
      ek: ek?.n ?? 0,
      ilk: r?.ilk ?? null,
      son: r?.son ?? null,
    }
  }

  /**
   * Defteri ve içindekileri siler.
   *
   * `kayit.defter_id` ON DELETE CASCADE; kayıt da başlık, kenar notu, ek ve
   * tema bağlarını götürüyor. Tek DELETE yeterli — ama yabancı anahtarlar
   * açık olmak zorunda (`pragmalariKur`), yoksa yetim satırlar kalır.
   *
   * Bu yolu açan kapıyı ekran koruyor: dolu bir defter ancak adı yazılarak
   * silinebiliyor (K-025).
   */
  async defterSil(id: string): Promise<void> {
    await this.db.calistir('DELETE FROM defter WHERE id = ?', [id])
    if (this.defterId === id) {
      const kalan = await this.db.tek<{ id: string }>(
        'SELECT id FROM defter ORDER BY raf, sira, cilt LIMIT 1',
      )
      this.defterId = kalan?.id ?? ''
      if (kalan) await this.ayarYaz('aktifDefter', kalan.id)
    }
  }

  /** Defter kapanır — kapandıktan sonra yeni kayıt yazılamaz. */
  async defterKapat(id: string): Promise<void> {
    await this.db.calistir('UPDATE defter SET kapandi = 1, kapanma = ? WHERE id = ?', [simdi(), id])
  }

  /* ── tema ──────────────────────────────────────────────── */

  private async temalariYaz(kayitId: string, temalar: string[]): Promise<void> {
    await this.db.calistir('DELETE FROM kayit_tema WHERE kayit_id = ?', [kayitId])
    for (const id of temalar) {
      await this.db.calistir('INSERT OR IGNORE INTO tema (id, ad) VALUES (?, ?)', [id, id])
      await this.db.calistir(
        'INSERT OR IGNORE INTO kayit_tema (kayit_id, tema_id) VALUES (?, ?)',
        [kayitId, id],
      )
    }
  }

  async temaTanimla(id: string, ad: string, anahtar: string[] = []): Promise<void> {
    await this.db.calistir(
      `INSERT INTO tema (id, ad) VALUES (?, ?)
       ON CONFLICT (id) DO UPDATE SET ad = excluded.ad`,
      [id, ad],
    )
    if (anahtar.length) await this.ayarYaz(`tema.anahtar.${id}`, anahtar.join(','))
  }

  async temalar(): Promise<TemaTanim[]> {
    const satirlar = await this.db.hepsi<{ id: string; ad: string }>(
      'SELECT id, ad FROM tema ORDER BY ad',
    )
    const cikti: TemaTanim[] = []
    for (const t of satirlar)
      cikti.push({
        id: t.id,
        ad: t.ad,
        anahtar: ((await this.ayarOku(`tema.anahtar.${t.id}`)) ?? '').split(',').filter(Boolean),
      })
    return cikti
  }

  /* ── kenar notu ────────────────────────────────────────── */

  /**
   * Kayda bir kenar notu düşer.
   *
   * Tarihi ve zaman damgasını depo koyar: not "bugün" düşülmüştür, çağıran
   * bunu uyduramamalı. Tarih ISO saklanıyor, ekranda biçimleniyor — on
   * yıllık bir üründe biçimlenmiş dize saklamak sonradan düzeltilemez.
   */
  async kenarEkle(kayitId: string, metin: string, tarih = gunISO(simdi())): Promise<KenarNotu> {
    const id = kimlik()
    const t = simdi()
    await this.db.calistir(
      'INSERT INTO kenar (id, kayit_id, metin, tarih, olusturma) VALUES (?, ?, ?, ?, ?)',
      [id, kayitId, metin, tarih, t],
    )
    return { id, kayitId, metin, tarih, olusturma: t }
  }

  /** Not yalnızca yazıldığı gün silinebilir; kuralı ekran uygular. */
  async kenarSil(id: string): Promise<void> {
    await this.db.calistir('DELETE FROM kenar WHERE id = ?', [id])
  }

  /**
   * Kayıt kimliğine göre kenar notları, yazılma sırasında.
   *
   * Dizi döndürüyor: bir kayda yıllar içinde birden çok not düşülebilir.
   * Önceden tek not döndürüyordu ve ikinci not sessizce kayboluyordu —
   * `kenarEkle` satırı açıyor ama okuma yolu birini alıp ötekini
   * düşürüyordu (K-024).
   */
  async kenarlar(): Promise<Map<string, KenarNotu[]>> {
    const m = new Map<string, KenarNotu[]>()
    for (const r of await this.db.hepsi<{
      id: string
      kayit_id: string
      metin: string
      tarih: string
      olusturma: number
    }>('SELECT id, kayit_id, metin, tarih, olusturma FROM kenar ORDER BY olusturma, rowid')) {
      const not: KenarNotu = {
        id: r.id,
        kayitId: r.kayit_id,
        metin: r.metin,
        tarih: r.tarih,
        olusturma: r.olusturma,
      }
      const liste = m.get(r.kayit_id)
      if (liste) liste.push(not)
      else m.set(r.kayit_id, [not])
    }
    return m
  }

  /* ── ek · bilet, ekran görüntüsü, fotoğraf (K-023) ─────── */

  /**
   * Kayda bir ek iliştirir. Kayıt başına yalnızca bir tane: ikincisi
   * birincinin yerine geçer (şemada birincil anahtar).
   */
  async ekYaz(ek: Ek): Promise<void> {
    await this.db.calistir(
      `INSERT INTO ek (kayit_id, tur, veri, en, boy, bayt, eklenme)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (kayit_id) DO UPDATE SET
         tur = excluded.tur, veri = excluded.veri, en = excluded.en,
         boy = excluded.boy, bayt = excluded.bayt, eklenme = excluded.eklenme`,
      [ek.kayitId, ek.tur, ek.veri, ek.en, ek.boy, ek.bayt, simdi()],
    )
  }

  async ekSil(kayitId: string): Promise<void> {
    await this.db.calistir('DELETE FROM ek WHERE kayit_id = ?', [kayitId])
  }

  /**
   * Bütün eklerin ÜSTVERİSİ — gövde okunmuyor.
   *
   * `veri` sütunu bilerek seçilmiyor: sayfa akışının ihtiyacı yalnızca
   * en-boy oranı, ve on yıllık bir defterin bütün fotoğraflarını belleğe
   * çekmek o modeli çökertirdi.
   */
  async ekler(): Promise<Map<string, EkBilgi>> {
    const satirlar = await this.db.hepsi<{
      kayit_id: string
      tur: string
      en: number
      boy: number
      bayt: number
    }>(
      `SELECT e.kayit_id, e.tur, e.en, e.boy, e.bayt
       FROM ek e JOIN kayit k ON k.id = e.kayit_id
       WHERE k.defter_id = ?`,
      [this.defterId],
    )
    return new Map(
      satirlar.map((r) => [
        r.kayit_id,
        { kayitId: r.kayit_id, tur: r.tur, en: r.en, boy: r.boy, bayt: r.bayt },
      ]),
    )
  }

  /**
   * Ekler, gövdeleriyle birlikte. Yalnızca dışa aktarma için.
   *
   * `ekler()`'in aksine base64'ü de okur; o yüzden ekranda değil, yalnızca
   * kullanıcının açık eylemiyle çalışan yollarda kullanılır.
   */
  async ekleriTam(): Promise<Map<string, Ek>> {
    const satirlar = await this.db.hepsi<{
      kayit_id: string
      tur: string
      veri: string
      en: number
      boy: number
      bayt: number
    }>(
      `SELECT e.kayit_id, e.tur, e.veri, e.en, e.boy, e.bayt
       FROM ek e JOIN kayit k ON k.id = e.kayit_id
       WHERE k.defter_id = ?`,
      [this.defterId],
    )
    return new Map(
      satirlar.map((r) => [
        r.kayit_id,
        { kayitId: r.kayit_id, tur: r.tur, veri: r.veri, en: r.en, boy: r.boy, bayt: r.bayt },
      ]),
    )
  }

  /** Tek bir ekin gövdesi — yalnızca görünen sayfa için istenir. */
  async ekVeri(kayitId: string): Promise<Ek | null> {
    const r = await this.db.tek<{
      tur: string
      veri: string
      en: number
      boy: number
      bayt: number
    }>('SELECT tur, veri, en, boy, bayt FROM ek WHERE kayit_id = ?', [kayitId])
    return r ? { kayitId, tur: r.tur, veri: r.veri, en: r.en, boy: r.boy, bayt: r.bayt } : null
  }

  /* ── gömü vektörleri (K-029) ───────────────────────────── */

  /** Kaydın vektörünü yazar; varsa üstüne yazar. */
  /**
   * `guncelleme` burada "ne zaman gömüldü" değil, **hangi sürümden
   * gömüldü**: kaydın kendi damgası olduğu gibi kopyalanıyor.
   *
   * Önce `simdi()` yazılıyordu ve bayatlık `g.guncelleme < k.guncelleme`
   * ile ölçülüyordu. İkisi de milisaniye: aynı milisaniyede gömülüp
   * düzeltilen bir kayıt eşit damga taşıyor ve bayat sayılmıyordu —
   * kullanıcı kaydını düzeltiyor, arama eski metinden cevap veriyordu.
   * Damgayı kopyalayınca ölçüt saat yarışından çıkıp eşitlik
   * karşılaştırmasına dönüyor.
   */
  async gomuYaz(kayitId: string, model: string, vektor: string, surum: number): Promise<void> {
    await this.db.calistir(
      `INSERT INTO gomu (kayit_id, model, vektor, guncelleme) VALUES (?, ?, ?, ?)
       ON CONFLICT (kayit_id) DO UPDATE SET
         model = excluded.model, vektor = excluded.vektor,
         guncelleme = excluded.guncelleme`,
      [kayitId, model, vektor, surum],
    )
  }

  /**
   * Aktif defterin vektörleri — yalnızca verilen modele ait olanlar.
   *
   * Model süzgeci şart: başka bir modelle üretilmiş vektörü karşılaştırmaya
   * sokmak sessizce anlamsız sonuç verirdi.
   */
  async gomular(model: string): Promise<Map<string, string>> {
    const satirlar = await this.db.hepsi<{ kayit_id: string; vektor: string }>(
      `SELECT g.kayit_id, g.vektor FROM gomu g
       JOIN kayit k ON k.id = g.kayit_id
       WHERE k.defter_id = ? AND g.model = ?`,
      [this.defterId, model],
    )
    return new Map(satirlar.map((r) => [r.kayit_id, r.vektor]))
  }

  /**
   * Gömülmeyi bekleyen kayıtlar: hiç gömülmemiş ya da BAŞKA bir modelle
   * gömülmüş olanlar. Düzeltilen kayıtlar da buraya düşüyor —
   * `kayit.guncelleme` vektörün tarihinden yeniyse metin değişmiş demektir.
   */
  /** Gömülmemiş ya da bayatlamış kayıtlar — kaydın damgasıyla birlikte. */
  async gomusuzKayitlar(
    model: string,
    sinir = 32,
  ): Promise<{ id: string; metin: string; guncelleme: number }[]> {
    return this.db.hepsi<{ id: string; metin: string; guncelleme: number }>(
      `SELECT k.id, k.metin, k.guncelleme FROM kayit k
       LEFT JOIN gomu g ON g.kayit_id = k.id
       WHERE k.defter_id = ?
         AND (g.kayit_id IS NULL OR g.model <> ? OR g.guncelleme <> k.guncelleme)
       ORDER BY k.tarih DESC, k.sira DESC
       LIMIT ?`,
      [this.defterId, model, sinir],
    )
  }

  /** Kaç kayıt gömülmeyi bekliyor / toplam kaç kayıt var. */
  async gomuDurum(model: string): Promise<{ bekleyen: number; toplam: number }> {
    const r = await this.db.tek<{ bekleyen: number; toplam: number }>(
      `SELECT
         count(*) AS toplam,
         sum(CASE WHEN g.kayit_id IS NULL OR g.model <> ? OR g.guncelleme <> k.guncelleme
                  THEN 1 ELSE 0 END) AS bekleyen
       FROM kayit k LEFT JOIN gomu g ON g.kayit_id = k.id
       WHERE k.defter_id = ?`,
      [model, this.defterId],
    )
    return { bekleyen: r?.bekleyen ?? 0, toplam: r?.toplam ?? 0 }
  }

  /** Bütün vektörleri siler — özellik kapatılınca. */
  async gomulariSil(): Promise<void> {
    await this.db.calistir('DELETE FROM gomu')
  }

  /* ── sayfa başlığı (kayıt kimliğine bağlı · K-005) ─────── */

  async baslikYaz(kayitId: string, baslik: string): Promise<void> {
    const temiz = baslik.trim()
    if (!temiz) {
      await this.db.calistir('DELETE FROM sayfa_baslik WHERE kayit_id = ?', [kayitId])
      return
    }
    await this.db.calistir(
      `INSERT INTO sayfa_baslik (kayit_id, baslik) VALUES (?, ?)
       ON CONFLICT (kayit_id) DO UPDATE SET baslik = excluded.baslik`,
      [kayitId, temiz],
    )
  }

  async basliklar(): Promise<Map<string, string>> {
    const satirlar = await this.db.hepsi<{ kayit_id: string; baslik: string }>(
      'SELECT kayit_id, baslik FROM sayfa_baslik',
    )
    return new Map(satirlar.map((r) => [r.kayit_id, r.baslik] as const))
  }

  /* ── arama ─────────────────────────────────────────────── */

  /** FTS5 üstünde tam metin arama. Sonuçlar kayıt kimliği olarak döner. */
  async ara(terim: string, sinir = 50): Promise<Kayit[]> {
    const temiz = terim.trim()
    if (!temiz) return []
    /* Kullanıcı metnini FTS sözdiziminden ayır: her sözcük ayrı öbek. */
    const sorgu = temiz
      .split(/\s+/)
      .map((k) => `"${k.replace(/"/g, '""')}"`)
      .join(' ')
    const satirlar = await this.db.hepsi<KayitSatir>(
      `${KAYIT_SECIM}
       JOIN kayit_fts f ON f.rowid = k.rowid
       WHERE kayit_fts MATCH ? AND k.defter_id = ?
       ORDER BY k.tarih DESC, k.sira DESC
       LIMIT ?`,
      [sorgu, this.defterId, sinir],
    )
    return satirlar.map(satirdanKayit)
  }

  /* ── zaman kapsülü ─────────────────────────────────────── */

  async kapsulEkle(yazilma: string, acilma: string, metin: string): Promise<string> {
    const id = kimlik()
    await this.db.calistir(
      'INSERT INTO kapsul (id, yazilma, acilma, metin) VALUES (?, ?, ?, ?)',
      [id, new Date(yazilma + 'T12:00').getTime(), acilma, metin],
    )
    return id
  }

  /** Açılmış bir mektuba cevap yazılır; mektup ve cevabı yan yana durur. */
  async kapsuleCevapYaz(id: string, cevap: string, tarih: string): Promise<void> {
    await this.db.calistir(
      'UPDATE kapsul SET cevap = ?, cevap_tarihi = ? WHERE id = ?',
      [cevap, new Date(tarih + 'T12:00').getTime(), id],
    )
  }

  async kapsuller(): Promise<Kapsul[]> {
    const satirlar = await this.db.hepsi<{
      id: string
      yazilma: number
      acilma: string
      metin: string
      cevap: string | null
      cevap_tarihi: number | null
    }>('SELECT id, yazilma, acilma, metin, cevap, cevap_tarihi FROM kapsul ORDER BY yazilma DESC')
    return satirlar.map((r) => ({
      id: r.id,
      yazilma: gunISO(r.yazilma),
      acilma: r.acilma,
      metin: r.metin,
      cevap: r.cevap,
      cevapTarihi: r.cevap_tarihi === null ? null : gunISO(r.cevap_tarihi),
    }))
  }

  /* ── ayar ──────────────────────────────────────────────── */

  async ayarYaz(anahtar: string, deger: string): Promise<void> {
    await this.db.calistir(
      `INSERT INTO ayar (anahtar, deger) VALUES (?, ?)
       ON CONFLICT (anahtar) DO UPDATE SET deger = excluded.deger`,
      [anahtar, deger],
    )
  }

  async ayarOku(anahtar: string): Promise<string | null> {
    const r = await this.db.tek<{ deger: string }>(
      'SELECT deger FROM ayar WHERE anahtar = ?',
      [anahtar],
    )
    return r?.deger ?? null
  }

  /* ── senkron ───────────────────────────────────────────── */


  /**
   * Senkronun okuduğu tablolar ve her birinin kimlik sütunu.
   *
   * `kayit_tema` bileşik anahtarlı; izde kimlik iki parçanın birleşimi
   * (`kayit_id|tema_id`) ve buradaki ifade onu yeniden kuruyor.
   */
  private static readonly SENKRON_TABLO: Record<string, { kimlik: string; nerede: string }> = {
    defter: { kimlik: 'id', nerede: 'id = ?' },
    kayit: { kimlik: 'id', nerede: 'id = ?' },
    tema: { kimlik: 'id', nerede: 'id = ?' },
    kayit_tema: {
      kimlik: "kayit_id || '|' || tema_id",
      nerede: "kayit_id || '|' || tema_id = ?",
    },
    kenar: { kimlik: 'id', nerede: 'id = ?' },
    sayfa_baslik: { kimlik: 'kayit_id', nerede: 'kayit_id = ?' },
    ek: { kimlik: 'kayit_id', nerede: 'kayit_id = ?' },
    kapsul: { kimlik: 'id', nerede: 'id = ?' },
  }

  /** Gönderilmeyi bekleyen değişiklikler, eskiden yeniye. */
  async senkronBekleyen(
    sinir = 100,
  ): Promise<{ varlik: string; id: string; sira: number; silindi: boolean }[]> {
    const satirlar = await this.db.hepsi<{
      varlik: string
      id: string
      sira: number
      silindi: number
    }>(
      `SELECT varlik, id, sira, silindi FROM senkron_iz
       WHERE gonderildi = 0 ORDER BY sira LIMIT ?`,
      [sinir],
    )
    return satirlar.map((s) => ({ ...s, silindi: !!s.silindi }))
  }

  /** Kaç değişiklik sırada — ayar kağıdı bunu gösteriyor. */
  async senkronBekleyenSayisi(): Promise<number> {
    const r = await this.db.tek<{ n: number }>(
      'SELECT count(*) AS n FROM senkron_iz WHERE gonderildi = 0',
    )
    return r?.n ?? 0
  }

  /** Bir izin gösterdiği satırın tüm sütunları; satır silinmişse null. */
  async senkronSatir(varlik: string, id: string): Promise<Record<string, unknown> | null> {
    const t = Depo.SENKRON_TABLO[varlik]
    if (!t) return null
    return this.db.tek(`SELECT * FROM "${varlik}" WHERE ${t.nerede}`, [id])
  }

  async senkronGonderildi(isaretler: { varlik: string; id: string; sira: number }[]): Promise<void> {
    if (!isaretler.length) return
    await this.islem(async () => {
      for (const i of isaretler)
        /* `sira` koşulu bilerek: gönderim sürerken kayıt yeniden
           değiştiyse iz gönderilmiş sayılmamalı, yoksa o değişiklik
           sessizce kaybolur. */
        await this.db.calistir(
          'UPDATE senkron_iz SET gonderildi = 1 WHERE varlik = ? AND id = ? AND sira = ?',
          [i.varlik, i.id, i.sira],
        )
    })
  }

  /**
   * Uzaktan gelen satırı yerele yazar.
   *
   * Tetikleyiciler bu sırada SUSUYOR (`uygulaniyor = 1`): susmasaydı
   * çekilen her satır "gönderilecek" diye işaretlenir ve iki cihaz
   * birbirine sonsuza kadar aynı satırı yollardı (KARARLAR.md · K-036).
   */
  async senkronUygula(islemler: SenkronUygulama[]): Promise<void> {
    if (!islemler.length) return
    await this.islem(async () => {
      await this.db.calistir('UPDATE senkron_sayac SET uygulaniyor = 1')
      try {
        for (const i of islemler) {
          const t = Depo.SENKRON_TABLO[i.varlik]
          if (!t) continue
          if (i.alanlar) {
            const sutunlar = Object.keys(i.alanlar)
            if (!sutunlar.length) continue
            await this.db.calistir(
              `INSERT OR REPLACE INTO "${i.varlik}" (${sutunlar.map((c) => `"${c}"`).join(', ')})
               VALUES (${sutunlar.map(() => '?').join(', ')})`,
              sutunlar.map((c) => i.alanlar![c]),
            )
          } else {
            await this.db.calistir(`DELETE FROM "${i.varlik}" WHERE ${t.nerede}`, [i.id])
          }
          /*
           * İz elle yazılıyor (tetikleyiciler susuyor) ve `gonderildi = 1`
           * konuyor: bu satır zaten sunucudan geldi, geri gönderilmeyecek.
           * `sira` uzağın Lamport değeri — sonraki çakışma kararı bunu
           * kullanacak. `satir` de burada doluyor, mezar taşlarını
           * çözebilmek için.
           */
          await this.db.calistir(
            `INSERT INTO senkron_iz (varlik, id, sira, silindi, gonderildi)
             VALUES (?, ?, ?, ?, 1)
             ON CONFLICT (varlik, id) DO UPDATE SET
               sira = excluded.sira, silindi = excluded.silindi, gonderildi = 1`,
            [i.varlik, i.id, i.sira, i.alanlar ? 0 : 1],
          )
        }
      } finally {
        await this.db.calistir('UPDATE senkron_sayac SET uygulaniyor = 0')
      }
    })
  }

  /** Bir izin Lamport sırası — çakışma kararı bununla veriliyor. */
  async senkronIziOku(
    varlik: string,
    id: string,
  ): Promise<{ sira: number; silindi: boolean } | null> {
    const r = await this.db.tek<{ sira: number; silindi: number }>(
      'SELECT sira, silindi FROM senkron_iz WHERE varlik = ? AND id = ?',
      [varlik, id],
    )
    return r ? { sira: r.sira, silindi: !!r.silindi } : null
  }


  /** Lamport saati: yerel değer ile çekilenlerin en büyüğünün büyüğü. */
  async senkronSaatiIlerlet(gorulen: number): Promise<void> {
    await this.db.calistir(
      'UPDATE senkron_sayac SET deger = max(deger, ?) WHERE tek = 1',
      [gorulen],
    )
  }

  async senkronSaati(): Promise<number> {
    const r = await this.db.tek<{ deger: number }>('SELECT deger FROM senkron_sayac WHERE tek = 1')
    return r?.deger ?? 0
  }

  /** Senkron kapatılınca izler temizleniyor; defter olduğu gibi kalıyor. */
  async senkronIzleriSil(): Promise<void> {
    await this.db.calistir('DELETE FROM senkron_iz')
  }

  /** Senkron açılınca defterin tamamı gönderilsin diye izleri tazeler. */
  async senkronHepsiniIsaretle(): Promise<void> {
    await this.db.calistir('UPDATE senkron_iz SET gonderildi = 0')
  }
}
