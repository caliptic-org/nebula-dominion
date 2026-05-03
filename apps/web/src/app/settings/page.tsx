import type { Metadata } from 'next';
import { SettingsClient } from './SettingsClient';

export const metadata: Metadata = {
  title: 'Ayarlar',
  description: 'Ses, grafik, dil, bildirim ve hesap ayarlarını yönet.',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
