import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';

const APP_TITLE = 'Natural Clinic AI Smile & Hair Preview Studio - Natural Clinic';
const APP_DESCRIPTION = 'Upload your photos and preview professional teeth whitening or hair makeover simulations powered by Natural Clinic’s AI design studio.';

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  icons: {
    icon: '/assets/logo.png',
    shortcut: '/assets/logo.png',
    apple: '/assets/logo.png',
  },
  openGraph: {
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    siteName: 'Natural Clinic AI Studio',
    images: ['/assets/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: ['/assets/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
