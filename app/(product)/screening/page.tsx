import type { Metadata } from 'next';
import { ScreeningWorkspace } from '@/components/screening/ScreeningWorkspace';

export const metadata: Metadata = {
  title: 'Screening workspace',
  description:
    'Upload a fundus photograph and follow all seven pipeline stages as they run.',
};

export default function ScreeningPage() {
  return <ScreeningWorkspace />;
}
