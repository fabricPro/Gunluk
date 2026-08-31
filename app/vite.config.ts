import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

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
