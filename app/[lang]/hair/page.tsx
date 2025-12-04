import HairPage from '@/app/hair/page';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/translations';
import { notFound } from 'next/navigation';

interface LocaleHairPageProps {
  params: {
    lang: string;
  };
}

export default function LocaleHairPage({ params }: LocaleHairPageProps) {
  const isSupported = SUPPORTED_LANGUAGES.some((lang) => lang.code === params.lang);
  if (!isSupported) {
    notFound();
  }

  return <HairPage />;
}

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang: lang.code }));
}
