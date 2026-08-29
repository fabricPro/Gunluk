/**
 * Dosya kaydetme ve okuma.
 *
 * Tarayıcıda indirme, cihazda paylaşım sayfası. Her ikisi de kullanıcının
 * açık eylemiyle — dosya nereye gideceğine kullanıcı karar veriyor, bizim
 * sunucumuz yok (ilke 2.3).
 */

const nativeMi = (): boolean =>
  !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

export async function dosyaKaydet(ad: string, icerik: string, tur: string): Promise<void> {
  if (nativeMi()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    await Filesystem.writeFile({
      path: ad,
      data: icerik,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    const { uri } = await Filesystem.getUri({ path: ad, directory: Directory.Cache })
    await Share.share({ title: ad, url: uri })
    return
  }
  const bag = URL.createObjectURL(new Blob([icerik], { type: tur }))
  const a = document.createElement('a')
  a.href = bag
  a.download = ad
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(bag), 4000)
}

/** Kullanıcıdan dosya ister; vazgeçerse null. */
export function dosyaSec(kabul: string): Promise<string | null> {
  return new Promise((coz) => {
    const g = document.createElement('input')
    g.type = 'file'
    g.accept = kabul
    g.style.display = 'none'
    g.onchange = () => {
      const d = g.files?.[0]
      if (!d) return coz(null)
      const okuyucu = new FileReader()
      okuyucu.onload = () => coz(String(okuyucu.result))
      okuyucu.onerror = () => coz(null)
      okuyucu.readAsText(d)
      g.remove()
    }
    document.body.appendChild(g)
    g.click()
  })
}

/** Kullanıcıdan bir görsel ister; vazgeçerse null. */
export function resimSec(): Promise<File | null> {
  return new Promise((coz) => {
    const g = document.createElement('input')
    g.type = 'file'
    /* Capacitor WebView'inde bu iOS'ta da Android'de de kamerayı sunuyor;
       ayrı bir native eklenti ve ayrı bir izin gerekmiyor. */
    g.accept = 'image/*'
    g.style.display = 'none'
    g.onchange = () => {
      coz(g.files?.[0] ?? null)
      g.remove()
    }
    document.body.appendChild(g)
    g.click()
  })
}

/** 'defter-yedek-2026-08-29' gibi bir dosya adı gövdesi. */
export const dosyaAdi = (on: string): string =>
  `${on}-${new Date().toISOString().slice(0, 10)}`
