import type { Metadata } from 'next';
import { ProfileClient } from './ProfileClient';

export const metadata: Metadata = {
  title: 'Profil — Nebula Dominion',
  description: 'Oyuncu profili, istatistikler ve başarımlar',
};

export default function ProfilePage() {
  return <ProfileClient />;
}
