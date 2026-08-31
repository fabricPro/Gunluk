import { sayfaBul } from '../cekirdek/sayfa.js'
import { anlatimKur } from '../cekirdek/anlatim.js'
import type { Anlatim } from '../cekirdek/anlatim.js'
import { soruCoz, type Bulgu } from '../cekirdek/sorgu.js'
import { enYakinlar, paketiAc, paketle } from '../cekirdek/gomu.js'
import { MODEL_KIMLIK } from '../cekirdek/gomuModel.js'
import { gunAdi, iso, romen, tamTarih } from '../cekirdek/tr.js'
import type { Durum } from '../durum.js'
import type { Depo } from '../veri/depo.js'
import type { ModelAkis } from '../modelAkis.js'
import { $, $$, ekranAc, kacir } from './ortak.js'

/**
 * Arşiv: arama ve sorma. Yorum yok.
 * Cevap yalnızca kullanıcının kayıtlarından kurulur ve kullanılan kayıtlar
 * cilt/sayfa numarasıyla her zaman gösterilir (ilke 2.4).
 */
export function arsiviBagla(
  durum: Durum,
  depo: Depo,
  sayfayaGit: (i: number, anim?: boolean) => void,
  model?: ModelAkis,
): { gecenYilCiz: () => void } {
  const kaynakHtml = (b: Bulgu, no?: number): string => {
    const s = sayfaBul(durum.sayfalar, b.kayit.id)
    /*
     * Eşleşen kenar notu kaynakla birlikte gösteriliyor. Kayıt yalnızca
     * notu yüzünden bulunduysa gövdeyi gösterip notu saklamak, cevabın
     * neden geldiğini saklamak olurdu (ilke 2.4).
     */
    const notlar = b.kenarlar
      .map(
        (n) => `<div class="kaynak-kenar">${kacir(n.metin)}
          <span>kenar notu · ${kacir(kenarTarih(n.tarih))}</span></div>`,
      )
      .join('')
    /*
     * Anlamsal sonuçta hangi sözcüğün eşleştiğini gösteremiyoruz — çünkü
     * hiçbiri eşleşmedi. İlke 2.4 kaynağın görünmesini istiyor, o yüzden
     * kartın kendisi bunu söylüyor (K-029).
     */
    const yakinEt =
      b.yakinlik !== undefined
        ? '<div class="kaynak-yakin">aradığın sözcükler bu kayıtta geçmiyor — anlamca yakın</div>'
        : ''
    return `<div class="kaynak" data-id="${b.kayit.id}">
      <time>${no ? `<i class="kaynak-no">[${no}]</i> ` : ''}${b.gunAd} · ${tamTarih(b.kayit.tarih)} · ${b.kayit.saat}${
        s ? ` · <b>cilt ${romen(s.cilt)}, sayfa ${s.ciltSayfa}</b>` : ''
      }</time>
      ${kacir(b.kayit.metin)}${yakinEt}${notlar}</div>`
  }

  /** Göç öncesi okunur dizeler olduğu gibi basılır (K-024). */
  const kenarTarih = (t: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(t) ? tamTarih(t) : t)

  const kaynakBagla = (kap: HTMLElement, terim: string, govdeler: string[] = []): void => {
    for (const el of kap.querySelectorAll<HTMLElement>('.kaynak,.gy-kayit'))
      el.onclick = () => {
        const id = el.dataset.id
        if (!id) return
        const s = sayfaBul(durum.sayfalar, id)
        if (!s) return
        durum.aramaTerim = terim
        durum.aramaGovdeleri = govdeler
        ekranAc('defter')
        sayfayaGit(s.no - 1, false)
      }
  }

  /**
   * Sorgunun gömüsünü alıp defterdeki vektörlerle karşılaştırır.
   *
   * Gömü kapalıysa ya da bir sorun çıkarsa boş harita dönüyor: anlam
   * araması bir EK, arama onsuz da çalışmaya devam ediyor.
   */
  const yakinlariBul = async (soru: string): Promise<Map<string, number>> => {
    if (!durum.sorguGom) return new Map()
    try {
      const v = await durum.sorguGom(soru)
      if (!v) return new Map()
      const sorgu = paketiAc(paketle(v))
      if (!sorgu) return new Map()
      const indeks = await depo.gomular(MODEL_KIMLIK)
      const cozulmus: [string, Int8Array][] = []
      for (const [id, kod] of indeks) {
        const k = paketiAc(kod)
        if (k) cozulmus.push([id, k])
      }
      return new Map(enYakinlar(sorgu, cozulmus).map((y) => [y.kayitId, y.puan]))
    } catch (e) {
      console.warn('[defter] anlam araması atlandı', e)
      return new Map()
    }
  }

  /**
   * Model çağrısının kağıttaki yüzü.
   *
   * Düğme SORGU ÇÖZÜLDÜKTEN SONRA çıkıyor ve ayrı bir dokunuş istiyor:
   * arama tamamen cihazda bitti, dışarı çıkmak kullanıcının ayrı ve açık
   * eylemi (ilke 2.3). Ne gideceği düğmenin altında sayıyla yazılı.
   */
  const modelBolumu = (anlatim: Anlatim | null): string => {
    if (!model?.acik || !anlatim) return ''
    const n = anlatim.kayitlar.length
    return `<div class="model-alan">
      <button id="modelYaz" class="model-dugme">bu ${n} kayıttan bir cevap yaz</button>
      <div class="model-uyari">Yalnızca yukarıdaki ${n} kaydın metni Anthropic'e gider —
        defterin geri kalanı, adı, başlıkları, fotoğrafları gitmez. Anahtar senin.</div>
      <div id="modelCevap"></div>
    </div>`
  }

  const modelBagla = (anlatim: Anlatim | null): void => {
    const dugme = document.querySelector<HTMLButtonElement>('#modelYaz')
    if (!dugme || !anlatim || !model) return
    dugme.onclick = async () => {
      dugme.disabled = true
      dugme.textContent = 'yazıyor…'
      const kutu = $('#modelCevap')
      kutu.innerHTML = `<div class="model-et">model yazdı · kaynaklar yukarıda</div><p></p>`
      const p = kutu.querySelector('p')!
      let metin = ''
      try {
        await model.sor(anlatim, (par) => {
          metin += par
          p.textContent = metin
        })
        dugme.remove()
      } catch (e) {
        kutu.innerHTML = `<div class="model-hata">${kacir(
          e instanceof Error ? e.message : 'Cevap alınamadı.',
        )}</div>`
        dugme.disabled = false
        dugme.textContent = 'yeniden dene'
      }
    }
  }

  const cevapCiz = async (soru: string): Promise<void> => {
    const kutu = $('#cevapAlan')
    if (!soru.trim()) {
      kutu.innerHTML = ''
      return
    }
    const c = soruCoz(soru, durum.gunler, durum.temalar, durum.kenarlar, await yakinlariBul(soru))
    if (c.bos) {
      kutu.innerHTML = `<div class="cevap"><div class="et">cevap</div>
        <p>Bununla ilgili bir şey yazmamışsın. Yazmadığın bir şeyi uydurmam.</p></div>`
      return
    }
    /*
     * Modele gidecek kayıtlar ile kullanıcıya gösterilen kaynaklar AYNI
     * liste ve aynı numarayı taşıyor: cevaptaki [2], karttaki [2]. İlke
     * 2.4'ün somut hâli bu numara (K-031).
     */
    const anlatim = model?.acik ? anlatimKur(soru, c.kullanilan) : null
    const numara = new Map(anlatim?.kayitlar.map((k) => [k.kayitId, k.no]) ?? [])
    kutu.innerHTML = `<div class="cevap"><div class="et">yalnızca senin yazdıklarından</div>
      ${c.paragraflar.map((x) => `<p>${x}</p>`).join('')}
      <div class="k-et">kullandığım kayıtlar</div>
      ${c.kullanilan.map((b) => kaynakHtml(b, numara.get(b.kayit.id))).join('')}
      <p class="cevap-not">Kaydın üstüne dokun, defterde o sayfaya gider.</p>
      ${modelBolumu(anlatim)}</div>`
    kaynakBagla(kutu, c.terim, c.govdeler)
    modelBagla(anlatim)
  }

  const gecenYilCiz = (): void => {
    const kap = $('#gecenYil')
    if (!durum.gunler.length) {
      kap.innerHTML = ''
      return
    }
    const sonGun = durum.gunler[durum.gunler.length - 1]!
    const b = new Date(sonGun.tarih + 'T12:00')
    b.setFullYear(b.getFullYear() - 1)
    const hedef = iso(b)
    const g =
      durum.gunler.find((x) => x.tarih === hedef) ??
      durum.gunler.find((x) => Math.abs(+new Date(x.tarih + 'T12:00') - +b) < 4 * 864e5)
    if (!g) {
      kap.innerHTML = ''
      return
    }
    kap.innerHTML = `<div class="gecen-yil"><div class="et">bugün, geçen sene</div>
      ${g.kayitlar
        .map(
          (k) => `<div class="gy-kayit" data-id="${k.id}">
            <time>${gunAdi(g.tarih)} · ${tamTarih(g.tarih)} · ${k.saat}</time>
            <p>${kacir(k.metin)}</p></div>`,
        )
        .join('')}</div>`
    kaynakBagla(kap, '')
  }

  $('#sorBtn').onclick = () => void cevapCiz($<HTMLInputElement>('#soruKutu').value)
  $('#soruKutu').addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') void cevapCiz((e.target as HTMLInputElement).value)
  })
  for (const b of $$('nav button')) b.onclick = () => ekranAc(b.dataset.ekran as 'defter')

  return { gecenYilCiz }
}
