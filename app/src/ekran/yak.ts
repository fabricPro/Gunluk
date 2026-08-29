/**
 * YAKILAN SAYFA — ilke 2.2.
 *
 * Bu modül bilerek hiçbir veri katmanını import etmez: ne depo, ne
 * veritabanı, ne ayar, ne localStorage. Yazılan metin diske değmez,
 * belleğe kalıcı düşmez ve SAYAÇ BİLE TUTULMAZ. "Kaç kez yaktın" bilgisi
 * bile bu sözü bozar.
 *
 * Bu dosyaya bir import eklemeden önce test/yakma.test.ts'i oku: orada
 * bu modülün veri katmanına dokunmadığını ve yazılan metnin dosyalara
 * sızmadığını doğrulayan testler var.
 */
import { $ } from './ortak.js'

const kacirYerel = (m: string): string =>
  m.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

function korSac(n: number): void {
  const kap = $('#korlar')
  const r = $('#yakAlan').getBoundingClientRect()
  for (let i = 0; i < n; i++) {
    const e = document.createElement('i')
    e.style.left = r.left + Math.random() * r.width + 'px'
    e.style.top = r.top + r.height * (0.3 + Math.random() * 0.6) + 'px'
    e.style.setProperty('--kx', Math.random() * 90 - 45 + 'px')
    e.style.animationDelay = (Math.random() * 1.1).toFixed(2) + 's'
    kap.appendChild(e)
    setTimeout(() => e.remove(), 3400)
  }
}

/** Tamponu her yerden temizler — vazgeçmede de, yakmada da. */
function tamponuSil(): void {
  const alan = $<HTMLTextAreaElement>('#yakYazi')
  alan.value = ''
  $('#yakGoster').innerHTML = ''
}

export function yakmayiBagla(): void {
  const alan = () => $<HTMLTextAreaElement>('#yakYazi')

  $('#yakBtn').onclick = () => {
    $('#yak').classList.add('acik')
    tamponuSil()
    alan().style.display = ''
    $('#yakGoster').style.display = 'none'
    $('#yakSon').style.display = 'none'
    $('#yakAltlik').style.display = 'flex'
    $('#yakAlan').classList.remove('yaniyor')
    $('#yakAlan').style.display = ''
    setTimeout(() => alan().focus(), 80)
  }

  $('#yakVaz').onclick = () => {
    $('#yak').classList.remove('acik')
    tamponuSil()
  }

  $('#yakBas').onclick = () => {
    const m = alan().value
    if (!m.trim()) {
      $('#yak').classList.remove('acik')
      tamponuSil()
      return
    }
    const g = $('#yakGoster')
    g.innerHTML = [...m].map((c) => (c === '\n' ? '<br>' : `<span>${kacirYerel(c)}</span>`)).join('')
    /* Tampon burada boşaltılıyor: gösterilen şey artık yalnızca DOM'da. */
    alan().value = ''
    alan().style.display = 'none'
    g.style.display = ''
    $('#yakAltlik').style.display = 'none'

    /* 1 — harfler kül olur */
    for (const h of g.querySelectorAll<HTMLElement>('span')) {
      h.style.animationDelay = (Math.random() * 1.3).toFixed(2) + 's'
      h.classList.add('kul')
    }
    /* 2 — kağıdın kendisi tutuşur ve ekrandan çıkar */
    setTimeout(() => {
      g.innerHTML = ''
      $('#yakAlan').classList.add('yaniyor')
      korSac(26)
    }, 2300)
    setTimeout(() => {
      $('#yakAlan').style.display = 'none'
      $('#yakSon').style.display = 'block'
    }, 4400)
    setTimeout(() => {
      $('#yak').classList.remove('acik')
      tamponuSil()
    }, 7000)
    /* Hiçbir yere yazılmıyor. Sayaç da tutulmuyor. Bilerek. */
  }

  /* Uygulama arka plana alınırken yakma ekranı anlık görüntüde kalmasın. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && $('#yak').classList.contains('acik')) {
      $('#yak').classList.remove('acik')
      tamponuSil()
    }
  })
}
