import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: 'Hair Transformation Preview | Natural Clinic',
  description:
    'See how Natural Clinic’s AI studio can redesign your hairstyle. Upload photos and preview stunning results.',
};

export default function HairPage() {
  return <LandingPage initialTreatmentType="hair" />;
}
