import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Natural Clinic - Discover Your Perfect Transformation',
  description: 'See how our treatments can enhance your natural beauty',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

