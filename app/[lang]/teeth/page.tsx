import TeethPage from '@/app/teeth/page';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/translations';
import { notFound } from 'next/navigation';

interface LocaleTeethPageProps {
  params: Promise<{
    lang: string;
  }>;
}

export default async function LocaleTeethPage({ params }: LocaleTeethPageProps) {
  const { lang } = await params;
  const isSupported = SUPPORTED_LANGUAGES.some((l) => l.code === lang);
  if (!isSupported) {
    notFound();
  }

  return <TeethPage />;
}

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang: lang.code }));
}
