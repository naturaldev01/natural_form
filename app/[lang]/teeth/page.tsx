import TeethPage from '@/app/teeth/page';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/translations';
import { notFound } from 'next/navigation';

interface LocaleTeethPageProps {
  params: {
    lang: string;
  };
}

export default function LocaleTeethPage({ params }: LocaleTeethPageProps) {
  const isSupported = SUPPORTED_LANGUAGES.some((lang) => lang.code === params.lang);
  if (!isSupported) {
    notFound();
  }

  return <TeethPage />;
}

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang: lang.code }));
}
