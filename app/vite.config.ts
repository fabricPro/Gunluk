import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite'

/**
 * Geliştirme yönlendirmeleri, `app/vercel.json`taki ile AYNI olmak zorunda.
 *
 * Tarayıcıda senkron kendi kaynağımızdaki `/auth` ve `/rest`e konuşuyor
 * (bkz. `veri/senkronDepo.ts` · `sunucuAyari`). Vercel bunları Neon'a
 * taşıyor; `npm run dev` de taşımasa geliştirme ile üretim ayrışır ve
 * çerez davranışı ancak yayına çıkınca görülürdü (KARARLAR.md · K-037).
 *
 * Adresler `.env`ten okunuyor — iki yerde iki kopya durmasın.
 */
/**
 * Servis işçisini derleme çıktısıyla birlikte yazar.
 *
 * Önbelleğe alınacak dosyaların listesi TAHMİN EDİLMİYOR: özetli adlar
 * her derlemede değişiyor ve elle tutulan bir liste ilk kaçırdığı
 * dosyada uygulamayı çevrimdışı bozardı. Liste buradan, gerçek çıktıdan
 * çıkıyor.
 *
 * Sürüm de içerikten türüyor: aynı çıktı aynı sürümü verir (gereksiz
 * yeniden indirme yok), değişen çıktı yeni sürümü ve `activate` eski
 * önbelleği siler.
 *
 * Workbox alınmadı. Yapılan iş bir dosya listesi ve üç kural; bir
 * üretici eklemek "metnim nereye gidiyor" sorusunun cevabını okunmaz
 * hâle getirirdi (KARARLAR.md · K-004, K-036).
 */
const sIsciEklentisi = (): Plugin => ({
  name: 'defter-servis-iscisi',
  apply: 'build',
  generateBundle(_secenek, paket) {
    const varliklar = [
      /* Kabuk `/` adresinden veriliyor; `index.html` ayrıca gerekmiyor. */
      '/',
      ...Object.keys(paket)
        .filter((a) => a !== 'index.html' && a !== 'sw.js')
        .map((a) => '/' + a),
    ].sort()
    const surum = createHash('sha256').update(varliklar.join('\n')).digest('hex').slice(0, 12)
    const kaynak = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8')
      .replace('__DEFTER_SURUM__', `defter-${surum}`)
      .replace('__DEFTER_VARLIKLAR__', JSON.stringify(varliklar, null, 2))
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: kaynak })
  },
})

const vekil = (hedef: string, onek: string): ProxyOptions => ({
  target: hedef,
  changeOrigin: true,
  rewrite: (yol) => yol.slice(onek.length),
})

export default defineConfig(({ mode }) => {
  const ortam = loadEnv(mode, process.cwd(), 'VITE_')
  const yonlendir: Record<string, ProxyOptions> = {}
  if (ortam.VITE_DEFTER_AUTH) yonlendir['/auth'] = vekil(ortam.VITE_DEFTER_AUTH, '/auth')
  if (ortam.VITE_DEFTER_API) yonlendir['/rest'] = vekil(ortam.VITE_DEFTER_API, '/rest')

  return {
    plugins: [sIsciEklentisi()],
    build: { outDir: 'dist', target: 'es2022' },
    server: { proxy: yonlendir },
    preview: { proxy: yonlendir },
    optimizeDeps: {
      /*
       * sqlite-wasm, sqlite3.wasm dosyasını kendi modül adresine göre arıyor.
       * Vite ön paketlemesi JS'i node_modules/.vite/deps/ altına taşıyınca wasm
       * yanında gitmiyor ve dev sunucusunda 404 dönüyordu. Dışarıda bırakılınca
       * paket kendi klasöründen servis ediliyor ve yol tutuyor.
       */
      exclude: ['@sqlite.org/sqlite-wasm'],
    },
  }
})
