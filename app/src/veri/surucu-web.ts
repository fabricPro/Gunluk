import { yenidenGirilebilirIslem, type SqlSurucu } from './db.js'
import type { Istek, IstekTip, Yanit } from './sqlite-isci.js'

/**
 * Tarayıcı sürücüsü: resmî SQLite wasm derlemesi, bir worker içinde.
 *
 * Anahtar verilirse defter bellekte tutulup diske **mühürlü** yazılıyor
 * (KARARLAR.md · K-037). Anahtar yoksa eski yol: OPFS'te şifresiz
 * SQLite — bu artık yalnızca kilidi kurulmamış defterler için ve
 * `Durum.sifreli` false dönüyor.
 *
 * ── Ne zaman mühürleniyor ────────────────────────────────────
 *
 * Her yazmadan sonra hemen değil: yazı yazarken her tuşta defterin
 * tamamını şifrelemek anlamsız. Son yazmadan `BEKLEME` ms sonra bir kez.
 * Ana taraf ayrıca sekme arka plana geçerken `muhurleSimdi()` çağırıyor.
 *
 * Bedeli açık: son mühürden sonraki yazı, sekme ÇÖKERSE gider. Kapanma
 * ve arka plana geçme yakalanıyor, çökme yakalanamıyor.
 */
export interface WebSurucu extends SqlSurucu {
  /** OPFS açılabildi mi — false ise veri yenilemede gider. */
  kalici: boolean
  /**
   * Tarayıcı depoyu kalıcı saymayı kabul etti mi.
   *
   * Etmezse yer sıkıştığında defter TARAYICI TARAFINDAN SİLİNEBİLİR.
   * Sessiz geçilecek bir şey değil; ayar kağıdı söylüyor.
   */
  kaliciIzin: boolean
  /** Diske mühürlü mü yazılıyor. */
  muhurlu: boolean
  /** Açılışta şifresiz eski defter bulunup taşındı mı. */
  tasindi: boolean
  /** Bekleyen değişiklikleri hemen mühürler. */
  muhurleSimdi(): Promise<void>
  /** Son mühürleme hatası — sessizce yutulmuyor. */
  sonHata: string | null
}

/** Son yazmadan sonra bu kadar sessizlik geçince mühürleniyor. */
const BEKLEME = 1500

/** Diske yazmayı gerektiren istekler. */
const YAZAN: ReadonlySet<IstekTip> = new Set<IstekTip>(['calistir', 'betik'])

export async function webSurucusu(dosya = 'defter.db', anahtar?: string): Promise<WebSurucu> {
  const isci = new Worker(new URL('./sqlite-isci.ts', import.meta.url), { type: 'module' })
  const bekleyen = new Map<number, { coz: (v: unknown) => void; kir: (e: Error) => void }>()
  let sonId = 0
  let kalici = false
  let muhurlu = false
  let tasindi = false

  isci.onmessage = (e: MessageEvent<Yanit>) => {
    const b = bekleyen.get(e.data.id)
    if (!b) return
    bekleyen.delete(e.data.id)
    if (e.data.kalici !== undefined) kalici = e.data.kalici
    if (e.data.muhurlu !== undefined) muhurlu = e.data.muhurlu
    if (e.data.tasindi !== undefined) tasindi = e.data.tasindi
    if (e.data.hata) b.kir(new Error(e.data.hata))
    else b.coz(e.data.sonuc)
  }

  const cagir = (tip: IstekTip, sql = '', param: unknown[] = []): Promise<unknown> =>
    new Promise((coz, kir) => {
      const id = ++sonId
      bekleyen.set(id, { coz, kir })
      const istek: Istek = { id, tip, sql, param, dosya, anahtar }
      isci.postMessage(istek)
    })

  await cagir('ac')
  if (!kalici) console.warn('[defter] OPFS yok; veri yenilemede gidecek.')

  /*
   * Kalıcılık İSTENİYOR. Tarayıcılar "best-effort" depoyu yer sıkışınca
   * boşaltabiliyor; bir günlük uygulamasında bu, defterin sessizce yok
   * olması demek. İzin verilmezse kullanıcı bunu ayar kağıdında görüyor
   * (KARARLAR.md · K-037).
   */
  const kaliciIzin = await (async () => {
    try {
      if (await navigator.storage?.persisted?.()) return true
      return (await navigator.storage?.persist?.()) ?? false
    } catch {
      return false
    }
  })()
  if (!kaliciIzin) console.warn('[defter] Tarayici depoyu kalici saymadi.')

  /* ── borçlandırmalı mühürleme ──────────────────────────────── */

  let zamanlayici: ReturnType<typeof setTimeout> | null = null
  let suren: Promise<void> | null = null
  let borclu = false
  let sonHata: string | null = null

  const muhurle = async (): Promise<void> => {
    if (!muhurlu) return
    /* Süren bir mühürleme varsa sıraya geç: iki dışa aktarma çakışmasın. */
    if (suren) {
      borclu = true
      return suren
    }
    borclu = false
    suren = (async () => {
      try {
        await cagir('muhurle')
        sonHata = null
      } catch (e) {
        sonHata = e instanceof Error ? e.message : String(e)
        console.warn('[defter] muhur yazilamadi', e)
      }
    })()
    try {
      await suren
    } finally {
      suren = null
    }
    if (borclu) await muhurle()
  }

  const borclan = (): void => {
    if (!muhurlu) return
    if (zamanlayici) clearTimeout(zamanlayici)
    zamanlayici = setTimeout(() => {
      zamanlayici = null
      void muhurle()
    }, BEKLEME)
  }

  const yaz = async (tip: IstekTip, sql: string, param: unknown[] = []): Promise<void> => {
    await cagir(tip, sql, param)
    if (YAZAN.has(tip)) borclan()
  }

  const surucu: WebSurucu = {
    kalici,
    kaliciIzin,
    muhurlu,
    tasindi,
    /* Getter: kapanış değişkeni sonradan değişiyor, kopya bayatlardı. */
    get sonHata() {
      return sonHata
    },
    calistir: (sql, param = []) => yaz('calistir', sql, param),
    betik: (sql) => yaz('betik', sql),
    hepsi: async <T>(sql: string, param: unknown[] = []) =>
      (await cagir('hepsi', sql, param)) as T[],
    tek: async <T>(sql: string, param: unknown[] = []) =>
      (((await cagir('hepsi', sql, param)) as T[])[0] ?? null),
    islem: yenidenGirilebilirIslem(async (sql) => yaz('calistir', sql)),
    async muhurleSimdi() {
      if (zamanlayici) {
        clearTimeout(zamanlayici)
        zamanlayici = null
      }
      await muhurle()
    },
    kapat: async () => {
      if (zamanlayici) clearTimeout(zamanlayici)
      /* Worker kapanırken kendisi de mühürlüyor; yine de bekleyen bir
         mühürleme varsa önce o bitsin. */
      if (suren) await suren
      await cagir('kapat')
      isci.terminate()
    },
  }
  return surucu
}
