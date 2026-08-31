/**
 * SQLite worker'ı — yalnızca tarayıcı derlemesinde.
 *
 * OPFS'in eşzamanlı dosya erişimi (createSyncAccessHandle) ana iş
 * parçacığında yok, yalnızca worker'da var. Bu yüzden veritabanı burada
 * açılıyor ve ana taraf mesajla konuşuyor. Cihazda bu dosya hiç
 * çalışmaz — orada SQLCipher devrede (KARARLAR.md · K-002).
 *
 * ── İki mod ──────────────────────────────────────────────────
 *
 * **Mühürlü** (anahtar verilirse): defter bellekte açılıyor, diske
 * yalnızca AES-GCM ile mühürlenmiş baytlar yazılıyor. Tarayıcıda
 * SQLCipher yok; cihazdaki şifrelemenin karşılığı bu (K-037).
 *
 * **Düz** (anahtar verilmezse): eski yol, OPFS'te şifresiz SQLite.
 * Yalnızca mühürlü moda geçmemiş defterleri okuyup taşımak için duruyor.
 *
 * ── Neden iki yuva ───────────────────────────────────────────
 *
 * Mühür tek dosyaya yazılsaydı, yazma yarıda kalan bir sekme defteri
 * BÜTÜNÜYLE götürürdü — dosya hem eski hâlini kaybetmiş hem yenisini
 * tamamlamamış olurdu. İki yuva dönüşümlü kullanılıyor: yazma her zaman
 * ESKİ yuvaya gidiyor, okuma yeniden eskiye doğru deneniyor. Yarım
 * kalan yazma yalnızca bir yuvayı bozuyor, diğeri sağlam duruyor.
 */
import sqlite3InitModule, { type Database, type Sqlite3Static } from '@sqlite.org/sqlite-wasm'
import { aesAnahtar, onaltilikOku } from '../cekirdek/gizle.js'
import { muhruAc, muhurle } from '../cekirdek/muhur.js'

export type IstekTip = 'ac' | 'calistir' | 'betik' | 'hepsi' | 'kapat' | 'muhurle'

export interface Istek {
  id: number
  tip: IstekTip
  sql?: string
  param?: unknown[]
  dosya?: string
  /** Onaltılık ana anahtar. Verilirse mühürlü mod. */
  anahtar?: string
}

export interface Yanit {
  id: number
  sonuc?: unknown
  hata?: string
  /** Veri yenilemeden sonra duruyor mu. */
  kalici?: boolean
  /** Diske mühürlü mü yazılıyor. */
  muhurlu?: boolean
  /** Açılışta şifresiz eski defter bulunup taşındı mı. */
  tasindi?: boolean
}

/** OPFS kökündeki iki mühür yuvası. */
const YUVALAR = ['defter.muhur.1', 'defter.muhur.2'] as const

/**
 * `createSyncAccessHandle` yalnızca worker'da var; TypeScript'in DOM
 * tanımlarında yok. `any` yerine dar bir bildirim.
 */
interface EszamanliErisim {
  truncate(n: number): void
  write(veri: Uint8Array, secenek?: { at?: number }): number
  flush(): void
  close(): void
}
type EszamanliTutamac = FileSystemFileHandle & {
  createSyncAccessHandle(): Promise<EszamanliErisim>
}

let sqlite3: Sqlite3Static | null = null
let db: Database | null = null
let anahtar: CryptoKey | null = null
let kalici = false
let muhurlu = false
let tasindi = false
/** Sıradaki yazmanın gideceği yuva — açılışta en eskisi seçiliyor. */
let siradakiYuva = 0

/* ── OPFS yuvaları ─────────────────────────────────────────── */

async function yuvaOku(ad: string): Promise<{ bayt: Uint8Array; an: number } | null> {
  try {
    const kok = await navigator.storage.getDirectory()
    const dosya = await (await kok.getFileHandle(ad)).getFile()
    if (!dosya.size) return null
    return { bayt: new Uint8Array(await dosya.arrayBuffer()), an: dosya.lastModified }
  } catch {
    return null
  }
}

async function yuvaYaz(ad: string, bayt: Uint8Array): Promise<void> {
  const kok = await navigator.storage.getDirectory()
  const tutamac = (await kok.getFileHandle(ad, { create: true })) as EszamanliTutamac
  const erisim = await tutamac.createSyncAccessHandle()
  try {
    erisim.truncate(0)
    erisim.write(bayt, { at: 0 })
    erisim.flush()
  } finally {
    erisim.close()
  }
}

/**
 * En yeni AÇILABİLEN yuvayı okur.
 *
 * Yarım kalan bir yazma en yeni yuvayı bozuk ama TAZE bırakır; o yüzden
 * "en yenisini al" yetmiyor, "en yeni açılanı al" gerekiyor.
 */
async function muhuruOku(): Promise<Uint8Array | null> {
  const bulunan = (await Promise.all(YUVALAR.map(yuvaOku)))
    .map((y, i) => (y ? { ...y, i } : null))
    .filter((y): y is { bayt: Uint8Array; an: number; i: number } => y !== null)
    .sort((a, b) => b.an - a.an)

  /* Yazma en eski yuvaya gitsin: en yenisi sağlam kalsın. */
  siradakiYuva = bulunan.length ? (bulunan[0]!.i + 1) % YUVALAR.length : 0

  for (const y of bulunan) {
    const acik = await muhruAc(y.bayt, anahtar!)
    if (acik) return acik
  }
  return bulunan.length ? null : new Uint8Array(0)
}

/* ── veritabanı baytları ───────────────────────────────────── */

const disaAktar = (): Uint8Array => sqlite3!.capi.sqlite3_js_db_export(db!.pointer!)

function iceAktar(bayt: Uint8Array): void {
  const yer = sqlite3!.wasm.allocFromTypedArray(bayt)
  const kod = sqlite3!.capi.sqlite3_deserialize(
    db!.pointer!,
    'main',
    yer,
    bayt.byteLength,
    bayt.byteLength,
    sqlite3!.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3!.capi.SQLITE_DESERIALIZE_RESIZEABLE,
  )
  /* Sessiz geçilmiyor: başarısız yükleme BOŞ bir defter demek olurdu ve
     kullanıcı üstüne yazardı. */
  if (kod) throw new Error('defter-yuklenmedi-' + String(kod))
}

/**
 * Şifresiz eski defteri arar ve baytlarını verir.
 *
 * Mühürlü moda geçmeden önce OPFS'te düz bir SQLite dosyası vardı.
 * Kullanıcının yazdığı sessizce silinmesin: varsa okunup mühürlü deftere
 * taşınıyor, sonra düz kopya SİLİNİYOR — taşındıktan sonra orada
 * durması, şifrelemenin bütün anlamını bitirirdi.
 */
async function eskiDuzDefter(dosya: string): Promise<Uint8Array | null> {
  try {
    const havuz = await sqlite3!.installOpfsSAHPoolVfs({ name: 'defter' })
    if (!havuz.getFileNames().includes('/' + dosya)) {
      await havuz.removeVfs()
      return null
    }
    const eski = new havuz.OpfsSAHPoolDb('/' + dosya)
    const bayt = sqlite3!.capi.sqlite3_js_db_export(eski.pointer!)
    eski.close()
    havuz.unlink('/' + dosya)
    await havuz.removeVfs()
    /* Boş bir defterde taşınacak bir şey yok. */
    return bayt.length > 0 ? bayt : null
  } catch {
    return null
  }
}

/* ── açılış ────────────────────────────────────────────────── */

async function acDuz(dosya: string): Promise<void> {
  try {
    const havuz = await sqlite3!.installOpfsSAHPoolVfs({ name: 'defter' })
    db = new havuz.OpfsSAHPoolDb('/' + dosya)
    kalici = true
  } catch (e) {
    console.warn('[defter] OPFS açılamadı — veritabanı yalnızca bellekte.', e)
    db = new sqlite3!.oo1.DB(':memory:', 'c')
    kalici = false
  }
}

async function acMuhurlu(dosya: string, anahtarHex: string): Promise<void> {
  anahtar = await aesAnahtar(onaltilikOku(anahtarHex))
  db = new sqlite3!.oo1.DB(':memory:', 'c')
  muhurlu = true
  kalici = true

  const acik = await muhuruOku()
  /*
   * `null` = yuva VAR ama hiçbiri açılmadı. Sessizce boş defter açmak
   * en kötü davranış olurdu: kullanıcı defterini kaybettiğini bile
   * anlamadan üstüne yazardı. Açılış burada durur.
   */
  if (acik === null) throw new Error('muhur-acilmadi')

  if (acik.length) {
    iceAktar(acik)
    return
  }

  const eski = await eskiDuzDefter(dosya)
  if (eski) {
    iceAktar(eski)
    tasindi = true
    await muhuruYaz()
  }
}

async function muhuruYaz(): Promise<void> {
  await yuvaYaz(YUVALAR[siradakiYuva]!, await muhurle(disaAktar(), anahtar!))
  siradakiYuva = (siradakiYuva + 1) % YUVALAR.length
}

async function ac(dosya: string, anahtarHex?: string): Promise<void> {
  sqlite3 = await sqlite3InitModule()
  if (anahtarHex) await acMuhurlu(dosya, anahtarHex)
  else await acDuz(dosya)
}

/* ── sorgu ─────────────────────────────────────────────────── */

function satirlar(sql: string, param: unknown[]): Record<string, unknown>[] {
  const cikti: Record<string, unknown>[] = []
  db!.exec({
    sql,
    ...(param.length ? { bind: param as never } : {}),
    rowMode: 'object',
    callback: (r: unknown) => void cikti.push(r as Record<string, unknown>),
  })
  return cikti
}

self.onmessage = async (e: MessageEvent<Istek>) => {
  const { id, tip, sql = '', param = [], dosya = 'defter.db', anahtar: a } = e.data
  try {
    let sonuc: unknown
    if (tip === 'ac') await ac(dosya, a)
    else if (tip === 'muhurle') {
      if (muhurlu) await muhuruYaz()
    } else if (tip === 'kapat') {
      /* Kapatma bir sorgu değil: boş SQL'i exec'e vermeyelim. */
      if (muhurlu && db) await muhuruYaz()
      db?.close()
      db = null
    } else if (tip === 'betik') db!.exec(sql)
    else sonuc = satirlar(sql, param)
    const yanit: Yanit = { id, sonuc, kalici, muhurlu, tasindi }
    self.postMessage(yanit)
  } catch (hata) {
    const yanit: Yanit = { id, hata: hata instanceof Error ? hata.message : String(hata) }
    self.postMessage(yanit)
  }
}
