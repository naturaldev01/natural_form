import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: 'Teeth Transformation Preview | Natural Clinic',
  description:
    'Upload your photos and preview professional teeth transformations powered by Natural Clinic’s AI design studio.',
};

export default function TeethPage() {
  return <LandingPage initialTreatmentType="teeth" />;
}
