import { DoctorConsole } from '@/components/admin/DoctorConsole';

export const metadata = {
  title: 'Doctor Console | RetinaSetu',
  description: 'Ophthalmologist referral queue and patient sign-off portal.',
};

export default function AdminPage() {
  return <DoctorConsole />;
}
