import { defineConfig } from 'vite'

export default defineConfig({
  build: { outDir: 'dist', target: 'es2022' },
  optimizeDeps: {
    /*
     * sqlite-wasm, sqlite3.wasm dosyasını kendi modül adresine göre arıyor.
     * Vite ön paketlemesi JS'i node_modules/.vite/deps/ altına taşıyınca wasm
     * yanında gitmiyor ve dev sunucusunda 404 dönüyordu. Dışarıda bırakılınca
     * paket kendi klasöründen servis ediliyor ve yol tutuyor.
     */
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
})
