/**
 * TARAYICIDA MÜHÜRLÜ DEFTER — uçtan uca deneme.
 *
 * Vitest bunu koşturamıyor: OPFS, worker ve sqlite-wasm gerçek bir
 * tarayıcı istiyor. Bu betik gerçeğini koşturuyor (KARARLAR.md · K-037).
 *
 *   npm run onizle                    (ayrı kabukta, 4173)
 *   node arac/muhurDenemesi.mjs
 *
 * Sorduğu dört soru:
 *   1. Kilit kurulmadan defter açılıyor mu?  (açılmamalı)
 *   2. Yazılan metin diskte açık duruyor mu? (durmamalı)
 *   3. Kapatıp açınca defter geri geliyor mu?
 *   4. Yanlış parola açıyor mu?              (açmamalı)
 *
 * ── Taşıma denemesi (iki aşama) ──────────────────────────────
 *
 * Mühürlemeden önceki şifresiz defterin kaybolmadığını sınıyor. İki
 * ayrı derleme gerektiği için ayrı çalışıyor ve tarayıcı profili
 * DİSKTE tutuluyor — yoksa aşamalar birbirinin OPFS'ini görmez:
 *
 *   1) şifresiz derleme:  node arac/muhurDenemesi.mjs yaz
 *   2) mühürlü derleme:   node arac/muhurDenemesi.mjs tasi
 */
import { chromium } from 'playwright'

const ADRES = process.env.DEFTER_ADRES ?? 'http://localhost:4173'
const PAROLA = 'cok-gizli-parola-8f2c'
const ISARET = 'KIMSEYE-SOYLEMEDIGIM-SEY-8f2c1d4b-BU-DISARI-CIKMAMALI'

let hata = 0
const bekle = (p, ms) => p.waitForTimeout(ms)

/** Kilit ekranı kapandı mı — `.acik` sınıfı düşünce defter açık. */
const defterAcildi = (sayfa, ms = 30000) =>
  sayfa.waitForFunction(
    () => !document.querySelector('#kilitEkrani')?.classList.contains('acik'),
    null,
    { timeout: ms },
  )

const de = (tamam, ne) => {
  console.log(`${tamam ? '  ✓' : '  ✗'} ${ne}`)
  if (!tamam) hata++
}

/**
 * OPFS'teki BÜTÜN dosyaların baytları — diske giden şeyin aynısı.
 *
 * Özyinelemeli olmak zorunda: sqlite-wasm'ın SAH havuzu dosyalarını bir
 * ALT KLASÖRDE tutuyor. Yalnızca köke bakan bir tarama, şifresiz
 * veritabanını hiç göremez ve "metin geçmiyor" kontrolü boşa geçerdi —
 * hiçbir şey aramayan bir gizlilik testi, testin olmamasından beter.
 */
const diskiOku = (sayfa) =>
  sayfa.evaluate(async () => {
    const cikti = []
    const gez = async (klasor, onek) => {
      for await (const [ad, tutamac] of klasor.entries()) {
        const yol = onek + ad
        if (tutamac.kind === 'directory') {
          await gez(tutamac, yol + '/')
          continue
        }
        const d = await tutamac.getFile()
        const b = new Uint8Array(await d.arrayBuffer())
        let metin = ''
        for (const x of b) metin += String.fromCharCode(x)
        cikti.push({ ad: yol, boy: b.length, metin })
      }
    }
    await gez(await navigator.storage.getDirectory(), '')
    return cikti
  })

const kilitKur = async (sayfa, parola) => {
  await sayfa.waitForSelector('#kilitEkrani.acik', { timeout: 15000 })
  await sayfa.fill('#kilPin', parola)
  await sayfa.press('#kilPin', 'Enter')
  await bekle(sayfa, 300)
  await sayfa.fill('#kilPin', parola)
  await sayfa.press('#kilPin', 'Enter')
}

const ASAMA = process.argv[2] ?? 'hepsi'
const PROFIL = process.env.DEFTER_PROFIL ?? '/tmp/defter-muhur-profil'

const baglamAc = async () => {
  const secenek = { executablePath: process.env.CHROMIUM }
  /* Taşıma denemesinde OPFS iki koşu arasında yaşamak zorunda. */
  if (ASAMA === 'hepsi') {
    const t = await chromium.launch(secenek)
    return { baglam: await t.newContext(), kapat: () => t.close() }
  }
  const b = await chromium.launchPersistentContext(PROFIL, secenek)
  return { baglam: b, kapat: () => b.close() }
}

const sayfaAc = async (baglam) => {
  const sayfa = baglam.pages()[0] ?? (await baglam.newPage())
  sayfa.on('console', (m) => {
    if (m.type() === 'error') console.log('    [konsol]', m.text())
  })
  return sayfa
}

/** Aşama `yaz`: ŞİFRESİZ derlemede bir kayıt bırakır. */
const asamaYaz = async () => {
  const { baglam, kapat } = await baglamAc()
  const sayfa = await sayfaAc(baglam)
  console.log('\nTaşıma 1/2 — şifresiz derlemede yazılıyor')
  await sayfa.goto(ADRES)
  /*
   * Bugün canlıda olan sürümde kilit ZORUNLU DEĞİL; kullanıcının kilidi
   * hiç olmayabilir. Gerçek yükseltme yolu bu, o yüzden kilit ekranı
   * çıkarsa kuruluyor, çıkmazsa doğrudan yazılıyor.
   */
  const kilitVar = await sayfa
    .waitForSelector('#kilitEkrani.acik', { timeout: 4000 })
    .then(() => true)
    .catch(() => false)
  if (kilitVar) await kilitKur(sayfa, PAROLA)
  await defterAcildi(sayfa)
  console.log(`    (kilit ekranı ${kilitVar ? 'vardı' : 'YOKTU — kilitsiz eski defter'})`)
  await sayfa.click('nav button[data-ekran="defter"]')
  await bekle(sayfa, 400)
  await sayfa.fill('#kalem', ISARET)
  await sayfa.click('#birak')
  await bekle(sayfa, 2500)
  const dosyalar = await diskiOku(sayfa)
  de(
    dosyalar.some((d) => d.metin.includes(ISARET)),
    'şifresiz derlemede metin diskte AÇIK duruyor (beklenen)',
  )
  await kapat()
  console.log('  → şimdi mühürlü derlemeyi kurup: node arac/muhurDenemesi.mjs tasi\n')
  process.exit(hata ? 1 : 0)
}

/** Aşama `tasi`: MÜHÜRLÜ derlemede aynı defterin taşındığını sınar. */
const asamaTasi = async () => {
  const { baglam, kapat } = await baglamAc()
  const sayfa = await sayfaAc(baglam)
  console.log('\nTaşıma 2/2 — mühürlü derlemede açılıyor')
  await sayfa.goto(ADRES)
  await sayfa.waitForSelector('#kilitEkrani.acik', { timeout: 15000 })
  /* Kilitsiz eski defterde bu ilk KURULUM; kilitliyse tek yazımlık açma. */
  const kurulum = !(await sayfa.isVisible('#kilParola'))
  console.log(`    (${kurulum ? 'kurulum ekranı — kilitsiz eski defter' : 'açma ekranı'})`)
  if (kurulum) await kilitKur(sayfa, PAROLA)
  else {
    await sayfa.click('#kilParola')
    await sayfa.fill('#kilPin', PAROLA)
    await sayfa.press('#kilPin', 'Enter')
  }
  await defterAcildi(sayfa)
  await bekle(sayfa, 3000)

  const govde = await sayfa.textContent('body')
  de(govde.includes(ISARET), 'şifresiz dönemde yazılan kayıt DURUYOR')

  const dosyalar = await diskiOku(sayfa)
  console.log(`    OPFS: ${dosyalar.map((d) => `${d.ad} (${d.boy} B)`).join(', ')}`)
  de(
    dosyalar.some((d) => d.ad.startsWith('defter.muhur')),
    'mühür yuvası oluştu',
  )
  de(
    !dosyalar.some((d) => d.metin.includes(ISARET)),
    'metin artık hiçbir dosyada AÇIK değil — düz kopya silindi',
  )
  await kapat()
  console.log(hata ? `\nDÜŞEN: ${hata}\n` : '\nTaşıma geçti.\n')
  process.exit(hata ? 1 : 0)
}

const calis = async () => {
  if (ASAMA === 'yaz') return asamaYaz()
  if (ASAMA === 'tasi') return asamaTasi()
  const { baglam, kapat } = await baglamAc()
  const sayfa = await sayfaAc(baglam)

  console.log('\n1. Kilit kurulmadan defter açılmıyor')
  await sayfa.goto(ADRES)
  await sayfa.waitForSelector('#kilitEkrani.acik', { timeout: 15000 })
  de(await sayfa.isVisible('#kilitEkrani.acik'), 'kurulum ekranı geldi')
  de(
    (await sayfa.textContent('#kilUyari')).length > 20,
    'parolanın ne işe yaradığı yazıyor',
  )
  de(!(await sayfa.isVisible('#kilParola')), 'kurulumda PIN geçişi gizli')

  console.log('\n2. Parola kurulunca defter açılıyor')
  await kilitKur(sayfa, PAROLA)
  await defterAcildi(sayfa)
  de(true, 'defter açıldı')

  console.log('\n3. Yazılan metin diske AÇIK yazılmıyor')
  await sayfa.click('nav button[data-ekran="defter"]')
  await bekle(sayfa, 400)
  await sayfa.fill('#kalem', ISARET)
  await sayfa.click('#birak')
  await bekle(sayfa, 3000)

  const dosyalar = await diskiOku(sayfa)
  const toplam = dosyalar.reduce((t, d) => t + d.boy, 0)
  console.log(
    `    OPFS (${dosyalar.length} dosya, ${toplam} B): ` +
      (dosyalar.map((d) => `${d.ad} (${d.boy} B)`).join(', ') || 'boş'),
  )
  de(dosyalar.length > 0, 'diske bir şey yazıldı')
  /* Tarama gerçekten bir şey okuyor mu — boş bir taramada aşağıdaki
     "metin geçmiyor" kontrolü kendiliğinden geçerdi. */
  de(toplam > 1000, 'tarama boş değil — kontrol edilecek bayt var')
  de(
    dosyalar.some((d) => d.ad.startsWith('defter.muhur')),
    'mühür yuvası oluştu',
  )
  de(
    !dosyalar.some((d) => d.metin.includes(ISARET)),
    'yazılan metin OPFS baytlarında GEÇMİYOR',
  )
  const yerel = await sayfa.evaluate(() => JSON.stringify(localStorage))
  de(!yerel.includes(ISARET), 'localStorage içinde de geçmiyor')

  console.log('\n4. Kapatıp açınca defter geri geliyor')
  await sayfa.reload()
  await sayfa.waitForSelector('#kilitEkrani.acik', { timeout: 15000 })
  de(await sayfa.isVisible('#kilParola'), 'bu sefer AÇMA ekranı (PIN geçişi görünür)')

  await sayfa.click('#kilParola')
  await sayfa.fill('#kilPin', 'yanlis-parola-tamamen')
  await sayfa.press('#kilPin', 'Enter')
  await bekle(sayfa, 2500)
  de(await sayfa.isVisible('#kilitEkrani.acik'), 'yanlış parola AÇMIYOR')

  await sayfa.fill('#kilPin', PAROLA)
  await sayfa.press('#kilPin', 'Enter')
  await defterAcildi(sayfa)
  await bekle(sayfa, 1500)
  const govde = await sayfa.textContent('body')
  de(govde.includes(ISARET), 'yazdığımız kayıt yerinde')

  console.log('\n5. Mühür bozulursa boş ekran değil, açıklama')
  /* Her iki yuva da bozuluyor: yedek yuva kurtarmasın, hata yolu koşsun. */
  await sayfa.evaluate(async () => {
    const kok = await navigator.storage.getDirectory()
    for await (const [ad, tutamac] of kok.entries()) {
      if (!ad.startsWith('defter.muhur') || tutamac.kind !== 'file') continue
      const y = await tutamac.createWritable()
      await y.write(new Uint8Array([68, 70, 84, 82, 77, 72, 82, 1, ...new Array(200).fill(7)]))
      await y.close()
    }
  })
  await sayfa.reload()
  await sayfa.waitForSelector('#kilitEkrani.acik', { timeout: 15000 })
  await sayfa.click('#kilParola')
  await sayfa.fill('#kilPin', PAROLA)
  await sayfa.press('#kilPin', 'Enter')
  await bekle(sayfa, 6000)
  de(await sayfa.isVisible('#kilitEkrani.acik'), 'kilit ekranı geri geldi (boş ekran yok)')
  const soylenen = await sayfa.textContent('#kilUyari')
  de(soylenen.length > 30, `ne olduğu yazıyor: "${soylenen.slice(0, 60)}…"`)

  await kapat()
  console.log(hata ? `\nDÜŞEN: ${hata}\n` : '\nHepsi geçti.\n')
  process.exit(hata ? 1 : 0)
}

calis().catch((e) => {
  console.error(e)
  process.exit(1)
})
