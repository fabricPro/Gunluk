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
 *
 * ── Kasa denemesi ────────────────────────────────────────────
 *
 * Kurtarmanın asıl sınavı: taraycıdaki HER ŞEY silindikten sonra, elde
 * yalnızca parola varken defter geri geliyor mu. Gerçek bir sunucu
 * istiyor; `arac/sahteNeon.mjs` Neon'un dokunulan kadarını taklit
 * ediyor (KARARLAR.md · K-038):
 *
 *   node arac/sahteNeon.mjs 8787 &
 *   .env.local  ->  VITE_DEFTER_AUTH/API = http://localhost:8787/...
 *   npx vite preview --port 4180
 *   DEFTER_ADRES=http://localhost:4180 node arac/muhurDenemesi.mjs kasa
 */
import { chromium } from 'playwright'

const ADRES = process.env.DEFTER_ADRES ?? 'http://localhost:4173'
const PAROLA = 'cok-gizli-kurtarma-parolasi-8f2c'
const ISARET = 'KIMSEYE-SOYLEMEDIGIM-SEY-8f2c1d4b-BU-DISARI-CIKMAMALI'

let hata = 0
const bekle = (p, ms) => p.waitForTimeout(ms)

/**
 * Kilit ekranı KARŞILAMA kipinde mi (yani bu cihazda defter yok).
 *
 * Bu kontrol iki kez kaydı: önce "`#kilParola` görünür mü" diye
 * bakıyordu, sonra o düğmenin yazısına. Hesap gelince ekran yeniden
 * değişti. Ayrım artık şu: karşılamada PIN/parola geçişi HİÇ yok,
 * açmada var.
 */
const kurulumKipi = async (sayfa) => !(await sayfa.isVisible('#kilParola'))

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
  /* Karşılamada üç yol var; hesapsız defter için "bu cihazda kal". */
  if (await sayfa.isVisible('#kilYollar')) {
    await sayfa.click('#kilYerel')
    await sayfa.waitForTimeout(300)
  }
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
  if (ASAMA === 'hepsi' || ASAMA === 'kasa' || ASAMA === 'cikmaz') {
    const t = await chromium.launch(secenek)
    return { baglam: await t.newContext(), kapat: () => t.close() }
  }
  const b = await chromium.launchPersistentContext(PROFIL, secenek)
  return { baglam: b, kapat: () => b.close() }
}

const sayfaAc = async (baglam) => {
  const sayfa = baglam.pages()[0] ?? (await baglam.newPage())
  sayfa.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning')
      console.log('    [konsol]', m.text().slice(0, 200))
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
  const kurulum = await kurulumKipi(sayfa)
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

/** Kutuları sırayla cevaplar — ayarlar `prompt`/`confirm` kullanıyor. */
const kutulariCevapla = (sayfa, cevaplar) => {
  const sira = [...cevaplar]
  sayfa.on('dialog', (d) => void d.accept(sira.length ? sira.shift() : ''))
}

/** Site verilerini temizlemenin taklidi: OPFS + localStorage. */
const herSeyiSil = (sayfa) =>
  sayfa.evaluate(async () => {
    localStorage.clear()
    sessionStorage.clear()
    const kok = await navigator.storage.getDirectory()
    for await (const [ad] of kok.entries())
      await kok.removeEntry(ad, { recursive: true }).catch(() => {})
  })

/** Aşama `kasa`: yaz → senkron+kasa aç → her şeyi sil → parolayla kurtar. */
/**
 * Aşama `hesap` — "her cihazdan ulaşırım" sözünün asıl sınavı.
 *
 * A bağlamında hesap açılıp kayıt bırakılıyor, sonra AYRI bir tarayıcı
 * bağlamında (gerçek ikinci cihaz: kendi deposu, kendi çerezleri)
 * yalnızca kullanıcı adı ve şifreyle giriliyor. Ne kod yazılıyor ne
 * senkron açılıyor (KARARLAR.md · K-039).
 */
/**
 * Aşama `cikmaz` — açma ekranından çıkış yolu.
 *
 * K-039 bir çıkmaz açmıştı: yerel defteri olan kullanıcı açma ekranına
 * düşüyor ve oradan hesap ekranına HİÇ geçemiyordu. Parolayı
 * hatırlamıyorsa tarayıcıda tamamen kilitli kalıyordu.
 */
const asamaCikmaz = async () => {
  const { baglam, kapat } = await baglamAc()
  const sayfa = await sayfaAc(baglam)
  const ad = `kullanici${Date.now().toString(36)}`
  kutulariCevapla(sayfa, [])

  console.log('\n1. Yerel defter kuruluyor')
  await sayfa.goto(ADRES)
  await sayfa.waitForSelector('#kilitEkrani.acik', { timeout: 15000 })
  await kilitKur(sayfa, PAROLA)
  await defterAcildi(sayfa)
  await sayfa.click('nav button[data-ekran="defter"]')
  await bekle(sayfa, 400)
  await sayfa.fill('#kalem', ISARET)
  await sayfa.click('#birak')

  /*
   * Mührün GERÇEKTEN yazılmasını bekle.
   *
   * Bu bekleme olmadan deneme boşa geçiyordu: defter kurulup hemen
   * yenilenince yuva hiç oluşmuyor, "OPFS boş" kendiliğinden doğru
   * oluyor ve 4. adımdaki asıl muhafız hiçbir şey ölçmüyordu. Bu
   * projede dördüncü kez aynı sınıf hata (K-039).
   */
  let muhurVar = false
  for (let i = 0; i < 20 && !muhurVar; i++) {
    await bekle(sayfa, 500)
    muhurVar = (await diskiOku(sayfa)).some((d) => d.ad.startsWith('defter.muhur'))
  }
  de(muhurVar, 'yerel defter açıldı ve MÜHÜRLENDİ')
  if (!muhurVar) {
    await kapat()
    console.log(`\nDÜŞEN: ${hata}\n`)
    process.exit(1)
  }

  console.log('\n2. Yenilenince AÇMA ekranı geliyor')
  await sayfa.reload()
  await sayfa.waitForSelector('#kilitEkrani.acik', { timeout: 15000 })
  de(!(await sayfa.isVisible('#kilYollar')), 'karşılama değil, açma ekranı')
  de(await sayfa.isVisible('#kilHesabim'), 'çıkış yolu görünüyor')
  /* Tarayıcıda PIN yok: ekran parola kipinde açılmalı. */
  de(
    (await sayfa.innerHTML('#kilNoktalar')).trim() === '',
    'parola kipinde açılıyor — altı nokta yok',
  )

  console.log('\n3. "hesabımla gir" cihazı temizliyor')
  await sayfa.click('#kilHesabim')
  await sayfa.waitForSelector('#kilYollar:not([hidden])', { timeout: 20000 })
  de(true, 'karşılama ekranına dönüldü')
  const dosyalar = await diskiOku(sayfa)
  const yerel = await sayfa.evaluate(() => JSON.stringify(localStorage))
  de(
    dosyalar.length === 0,
    `OPFS boş (kalan: ${dosyalar.map((d) => d.ad).join(", ") || "yok"})`,
  )
  de(!yerel.includes('defter.kilit'), 'kilit kaydı silinmiş')

  console.log('\n4. Temizlikten SONRA hesap açılabiliyor')
  await sayfa.click('#kilHesap')
  await bekle(sayfa, 300)
  await sayfa.fill('#kilAd', ad)
  await sayfa.fill('#kilPin', PAROLA)
  await sayfa.press('#kilPin', 'Enter')
  await bekle(sayfa, 400)
  await sayfa.fill('#kilPin', PAROLA)
  await sayfa.press('#kilPin', 'Enter')
  /*
   * Ölçülen şey "kilit ekranı kapandı" DEĞİL.
   *
   * İki kırma denemesi de buradan sızmıştı. `defteriKodla` kilit
   * ekranını `uygulamayiKur`dan önce gizliyordu, kabuk (nav, düğmeler)
   * index.html'de STATİK duruyor — yani veritabanı hiç açılmamışken
   * bile "ekran geldi" doğru görünüyordu. Ekranda görünen tek şey
   * yanlış bir "bağlantını kontrol et" uyarısıydı.
   *
   * O yüzden kanıt yazmaktan geçiyor: yeni bir kayıt bırakıp geri
   * okunuyor. Bu ancak defter GERÇEKTEN açıldıysa olur.
   */
  const acildi = await defterAcildi(sayfa, 60000).then(() => true).catch(() => false)
  let yazildi = false
  if (acildi) {
    const yeniIsaret = `${ISARET}-SONRASI`
    await sayfa.click('nav button[data-ekran="defter"]').catch(() => {})
    await bekle(sayfa, 400)
    await sayfa.fill('#kalem', yeniIsaret).catch(() => {})
    await sayfa.click('#birak').catch(() => {})
    for (let i = 0; i < 10 && !yazildi; i++) {
      await bekle(sayfa, 400)
      yazildi = (await sayfa.textContent('body')).includes(yeniIsaret)
    }
  }
  de(yazildi, 'temizlikten sonra hesap açıldı ve deftere YAZILABİLDİ')
  if (!yazildi)
    console.log(
      `    ekranda: ${((await sayfa.textContent('#kilUyari').catch(() => '')) ?? '').slice(0, 120)}`,
    )

  await kapat()
  console.log(hata ? `\nDÜŞEN: ${hata}\n` : '\nÇıkmaz denemesi geçti.\n')
  process.exit(hata ? 1 : 0)
}

const asamaHesap = async () => {
  const tarayici = await chromium.launch({ executablePath: process.env.CHROMIUM })
  const ad = `kullanici${Date.now().toString(36)}`

  console.log('\n1. Birinci cihaz: hesap açılıyor')
  const bir = await tarayici.newContext()
  const s1 = await sayfaAc(bir)
  await s1.goto(ADRES)
  await s1.waitForSelector('#kilitEkrani.acik', { timeout: 15000 })
  de(await s1.isVisible('#kilYollar'), 'karşılamada üç yol var')
  await s1.click('#kilHesap')
  await bekle(s1, 300)
  await s1.fill('#kilAd', ad)
  await s1.fill('#kilPin', PAROLA)
  await s1.press('#kilPin', 'Enter')
  await bekle(s1, 400)
  await s1.fill('#kilPin', PAROLA)
  await s1.press('#kilPin', 'Enter')
  const acildi1 = await defterAcildi(s1, 60000).then(() => true).catch(() => false)
  de(acildi1, 'hesap açıldı ve defter kuruldu')
  if (!acildi1) {
    console.log(`    ekranda: ${(await s1.textContent('#kilUyari')).slice(0, 100)}`)
    await tarayici.close()
    process.exit(1)
  }

  await s1.click('nav button[data-ekran="defter"]')
  await bekle(s1, 400)
  await s1.fill('#kalem', ISARET)
  await s1.click('#birak')
  await bekle(s1, 5000)
  de(true, 'kayıt bırakıldı ve eşitlendi')

  console.log('\n2. İKİNCİ CİHAZ: yalnızca kullanıcı adı ve şifre')
  const iki = await tarayici.newContext()
  const s2 = await sayfaAc(iki)
  await s2.goto(ADRES)
  await s2.waitForSelector('#kilitEkrani.acik', { timeout: 15000 })
  de(!(await s2.textContent('body')).includes(ISARET), 'ikinci cihaz gerçekten boş')

  console.log('\n3. Yanlış şifre reddediliyor')
  await s2.click('#kilGiris')
  await bekle(s2, 300)
  await s2.fill('#kilAd', ad)
  await s2.fill('#kilPin', PAROLA + '-yanlis')
  await s2.press('#kilPin', 'Enter')
  await bekle(s2, 12000)
  de(await s2.isVisible('#kilitEkrani.acik'), 'yanlış şifre defter AÇMIYOR')

  console.log('\n4. Doğru şifreyle giriş')
  await s2.fill('#kilAd', ad)
  await s2.fill('#kilPin', PAROLA)
  await s2.press('#kilPin', 'Enter')
  const acildi2 = await defterAcildi(s2, 60000).then(() => true).catch(() => false)
  de(acildi2, 'ikinci cihazda defter açıldı')
  if (!acildi2) console.log(`    ekranda: ${(await s2.textContent('#kilUyari')).slice(0, 100)}`)

  let geldi = false
  for (let i = 0; i < 30 && !geldi; i++) {
    await bekle(s2, 1000)
    geldi = (await s2.textContent('body')).includes(ISARET)
  }
  de(geldi, 'BİRİNCİ CİHAZDA YAZILAN KAYIT İKİNCİ CİHAZDA — kod yazılmadı, senkron açılmadı')

  await tarayici.close()
  console.log(hata ? `\nDÜŞEN: ${hata}\n` : '\nHesap denemesi geçti.\n')
  process.exit(hata ? 1 : 0)
}

const asamaKasa = async () => {
  const { baglam, kapat } = await baglamAc()
  const sayfa = await sayfaAc(baglam)
  kutulariCevapla(sayfa, [PAROLA, PAROLA])

  console.log('\n1. Defter kuruluyor ve bir kayıt bırakılıyor')
  await sayfa.goto(ADRES)
  await sayfa.waitForSelector('#kilitEkrani.acik', { timeout: 15000 })
  await kilitKur(sayfa, PAROLA)
  await defterAcildi(sayfa)
  await sayfa.click('nav button[data-ekran="defter"]')
  await bekle(sayfa, 400)
  await sayfa.fill('#kalem', ISARET)
  await sayfa.click('#birak')
  await bekle(sayfa, 1500)
  de(true, 'kayıt bırakıldı')

  console.log('\n2. Senkron açılıyor')
  await sayfa.click('#ayarlarBtn')
  await bekle(sayfa, 500)
  await sayfa.click('[data-eylem="senkronAc"]')
  await sayfa.waitForSelector('#senkronKimlikKarti.acik', { timeout: 10000 })
  const kod = (await sayfa.textContent('#skKod')).trim()
  de(kod.length > 20, `Defter Kimliği üretildi (${kod.slice(0, 9)}…)`)
  await sayfa.check('#skOnay')
  await sayfa.click('#skDevam')
  await bekle(sayfa, 4000)
  const durumMetni = await sayfa.textContent('#aySenkronDurum')
  de(!/başarısız|failed/i.test(durumMetni), `senkron durumu: ${durumMetni}`)

  console.log('\n3. Kurtarma parolası kuruluyor')
  await sayfa.click('[data-eylem="kasaKur"]')
  await bekle(sayfa, 6000)
  de(
    /kurulu|is <b>set<\/b>|set\b/i.test(await sayfa.textContent('#aySenkronDurum')),
    'ayar kağıdı kasayı kurulu gösteriyor',
  )

  console.log('\n4. Tarayıcıdaki HER ŞEY siliniyor')
  await herSeyiSil(sayfa)
  const kalan = await diskiOku(sayfa)
  const yerelKalan = await sayfa.evaluate(() => JSON.stringify(localStorage))
  de(kalan.length === 0, 'OPFS boş')
  de(yerelKalan === '{}', 'localStorage boş')

  console.log('\n5. Yalnızca parolayla kurtarılıyor')
  await sayfa.reload()
  await sayfa.waitForSelector('#kilitEkrani.acik', { timeout: 15000 })
  de(!(await sayfa.isVisible('#kagit-kap .kagit')), 'defter gerçekten yok')
  await sayfa.click('#kilParola')
  await sayfa.fill('#kilPin', PAROLA)
  await sayfa.press('#kilPin', 'Enter')

  /* Kasa açılmazsa kilit ekranı kapanmıyor; çıplak zaman aşımı yerine
     okunur bir satır düşsün. */
  const acildi = await defterAcildi(sayfa, 45000)
    .then(() => true)
    .catch(() => false)
  de(acildi, 'kasa açıldı ve defter kuruldu')
  if (!acildi) {
    console.log(`    ekranda: ${(await sayfa.textContent('#kilUyari')).slice(0, 90)}`)
    await kapat()
    console.log(`\nDÜŞEN: ${hata}\n`)
    process.exit(1)
  }

  /* Çekme ağ üzerinden ve borçlandırmalı; kayıt görünene kadar bekleniyor. */
  let geldi = false
  for (let i = 0; i < 30 && !geldi; i++) {
    await bekle(sayfa, 1000)
    geldi = (await sayfa.textContent('body')).includes(ISARET)
  }
  de(geldi, 'silinen defter YALNIZCA PAROLAYLA geri geldi')

  await kapat()
  console.log(hata ? `\nDÜŞEN: ${hata}\n` : '\nKasa denemesi geçti.\n')
  process.exit(hata ? 1 : 0)
}

const calis = async () => {
  if (ASAMA === 'yaz') return asamaYaz()
  if (ASAMA === 'tasi') return asamaTasi()
  if (ASAMA === 'kasa') return asamaKasa()
  if (ASAMA === 'hesap') return asamaHesap()
  if (ASAMA === 'cikmaz') return asamaCikmaz()
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
  de(await sayfa.isVisible('#kilYollar'), 'karşılamada üç yol var')

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
  de(!(await kurulumKipi(sayfa)), 'bu sefer AÇMA ekranı — PIN/parola geçişi var')

  /*
   * "parola kullan"a BASILMIYOR: tarayıcıda açma ekranı artık parola
   * kipinde açılıyor (K-039). Basmak kipi PIN'e geri çevirir, alan da
   * harfleri süzer — parola hiç yazılamaz. Yanlış parola yine
   * reddedilirdi ama YANLIŞ sebeple: bu, denemeyi sessizce boşa
   * çıkaran türden bir geçiş.
   */
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
  /* Parola kipi zaten açık; basmak PIN'e geri çevirirdi (yukarıya bak). */
  await sayfa.fill('#kilPin', PAROLA)
  await sayfa.press('#kilPin', 'Enter')
  await bekle(sayfa, 6000)
  de(await sayfa.isVisible('#kilitEkrani.acik'), 'kilit ekranı geri geldi (boş ekran yok)')
  /*
   * Uzunluğa bakmak yetmiyordu: yanlış parola mesajı ("That didn't
   * work.") da uzun bir metin ve ölçüm onu kabul ediyordu. Aranan
   * ŞEY belli — mühür açılamadı mesajı; onu arıyoruz.
   */
  const soylenen = await sayfa.textContent('#kilUyari')
  de(
    /sealed file|mühürlü dosya/.test(soylenen),
    `ne olduğu yazıyor: "${soylenen.slice(0, 60)}…"`,
  )

  await kapat()
  console.log(hata ? `\nDÜŞEN: ${hata}\n` : '\nHepsi geçti.\n')
  process.exit(hata ? 1 : 0)
}

calis().catch((e) => {
  console.error(e)
  process.exit(1)
})
