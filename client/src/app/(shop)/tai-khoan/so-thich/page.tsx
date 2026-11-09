import type { Metadata } from 'next';
import { PreferencePage } from '@/features/recommendation';

export const metadata: Metadata = { title: 'Sở thích đọc sách' };

export default function MyPreferencesPage() {
  return <PreferencePage />;
}
