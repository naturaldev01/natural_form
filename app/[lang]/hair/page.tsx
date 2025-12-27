import { SUPPORTED_LANGUAGES } from '@/lib/i18n/translations';
import { notFound, redirect } from 'next/navigation';

interface LocaleHairPageProps {
  params: Promise<{
    lang: string;
  }>;
}

export default async function LocaleHairPage({ params }: LocaleHairPageProps) {
  const { lang } = await params;
  const isSupported = SUPPORTED_LANGUAGES.some((l) => l.code === lang);
  if (!isSupported) {
    notFound();
  }

  redirect(`/${lang}/teeth`);
}

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang: lang.code }));
}
