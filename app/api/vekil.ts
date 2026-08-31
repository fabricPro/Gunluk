import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * NEON VEKİLİ — tarayıcı sürümünün senkron yolu.
 *
 * ── Neden var ────────────────────────────────────────────────
 *
 * Sayfa Vercel'de, Neon başka bir kaynakta. Tarayıcıdan doğrudan
 * konuşulsaydı oturum çerezi ÇAPRAZ SİTE olurdu: Safari'nin izleme
 * koruması onu düşürüyor, Chrome üçüncü taraf çerezlerini kapatıyor.
 * Senkron web'de çalışmazdı.
 *
 * Önce düz `vercel.json` yönlendirmesi denendi ve OLMADI: Vercel dış
 * hedefe giderken `Host` başlığını olduğu gibi taşıyor, Neon da projeyi
 * Host'tan bulduğu için `INVALID_HOSTNAME` dönüyor. Doğru `Host`u ancak
 * isteği gerçekten yeniden kuran bir fonksiyon atabiliyor.
 *
 * ── Neden yol sorgu dizesinde ────────────────────────────────
 *
 * `api/vekil/[...yol].ts` denendi. Canlıda yakalayıcı yol TEK segment
 * gibi davrandı: `/api/vekil/auth` fonksiyona düştü ama
 * `/api/vekil/auth/token` Vercel'in kendi 404'ünü aldı. Fonksiyon bu
 * yüzden sabit yolda; hedef ile yol yönlendirmeyle sorgu dizesinde
 * geliyor.
 *
 * ── Neden Node imzası ────────────────────────────────────────
 *
 * Web imzası (`Request` → `Response`) da denendi; `runtime: 'edge'`
 * onurlandırılmadı ve fonksiyona `IncomingMessage` geldi:
 * `istek.headers.get is not a function`. Burada yazılan şey tahmin
 * değil, çalışma kaydında GÖRÜLEN imza (KARARLAR.md · K-037).
 *
 * ── Neon'a hangi sorgu alanları gidiyor ──────────────────────
 *
 * Yalnızca istemcinin gönderdikleri. Vercel sorgu dizesine kendi
 * alanlarını da ekliyor: yönlendirmedeki adlandırılmış parçanın yankısı
 * ve `_vercel_` önekli alanlar. PostgREST tanımadığı alanı sütun süzgeci
 * sayıp 400 döndüğü için bunlar ELENİYOR. Yönlendirmedeki parçaya
 * bilerek `vekilYol` dendi: yankısı da aynı adı taşısın ve tek kuralla
 * elensin.
 *
 * ── Ne yapıyor, ne yapmıyor ──────────────────────────────────
 *
 * GEÇEN: türetilmiş parola, oturum çerezi, JWT, şifreli zarflar.
 * GEÇMEYEN: şifreleme anahtarı ve düz metin. Şifreleme cihazda,
 * `cekirdek/senkronBicim.ts`te bitiyor; buradan yalnızca AES-GCM
 * gövdeler geçiyor ve bu dosya onları açamaz — anahtar hiçbir zaman
 * sunucuya gelmiyor (KARARLAR.md · K-036, K-037).
 *
 * KAYIT TUTMUYOR. Ne gövde, ne başlık, ne adres. Tek satır `console`
 * çağrısı yok ve olmamalı: bu dosyanın tamamı okunabilir olsun diye
 * kısa tutuldu.
 *
 * ── Çerez ────────────────────────────────────────────────────
 *
 * Dönen `Set-Cookie`ten `Domain` özniteliği DÜŞÜRÜLÜYOR. Neon onu kendi
 * alanına göre yazsaydı tarayıcı çerezi reddederdi; düşürülünce çerez bu
 * kaynağa ait (host-only) oluyor ve birinci taraf sayılıyor. Ölçüp
 * ummak yerine yapı gereği doğru.
 *
 * ── Adresler ─────────────────────────────────────────────────
 *
 * `app/.env` ile aynı olmak zorunda; `test/vekil.test.ts` iki kopyanın
 * kaymasını engelliyor.
 */

const TABAN: Record<string, string> = {
  auth: 'https://ep-tiny-glitter-b1158ps1.neonauth.c-5.eu-central-1.aws.neon.tech/neondb/auth',
  rest: 'https://ep-tiny-glitter-b1158ps1.apirest.c-5.eu-central-1.aws.neon.tech/neondb/rest/v1',
}

/** Yönlendirmenin eklediği alanlar — Neon'a taşınmıyor. */
const HEDEF = 'vekilHedef'
const YOL = 'vekilYol'

/** Neon'a taşınan istek başlıkları — fazlası taşınmıyor. */
const GIDEN = ['content-type', 'cookie', 'authorization', 'accept', 'prefer', 'origin']

/** Tarayıcıya dönen yanıt başlıkları — fazlası dönmüyor. */
const DONEN = ['content-type', 'content-range']

/** Vercel'in kendi eklediği alanlar Neon'a taşınmıyor. */
const bize = (ad: string): boolean => ad === HEDEF || ad === YOL || ad.startsWith('_vercel_')

/** `Domain=...` düşürülüyor; çerez bu kaynağa ait olsun. */
const alansiz = (cerez: string): string =>
  cerez
    .split(';')
    .filter((p) => p.trim().slice(0, 7).toLowerCase() !== 'domain=')
    .join(';')

/**
 * Gövdeyi olduğu gibi alır.
 *
 * Çalışma ortamı JSON gövdeleri kendi ayrıştırıp `body` alanına koyabiliyor;
 * o durumda akış zaten tüketilmiş oluyor ve okumak boş dönerdi.
 */
async function govdeAl(istek: IncomingMessage): Promise<Uint8Array> {
  const onceden = (istek as { body?: unknown }).body
  if (onceden !== undefined && onceden !== null)
    return new TextEncoder().encode(
      typeof onceden === 'string' ? onceden : JSON.stringify(onceden),
    )
  const parcalar: Uint8Array[] = []
  for await (const p of istek) parcalar.push(p as Uint8Array)
  const hepsi = new Uint8Array(parcalar.reduce((t, p) => t + p.length, 0))
  let yer = 0
  for (const p of parcalar) {
    hepsi.set(p, yer)
    yer += p.length
  }
  return hepsi
}

export default async function vekil(
  istek: IncomingMessage,
  cikti: ServerResponse,
): Promise<void> {
  /* `istek.url` göreli; taban yalnızca ayrıştırmak için, hiçbir yere
     gitmiyor. */
  const gelen = new URL(istek.url ?? '/', 'http://vekil.gecersiz')
  const taban = TABAN[gelen.searchParams.get(HEDEF) ?? '']
  if (!taban) {
    cikti.writeHead(404).end('yok')
    return
  }

  const hedef = new URL(taban + '/' + (gelen.searchParams.get(YOL) ?? ''))
  for (const [ad, deger] of gelen.searchParams)
    if (!bize(ad)) hedef.searchParams.append(ad, deger)

  const baslik = new Headers()
  for (const ad of GIDEN) {
    const d = istek.headers[ad]
    if (typeof d === 'string') baslik.set(ad, d)
  }

  const yontem = istek.method ?? 'GET'
  const govdesiz = yontem === 'GET' || yontem === 'HEAD'
  const yanit = await fetch(hedef, {
    method: yontem,
    headers: baslik,
    body: govdesiz ? undefined : ((await govdeAl(istek)) as BufferSource),
    redirect: 'manual',
  })

  const cikis: Record<string, string | string[]> = {}
  for (const ad of DONEN) {
    const d = yanit.headers.get(ad)
    if (d) cikis[ad] = d
  }
  const cerezler = yanit.headers.getSetCookie().map(alansiz)
  if (cerezler.length) cikis['set-cookie'] = cerezler

  cikti.writeHead(yanit.status, cikis).end(new Uint8Array(await yanit.arrayBuffer()))
}
