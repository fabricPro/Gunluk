/**
 * SAHTE NEON — kurtarmayı gerçek tarayıcıda koşturmak için.
 *
 * Kasanın asıl sınavı şu: tarayıcıdaki her şey silindikten sonra, elde
 * yalnızca parola varken defter geri geliyor mu. Bunu sınamak gerçek bir
 * sunucu istiyor; bu betik Neon'un uygulamanın DOKUNDUĞU kadarını
 * taklit ediyor (KARARLAR.md · K-038).
 *
 * Taklit ettiği yüzey dar ve bilerek öyle:
 *   POST /auth/sign-up/email     hesap aç
 *   POST /auth/sign-in/email     oturum aç (yoksa 401)
 *   GET  /auth/token             JWT ver
 *   GET/POST/DELETE /rest/defter_blob   senkron satırları
 *   GET/POST/DELETE /rest/defter_kasa   kasa
 *
 *   node arac/sahteNeon.mjs [port]
 *
 * Bu bir geliştirme aracı. Şifre yok, imza yok, kalıcılık yok — bellekte
 * duruyor ve süreç bitince gidiyor.
 */
import { createServer } from 'node:http'

const PORT = Number(process.argv[2] ?? 8787)

/** e-posta → { id, parola } */
const hesaplar = new Map()
/** oturum çerezi → hesap id */
const oturumlar = new Map()
/** hesap id → Map(satir → { satir, surum, iv, govde }) */
const bloblar = new Map()
/** hesap id → { iv, govde } */
const kasalar = new Map()

let dizi = 0
let sayac = 0
/** Kaç istek geldi — boştaki senkron gürültüsünü ÖLÇMEK için. */
let istekSayisi = 0
/** Yola göre GÖNDERİLEN bayt — "gövde inmiyor" iddiasını ölçmek için. */
const gidenBayt = new Map()

const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')

/** İmzası anlamsız ama BİÇİMİ gerçek: istemci yalnızca `exp` okuyor. */
const jwtYaz = (id) =>
  `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    sub: id,
    exp: Math.floor(Date.now() / 1000) + 900,
  })}.imzasiz`

const govdeOku = (istek) =>
  new Promise((coz) => {
    let g = ''
    istek.on('data', (p) => (g += p))
    istek.on('end', () => coz(g))
  })

const json = (cikti, kod, veri, baslik = {}) => {
  const govde = JSON.stringify(veri)
  cikti.writeHead(kod, { 'content-type': 'application/json', ...baslik })
  cikti.end(govde)
  return govde.length
}

/** Çerezden hesabı bulur; JWT varsa ondan. */
function hesapBul(istek) {
  const yetki = istek.headers.authorization
  if (yetki?.startsWith('Bearer ')) {
    try {
      const p = JSON.parse(
        Buffer.from(yetki.slice(7).split('.')[1], 'base64url').toString(),
      )
      if (p.exp * 1000 > Date.now()) return p.sub
    } catch {
      /* bozuk jeton — kimliksiz sayılıyor */
    }
  }
  const cerez = /defter_oturum=([^;]+)/.exec(istek.headers.cookie ?? '')
  return cerez ? (oturumlar.get(cerez[1]) ?? null) : null
}

function oturumVer(cikti, id) {
  const anahtar = `o${++sayac}`
  oturumlar.set(anahtar, id)
  /*
   * `Domain` YOK: çerez bu kaynağa ait olsun. Gerçek vekil de Neon'un
   * yazdığı `Domain`i düşürüyor (K-037).
   */
  json(cikti, 200, { ok: true }, {
    'set-cookie': `defter_oturum=${anahtar}; Path=/; HttpOnly; SameSite=Lax`,
  })
}

const sunucu = createServer(async (istek, cikti) => {
  const u = new URL(istek.url, 'http://x')
  const yol = u.pathname
  const bit = cikti.writeHead.bind(cikti)
  cikti.writeHead = (kod, ...k) => {
    console.log(`${istek.method} ${istek.url.slice(0, 90)} -> ${kod}`)
    return bit(kod, ...k)
  }
  const son = cikti.end.bind(cikti)
  cikti.end = (govde, ...k) => {
    if (govde && yol !== '/sayim')
      gidenBayt.set(yol, (gidenBayt.get(yol) ?? 0) + govde.length)
    return son(govde, ...k)
  }

  if (istek.method === 'OPTIONS') {
    cikti.writeHead(204).end()
    return
  }

  /*
   * Yalnızca denemeler için: kaç hesap açıldığını söyler.
   *
   * Senkronun KENDİ hesabını açıp açmadığı ancak buradan görülüyor;
   * uygulamanın içinden bakılamıyor (KARARLAR.md · K-043).
   */
  if (yol === '/sayim')
    return json(cikti, 200, {
      hesap: hesaplar.size,
      kasa: kasalar.size,
      istek: istekSayisi,
      bayt: Object.fromEntries(gidenBayt),
      /* Sunucuda GERÇEKTEN duran toplam — ayarların gösterdiği sayı
         bununla karşılaştırılıyor. */
      blobBayt: [...bloblar.values()].reduce(
        (t, m) => t + [...m.values()].reduce((x, z) => x + (z.govde ?? '').length, 0),
        0,
      ),
    })

  /* Sayım isteğinin kendisi sayılmıyor. */
  istekSayisi++

  /* ── kimlik ────────────────────────────────────────────── */

  if (yol === '/auth/sign-up/email') {
    const { email, password } = JSON.parse(await govdeOku(istek))
    if (hesaplar.has(email)) return json(cikti, 409, { message: 'var' })
    const id = `k${++sayac}`
    hesaplar.set(email, { id, parola: password })
    return oturumVer(cikti, id)
  }

  if (yol === '/auth/sign-in/email') {
    const { email, password } = JSON.parse(await govdeOku(istek))
    const h = hesaplar.get(email)
    /* Hesap yoksa 401: istemci "yarat" bayrağına göre karar veriyor. */
    if (!h || h.parola !== password) return json(cikti, 401, { message: 'olmadı' })
    return oturumVer(cikti, h.id)
  }

  if (yol === '/auth/token') {
    const id = hesapBul(istek)
    if (!id) return json(cikti, 401, { message: 'yetkisiz' })
    return json(cikti, 200, { token: jwtYaz(id) })
  }

  /* ── veri ──────────────────────────────────────────────── */

  const id = hesapBul(istek)
  if (!id) return json(cikti, 401, { message: 'yetkisiz' })

  if (yol === '/rest/defter_kasa') {
    if (istek.method === 'GET') {
      const k = kasalar.get(id)
      return json(cikti, 200, k ? [k] : [])
    }
    if (istek.method === 'POST') {
      const [satir] = JSON.parse(await govdeOku(istek))
      kasalar.set(id, { iv: satir.iv, govde: satir.govde })
      return json(cikti, 201, {})
    }
    kasalar.delete(id)
    return json(cikti, 204, {})
  }

  /* Sunucu tarafı sayım — gerçek şemadaki `defter_kullanim()` RPC'si. */
  if (yol === '/rest/rpc/defter_kullanim') {
    const kendi = bloblar.get(id) ?? new Map()
    let bayt = 0
    for (const z of kendi.values()) bayt += (z.govde ?? '').length
    return json(cikti, 200, [{ satir: kendi.size, bayt }])
  }

  if (yol === '/rest/defter_blob') {
    const kendi = bloblar.get(id) ?? new Map()
    bloblar.set(id, kendi)

    if (istek.method === 'GET') {
      const gt = /surum=gt\.(\d+)/.exec(u.search)
      const sinir = Number(/limit=(\d+)/.exec(u.search)?.[1] ?? 1e9)
      const esik = gt ? Number(gt[1]) : -1
      const cikan = [...kendi.values()]
        .filter((s) => s.surum > esik)
        .sort((a, b) => a.surum - b.surum)
        .slice(0, sinir)
      return json(cikti, 200, cikan)
    }
    if (istek.method === 'POST') {
      for (const z of JSON.parse(await govdeOku(istek)))
        kendi.set(z.satir, { satir: z.satir, iv: z.iv, govde: z.govde, surum: ++dizi })
      return json(cikti, 201, {})
    }
    kendi.clear()
    return json(cikti, 204, {})
  }

  json(cikti, 404, { message: 'yok' })
})

sunucu.listen(PORT, () => console.log(`sahte neon: http://localhost:${PORT}`))
