import { defterOzeti } from '../cekirdek/ozet.js'
import { romen, tamTarih } from '../cekirdek/tr.js'
import type { Durum } from '../durum.js'
import type { Depo } from '../veri/depo.js'
import { KAPAKLAR } from './kapaklar.js'
import { $, $$, kacir } from './ortak.js'

/**
 * Cilt kapanma töreni — PROJE.md Faz 1.4.
 *
 * Defter sayfa sınırına gelince yazma durur ve bu ekran açılır: kullanıcı
 * ya defteri uzatır ya kapatır. Kapatınca defterin özeti gösterilir ve aynı
 * adla bir sonraki cilt açılır (KARARLAR.md · K-017, K-018).
 *
 * Özet yorum yapmaz: yalnızca kullanıcının kendi kayıtlarından çıkan
 * olgular. Skor, grafik ve teşhis PROJE.md §5 ile kapalı.
 */
export function toreniBagla(
  durum: Durum,
  depo: Depo,
  degisti: () => void,
): { ac: () => void } {
  let secilenKapak = 'deri'
  let sonrakiCiltVar = false

  const kapat = () => {
    $('#toren').classList.remove('acik', 'ozet')
    $('#torUzatAlan').classList.remove('acik')
  }

  const ac = (): void => {
    const d = durum.aktifDefter
    if (!d) return
    secilenKapak = d.kapak
    /* Kapanmış defterde soru yok, doğrudan özet. */
    if (d.kapandi) {
      void depo.siradakiCilt(d.ad).then((n) => {
        sonrakiCiltVar = n > d.cilt + 1
        $('#ozYeniCilt').style.display = sonrakiCiltVar ? 'none' : ''
      })
      ozetiCiz()
      $('#toren').classList.add('acik', 'ozet')
      return
    }
    $('#torBaslik').textContent = d.ad + (d.cilt > 1 ? ` · Cilt ${romen(d.cilt)}` : '')
    $('#torBaslikEt').textContent = durum.dolu ? 'bu defter doldu' : 'defteri kapatıyorsun'
    $('#torGiris').textContent = durum.dolu
      ? `${durum.sayfalar.length} sayfa doldu. Bu defteri burada bitirebilir ya da biraz daha ` +
        'uzatabilirsin. Kapattığında bir daha yazamazsın.'
      : `${durum.sayfalar.length} sayfa yazdın. Bu defteri şimdi kapatabilirsin — ` +
        'kapandıktan sonra buraya bir daha yazamazsın.'
    /* Dolmamış defterde "uzat" anlamsız. */
    $('#torUzat').style.display = durum.dolu ? '' : 'none'
    $<HTMLInputElement>('#torAd').value = d.ad
    kapaklariCiz()
    $('#toren').classList.remove('ozet')
    $('#torUzatAlan').classList.remove('acik')
    $('#toren').classList.add('acik')
  }

  const kapaklariCiz = (): void => {
    $('#torKapaklar').innerHTML = KAPAKLAR.map(
      (k) =>
        `<button class="k-${k.anahtar}" data-kapak="${k.anahtar}" title="${kacir(k.ad)}"
          aria-pressed="${k.anahtar === secilenKapak}"></button>`,
    ).join('')
    for (const b of $$<HTMLButtonElement>('#torKapaklar button'))
      b.onclick = () => {
        secilenKapak = b.dataset.kapak!
        for (const x of $$('#torKapaklar button'))
          x.setAttribute('aria-pressed', String(x === b))
      }
  }

  /* ── uzatma ──────────────────────────────────────────────── */

  $('#torUzat').onclick = () => $('#torUzatAlan').classList.add('acik')
  $('#torUzatVaz').onclick = () => $('#torUzatAlan').classList.remove('acik')
  for (const b of $$<HTMLButtonElement>('#torUzatAlan button[data-ek]'))
    b.onclick = async () => {
      const d = durum.aktifDefter
      if (!d) return
      /* Ad ve kapak da bu anda kaydedilir: kullanıcı burada değiştirmiş olabilir. */
      await adVeKapagiYaz(d.id)
      await depo.sayfaSiniriYaz(d.id, d.sayfaSiniri + Number(b.dataset.ek))
      await durum.yenile()
      durum.aktifSayfa = durum.sonSayfa
      kapat()
      degisti()
    }

  const adVeKapagiYaz = async (id: string): Promise<void> => {
    const ad = $<HTMLInputElement>('#torAd').value.trim()
    if (ad) await depo.defterAdiYaz(id, ad)
    await depo.defterKapakYaz(id, secilenKapak)
  }

  /* ── kapatma ve özet ─────────────────────────────────────── */

  $('#torKapatDefter').onclick = async () => {
    const d = durum.aktifDefter
    if (!d) return
    await adVeKapagiYaz(d.id)
    await depo.defterKapat(d.id)
    await durum.yenile()
    ozetiCiz()
    $('#toren').classList.add('ozet')
    degisti()
  }

  function ozetiCiz(): void {
    const d = durum.aktifDefter
    if (!d) return
    const o = defterOzeti(durum.gunler, durum.sayfalar, durum.basliklar, durum.temalar)

    $('#ozBaslik').textContent = d.ad + (d.cilt > 1 ? ` · Cilt ${romen(d.cilt)}` : '')
    $('#ozAralik').textContent = o.aralik || 'Bu defter boş kapandı.'

    /* "0 gün sürdü" kötü okunuyor: tek günlük defterde o kutu hiç çıkmasın. */
    const sayilar: [number, string][] = [
      [o.sayfaSayisi, 'sayfa'],
      [o.kayitSayisi, 'kayıt'],
      [o.yazilanGun, 'gün yazdın'],
    ]
    if (o.surenGun > 0) sayilar.push([o.surenGun, 'gün sürdü'])
    $('#ozSayilar').innerHTML = sayilar
      .map(([n, et]) => `<div><b>${n}</b><span>${et}</span></div>`)
      .join('')

    $('#ozTemalar').innerHTML = o.enSik.length
      ? `<span class="et">en sık geçenler</span>` +
        o.enSik.map(([ad, n]) => `<b>${kacir(ad)}</b> (${n})`).join(', ')
      : ''

    $('#ozBasliklar').innerHTML = o.baslikliSayfalar.length
      ? `<span class="et">ad verdiğin sayfalar</span><ul class="oz-liste">` +
        o.baslikliSayfalar
          .map(
            (b) =>
              `<li><span>${kacir(b.baslik)}</span><span class="nokta"></span>` +
              `<span class="no">s. ${b.ciltSayfa}</span></li>`,
          )
          .join('') +
        '</ul>'
      : ''

    const uc = (et: string, tarih: string, metin: string) =>
      `<div class="oz-uc"><time>${et} · ${tamTarih(tarih)}</time>${kacir(metin)}</div>`
    $('#ozUclar').innerHTML =
      o.ilkKayit && o.sonKayit
        ? uc('ilk yazdığın', o.ilkKayit.tarih, o.ilkKayit.metin) +
          (o.ilkKayit.id !== o.sonKayit.id
            ? uc('son yazdığın', o.sonKayit.tarih, o.sonKayit.metin)
            : '')
        : ''

    $('#ozYeniCilt').textContent = `${d.ad} · Cilt ${romen(d.cilt + 1)} aç`
    /* Bu cildin devamı zaten açılmışsa ikinci kez açmayı önerme. */
    $('#ozYeniCilt').style.display = sonrakiCiltVar ? 'none' : ''
  }

  $('#ozKitaplik').onclick = () => {
    kapat()
    degisti()
    $('#kilitle').click()
  }

  $('#ozYeniCilt').onclick = async () => {
    const d = durum.aktifDefter
    if (!d) return
    const yeni = await depo.defterAc(d.ad, d.kapak, d.sayfaSiniri)
    kapat()
    await durum.defteriAc(yeni.id)
    degisti()
  }

  return { ac }
}
