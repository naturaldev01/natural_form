# Natural Clinic - AI Transformation Platform

Natural Clinic için geliştirilmiş diş ve saç transformasyon simülasyonu platformu.

## 🚀 Özellikler

- ✅ Çoklu fotoğraf yükleme
- ✅ Gemini AI ile gerçekçi transformasyon simülasyonu
- ✅ VITA renk kılavuzu ile diş rengi seçimi
- ✅ 12 farklı gülüş stili
- ✅ PDF olarak sonuç indirme
- ✅ Email ile sonuç gönderme
- ✅ **WhatsApp ile hızlı iletişim**
- ✅ Supabase ile veri saklama
- ✅ Responsive tasarım

## 📋 Gereksinimler

- Node.js 18+
- npm veya yarn
- Gemini API Key
- Supabase hesabı
- WhatsApp Business numarası (opsiyonel)
- Resend API Key (email için, opsiyonel)

## 🔧 Kurulum

1. **Projeyi klonlayın veya indirin**

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Environment değişkenlerini ayarlayın:**

`.env.local` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
# Gemini API Key (server-side için)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini API Key (client-side için - opsiyonel)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# WhatsApp Business Telefon Numarası (ülke kodu ile, + olmadan)
# Örnek Türkiye: 905551234567
# Örnek ABD: 15551234567
NEXT_PUBLIC_WHATSAPP_NUMBER=905551234567

# Email API Key (Resend için - opsiyonel)
RESEND_API_KEY=your_resend_api_key_here
```

4. **Supabase yapılandırması:**

Supabase projenizde aşağıdaki yapıların oluşturulduğundan emin olun:

- **Storage Bucket:** `consultation-images` (public)
- **Database Table:** `consultations` tablosu
- Migration dosyası zaten `supabase/migrations/` klasöründe mevcut

5. **Development server'ı başlatın:**
```bash
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışacaktır.

## 🔑 API Anahtarlarını Alma

### Gemini API Key
1. [Google AI Studio](https://makersuite.google.com/app/apikey) adresine gidin
2. "Create API Key" butonuna tıklayın
3. API anahtarını kopyalayın ve `.env.local` dosyasına ekleyin

### Supabase
1. [Supabase Dashboard](https://app.supabase.com/) üzerinden projenize gidin
2. Settings > API menüsünden:
   - Project URL: `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### WhatsApp Business Numarası
1. WhatsApp Business uygulamanızı açın
2. Telefon numaranızı ülke kodu ile alın (+ olmadan)
3. Örnek: Türkiye için `90` + `555 123 4567` = `905551234567`
4. `.env.local` dosyasına ekleyin

### Resend API (Email için)
1. [Resend](https://resend.com/) hesabı oluşturun
2. API Keys bölümünden yeni bir key oluşturun
3. `.env.local` dosyasına ekleyin

## 📱 WhatsApp Entegrasyonu

WhatsApp butonu tıklandığında:
- Kullanıcının WhatsApp uygulaması açılır
- Önceden tanımlanmış bir mesaj şablonu yüklenir
- Mesajda kullanıcının adı, tercih ettiği diş rengi ve gülüş stili bulunur
- Kullanıcı istediği numaraya (sizin WhatsApp Business numaranıza) mesaj gönderebilir

**WhatsApp numarasını değiştirmek için:**
```env
NEXT_PUBLIC_WHATSAPP_NUMBER=905551234567
```

## 🎨 Diş Renkleri (VITA Kılavuzu)

Platform aşağıdaki VITA renk kılavuzu tonlarını destekler:
- **0M Serisi:** Profesyonel beyazlatma tonları (0M1, 0M2, 0M3)
- **A Serisi:** Kırmızımsı-kahverengi tonlar (A1, A2, A3, A3.5, A4)
- **B Serisi:** Sarımsı tonlar (B1, B2, B3, B4)
- **C Serisi:** Gri tonlar (C1, C2, C3, C4)
- **D Serisi:** Kırmızımsı-gri tonlar (D2, D3, D4)

## 😊 Gülüş Stilleri

12 farklı profesyonel gülüş stili:
- Aggressive Style
- Dominant Style
- Enhanced Style
- Focused Style
- Functional Style
- Hollywood Style
- Mature Style
- Natural Style
- Oval Style
- Softened Style
- Vigorous Style
- Youthful Style

## 🏗️ Proje Yapısı

```
project/
├── app/
│   ├── api/
│   │   ├── transform-image/    # Gemini API entegrasyonu
│   │   ├── send-pdf/           # Email gönderme
│   │   └── image-proxy/        # Resim proxy'si
│   ├── page.tsx                # Ana sayfa
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global stiller
├── components/
│   ├── ConsultationForm.tsx    # Form bileşeni
│   └── ResultsDisplay.tsx      # Sonuç gösterimi
├── lib/
│   └── supabase.ts             # Supabase client
├── public/
│   └── assets/                 # Statik dosyalar
├── supabase/
│   └── migrations/             # Database migrations
└── .env.local                  # Environment variables (oluşturmanız gerekli)
```

## 🚀 Production Deployment

### Vercel'e Deploy

1. Vercel hesabınıza giriş yapın
2. Projeyi import edin
3. Environment variables'ı ekleyin
4. Deploy edin

### Environment Variables (Production)

Production'da aşağıdaki environment variables'ları eklemeyi unutmayın:
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GEMINI_API_KEY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `RESEND_API_KEY`

## 🛠️ Teknolojiler

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **AI:** Google Gemini 2.0 Flash Exp
- **Backend:** Supabase (Database + Storage)
- **Email:** Resend
- **Icons:** Lucide React
- **PDF:** Custom PDF generator

## 📝 Notlar

- Gemini API'nin rate limit'leri vardır
- Ücretsiz tier'da günlük istek limiti bulunur
- WhatsApp Business API yerine WhatsApp URL scheme kullanılmıştır
- Tüm fotoğraflar Supabase Storage'da saklanır
- GDPR uyumlu consent formu mevcuttur

## 🐛 Sorun Giderme

### "Gemini API quota exceeded" hatası
- API anahtarınızın limitlerini kontrol edin
- [Google AI Studio](https://ai.google.dev/) üzerinden kullanımınızı inceleyin

### WhatsApp açılmıyor
- Telefon numarasının doğru formatta olduğundan emin olun (+ olmadan)
- Tarayıcınızın popup'ları engellediğinden emin olun

### Email gönderilmiyor
- Resend API key'inizin doğru olduğundan emin olun
- Resend'de domain doğrulaması yapın

## 📧 İletişim

Natural Clinic - [www.natural.clinic](https://www.natural.clinic)

## 📄 License

Bu proje Natural Clinic için özel olarak geliştirilmiştir.
