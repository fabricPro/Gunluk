# yayin/

Mağaza yayını için gereken her şey. Kod değil, **kodun beyanı**: buradaki
her cümlenin karşılığı uygulamada bir davranıştır.

| Dosya | Ne |
|---|---|
| `MAGAZA.md` | App Store / Play Store metinleri, gizlilik etiketleri, yaş sınırı cevapları, App Review notu |
| `gizlilik.md` | Gizlilik politikası (TR + EN) — bir adreste yayınlanması gerekiyor |
| `gorsel/` | Ekran görüntüleri — `npm run gorsel` ile üretiliyor, elle çekilmiyor |

Arayüz değiştiğinde `npm run gorsel` yeniden koşturulur; beyan değiştiren
bir kod değişikliğinde `MAGAZA.md` ve `gizlilik.md` de güncellenir. Bu
ikisi eskirse mağazada yanlış beyan veriyor oluruz.
