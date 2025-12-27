import LandingPage from '@/components/LandingPage';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/translations';
import { notFound } from 'next/navigation';

interface LocalePageProps {
  params: Promise<{
    lang: string;
  }>;
}

export default async function LocalePage({ params }: LocalePageProps) {
  const { lang: locale } = await params;
  const supported = SUPPORTED_LANGUAGES.some((lang) => lang.code === locale);
  if (!supported) {
    notFound();
  }

  return <LandingPage />;
}

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang: lang.code }));
}
