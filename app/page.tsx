import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveLanguage } from '@/lib/i18n/server';

export default async function HomePage() {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  const preferred = acceptLanguage.split(',')[0];
  const lang = resolveLanguage(preferred);
  redirect(`/${lang}`);
}
