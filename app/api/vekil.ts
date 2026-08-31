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
 * Önce `api/vekil/[...yol].ts` denendi. Canlıda yakalayıcı yol TEK
 * segment gibi davrandı: `/api/vekil/auth` fonksiyona düştü ama
 * `/api/vekil/auth/token` Vercel'in kendi 404'ünü aldı. Bu yüzden
 * fonksiyon sabit yolda duruyor; hedef ile yol `vercel.json`daki
 * yönlendirmeyle sorgu dizesinde geliyor.
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

/** `Domain=...` düşürülüyor; çerez bu kaynağa ait olsun. */
const alansiz = (cerez: string): string =>
  cerez
    .split(';')
    .filter((p) => p.trim().slice(0, 7).toLowerCase() !== 'domain=')
    .join(';')

export default async function vekil(istek: Request): Promise<Response> {
  const gelen = new URL(istek.url)
  const taban = TABAN[gelen.searchParams.get(HEDEF) ?? '']
  if (!taban) return new Response('yok', { status: 404 })

  const hedef = new URL(taban + '/' + (gelen.searchParams.get(YOL) ?? ''))
  for (const [ad, deger] of gelen.searchParams)
    if (ad !== HEDEF && ad !== YOL) hedef.searchParams.append(ad, deger)

  const baslik = new Headers()
  for (const ad of GIDEN) {
    const d = istek.headers.get(ad)
    if (d) baslik.set(ad, d)
  }

  const govdesiz = istek.method === 'GET' || istek.method === 'HEAD'
  const yanit = await fetch(hedef, {
    method: istek.method,
    headers: baslik,
    body: govdesiz ? undefined : await istek.arrayBuffer(),
    redirect: 'manual',
  })

  const cikis = new Headers()
  for (const ad of DONEN) {
    const d = yanit.headers.get(ad)
    if (d) cikis.set(ad, d)
  }
  for (const c of yanit.headers.getSetCookie()) cikis.append('set-cookie', alansiz(c))

  return new Response(yanit.body, { status: yanit.status, headers: cikis })
}
