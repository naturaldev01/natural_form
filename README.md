# Natural Clinic - Next.js

A Next.js application for natural.clinic that uses Gemini Nano-Banana API for image transformation.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Environment Variables

Make sure you have a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── components/
│   ├── ConsultationForm.tsx
│   └── ResultsDisplay.tsx
└── lib/
    └── supabase.ts     # Supabase client
```

## Features

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Supabase integration
- Gemini Nano-Banana API for image transformation

