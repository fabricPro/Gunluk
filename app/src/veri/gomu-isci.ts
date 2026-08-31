/**
 * Gömü worker'ı — model burada çalışır, ana iş parçacığında değil.
 *
 * 12 katmanlı bir dönüştürücü ana iş parçacığında çalışırsa yazarken
 * klavye takılır. `veri/sqlite-isci.ts` ile aynı kalıp.
 *
 * İlke 2.3: METİN CİHAZDAN ÇIKMAZ. Buradaki ağ çağrıları model ve çalışma
 * zamanını GETİRİR, metni GÖTÜRMEZ (KARARLAR.md · K-029).
 *
 * transformers.js pakete GÖMÜLMÜYOR, çalışma anında yükleniyor. Gömülü
 * hâlde `dist` 1,9 MB'dan 25 MB'a çıkıyordu ve o yük özelliği hiç
 * açmayacak kullanıcının uygulama indirmesine de biniyordu. Böylece taban
 * uygulamada gömüye ait yalnızca bu birkaç kilobayt duruyor.
 */
import { BOYUT, MODEL } from '../cekirdek/gomuModel.js'

/** Sürümler sabitlenmiş: wasm ile JS'in uyuşması şart. */
const TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm'
const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/'

export interface GomuIstek {
  id: number
  tip: 'kur' | 'goc'
  metinler?: string[]
}
export interface GomuYanit {
  id: number
  hazir?: boolean
  vektorler?: Float32Array[]
  hata?: string
  ilerleme?: { asama: string; oran: number }
}

/* Kütüphanenin kullandığımız kadarı. Tam tipler için 380 MB'lık bir
   geliştirme bağımlılığı taşımanın anlamı yok. */
interface Ilerlemesi { status?: string; progress?: number }
interface Boru {
  (metinler: string[], secenek: { pooling: string; normalize: boolean }): Promise<{ data: Float32Array }>
}
interface Kutuphane {
  env: {
    allowLocalModels: boolean
    backends: { onnx: { wasm: { numThreads: number; wasmPaths: string } } }
  }
  pipeline: (
    is: string,
    model: string,
    secenek: { dtype: string; progress_callback: (d: Ilerlemesi) => void },
  ) => Promise<Boru>
}

let boru: Boru | null = null

async function kur(bildir: (asama: string, oran: number) => void): Promise<void> {
  if (boru) return
  const kut = (await import(/* @vite-ignore */ TRANSFORMERS)) as unknown as Kutuphane
  /*
   * Çok iş parçacıklı wasm COOP/COEP başlıkları istiyor; GitHub Pages
   * bunları veremiyor, Capacitor'ın yerel sunucusu da vermiyor. Tek iş
   * parçacığı yavaş ama her yerde çalışıyor.
   */
  kut.env.backends.onnx.wasm.numThreads = 1
  kut.env.backends.onnx.wasm.wasmPaths = ORT_WASM
  kut.env.allowLocalModels = false
  boru = await kut.pipeline('feature-extraction', MODEL, {
    dtype: 'q8',
    progress_callback: (d) => {
      if (d.status === 'progress') bildir('indiriliyor', (d.progress ?? 0) / 100)
      else if (d.status) bildir(d.status, 0)
    },
  })
}

self.onmessage = async (e: MessageEvent<GomuIstek>) => {
  const { id, tip, metinler = [] } = e.data
  const bildir = (asama: string, oran: number) =>
    self.postMessage({ id, ilerleme: { asama, oran } } satisfies GomuYanit)
  try {
    await kur(bildir)
    if (tip === 'kur') {
      self.postMessage({ id, hazir: true } satisfies GomuYanit)
      return
    }
    /* Önekleri çağıran koyuyor (cekirdek/gomuModel.ts). */
    const cikti = await boru!(metinler, { pooling: 'mean', normalize: true })
    const vektorler: Float32Array[] = []
    for (let i = 0; i < metinler.length; i++)
      vektorler.push(cikti.data.slice(i * BOYUT, (i + 1) * BOYUT))
    self.postMessage({ id, vektorler } satisfies GomuYanit)
  } catch (hata) {
    const ham = hata instanceof Error ? hata.message : String(hata)
    /* Ağ hatasını insanın anlayacağı bir cümleye çevir; ham mesaj
       ("Failed to fetch dynamically imported module: https://…") kimseye
       bir şey söylemiyor. */
    const agMi = /fetch|network|load|import|Failed/i.test(ham)
    self.postMessage({
      id,
      hata: agMi ? 'Model indirilemedi — ağ bağlantını kontrol et.' : ham,
    } satisfies GomuYanit)
  }
}
