## 2025-12-08
- Saç işlemi için base ve control prompt’larını güncelledim: yaş/proporsiyon uygunluğu, alın sınırı (≤1–1.5 cm brow üstü), temporal koruma, “helmet” önleme, renk/doku kilidi ve konservatif Norwood II emniyet kuralı eklendi.
- Klinik analiz yoksa konservatif Norwood II fallback planı eklendi; klinik analiz varsa “hard limits” ile birlikte birebir uygulanması belirtildi.
- Saç üretimi sıcaklığı 0.30’a düşürüldü (daha deterministik).
- Promptlar sertleştirildi: native saç kalınlaştırma yasağı, ışık/temporal miniaturization tespiti, helmet karşıtı taper, renk/ton kilidi, minimal kayıpta “dokunma”.
- Hard limits/fallback güncellendi: sadece görünür veya şüpheli miniaturized alana greft ekle; Norwood II konservatif sınır; kayıp yoksa orijinali döndür.
- Sol/sağ simetri kuralı eklendi: hairline ve yoğunluk doğal tolerans içinde dengeli tutulacak, tek tarafa fazla doldurma engellendi.
- Diş için QA katmanı eklendi: Gemini ile before/after karşılaştırıp dişler değişmediyse veya shade/style görünmüyorsa boost edilmiş prompt ve 0.55 sıcaklıkla ikinci deneme yapılacak.

