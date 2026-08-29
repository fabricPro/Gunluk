import type { Cilt, Gun, Kapsul, Kayit, KenarNotu } from '../cekirdek/tipler.js'
import type { TemaTanim } from '../cekirdek/sorgu.js'
import { gunAdi, iso } from '../cekirdek/tr.js'
import type { SqlSurucu } from './db.js'

const kimlik = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

const simdi = (): number => Date.now()
const gunISO = (ms: number): string => iso(new Date(ms))

interface KayitSatir {
  id: string
  tarih: string
  saat: string
  metin: string
  duzenlendi: number
  temalar: string | null
}

const satirdanKayit = (r: KayitSatir): Kayit => ({
  id: r.id,
  tarih: r.tarih,
  saat: r.saat,
  metin: r.metin,
  duzenlendi: r.duzenlendi === 1,
  temalar: r.temalar ? r.temalar.split(',') : [],
})

const KAYIT_SECIM = `
  SELECT k.id, k.tarih, k.saat, k.metin, k.duzenlendi,
         (SELECT group_concat(kt.tema_id) FROM kayit_tema kt WHERE kt.kayit_id = k.id) AS temalar
  FROM kayit k`

/**
 * Defterin veri kapısı. Çekirdek katman buraya bağımlı değil; bağımlılık
 * tek yönlü: ekran -> depo -> çekirdek.
 */
export class Depo {
  constructor(private readonly db: SqlSurucu) {}

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
  }): Promise<Kayit> {
    const id = kimlik()
    const t = simdi()
    const sonSira =
      (await this.db.tek<{ s: number | null }>(
        'SELECT max(sira) AS s FROM kayit WHERE tarih = ?',
        [girdi.tarih],
      ))?.s ?? -1
    await this.db.islem(async () => {
      await this.db.calistir(
        `INSERT INTO kayit (id, tarih, saat, metin, sira, olusturma, guncelleme, duzenlendi)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [id, girdi.tarih, girdi.saat, girdi.metin, sonSira + 1, t, t],
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
      `${KAYIT_SECIM} ORDER BY k.tarih, k.sira, k.saat`,
    )
    const gunler: Gun[] = []
    let acik: Gun | null = null
    for (const r of satirlar) {
      if (!acik || acik.tarih !== r.tarih) {
        acik = { tarih: r.tarih, ad: gunAdi(r.tarih), kayitlar: [] }
        gunler.push(acik)
      }
      acik.kayitlar.push(satirdanKayit(r))
    }
    return gunler
  }

  async kayitSayisi(): Promise<number> {
    return (await this.db.tek<{ n: number }>('SELECT count(*) AS n FROM kayit'))?.n ?? 0
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

  async kenarEkle(kayitId: string, metin: string, tarih: string): Promise<KenarNotu> {
    const id = kimlik()
    await this.db.calistir('INSERT INTO kenar (id, kayit_id, metin, tarih) VALUES (?, ?, ?, ?)', [
      id,
      kayitId,
      metin,
      tarih,
    ])
    return { id, kayitId, metin, tarih }
  }

  async kenarlar(): Promise<Map<string, KenarNotu>> {
    const m = new Map<string, KenarNotu>()
    for (const r of await this.db.hepsi<{
      id: string
      kayit_id: string
      metin: string
      tarih: string
    }>('SELECT id, kayit_id, metin, tarih FROM kenar'))
      m.set(r.kayit_id, { id: r.id, kayitId: r.kayit_id, metin: r.metin, tarih: r.tarih })
    return m
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

  /* ── cilt ──────────────────────────────────────────────── */

  async ciltAdiYaz(no: number, ad: string): Promise<void> {
    const temiz = ad.trim()
    await this.db.calistir(
      `INSERT INTO cilt (no, ad) VALUES (?, ?)
       ON CONFLICT (no) DO UPDATE SET ad = excluded.ad`,
      [no, temiz || null],
    )
  }

  async ciltAdlari(): Promise<Map<number, string>> {
    const satirlar = await this.db.hepsi<{ no: number; ad: string | null }>(
      'SELECT no, ad FROM cilt WHERE ad IS NOT NULL',
    )
    return new Map(satirlar.map((r) => [r.no, r.ad!] as const))
  }

  /** Cilt kapanma töreni Faz 1.4'te; şema ve kayıt aralığı hazır (K-006). */
  async ciltKapat(no: number, sonKayitId: string): Promise<void> {
    await this.db.calistir(
      `INSERT INTO cilt (no, kapandi, kapanma, son_kayit_id) VALUES (?, 1, ?, ?)
       ON CONFLICT (no) DO UPDATE SET kapandi = 1, kapanma = excluded.kapanma,
                                      son_kayit_id = excluded.son_kayit_id`,
      [no, simdi(), sonKayitId],
    )
  }

  async kapaliCiltler(): Promise<Pick<Cilt, 'no' | 'ad'>[]> {
    return this.db.hepsi<{ no: number; ad: string | null }>(
      'SELECT no, ad FROM cilt WHERE kapandi = 1 ORDER BY no',
    )
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
       WHERE kayit_fts MATCH ?
       ORDER BY k.tarih DESC, k.sira DESC
       LIMIT ?`,
      [sorgu, sinir],
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
}
