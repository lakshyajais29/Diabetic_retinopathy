import type { Metadata } from 'next';
import { DistrictConsole } from '@/components/district/DistrictConsole';

export const metadata: Metadata = {
  title: 'District model',
  description:
    'Operational model of a district DR screening programme: demand, specialist capacity, queue and impact.',
};

export default function DistrictPage() {
  return <DistrictConsole />;
}
