import { Metadata } from 'next';
import { FormationScreen } from '@/components/formation/FormationScreen';

export const metadata: Metadata = {
  title: 'Formasyon Kurma — Nebula Dominion',
  description: 'Komutanlarını ve birimlerini seç, formasyonunu kur, savaş gücünü artır.',
};

// TODO(auth): replace with the authenticated session's playerId once auth is wired.
// Backend formation endpoints validate `playerId` as a UUID, so a stable demo UUID
// is used until session-based identification is available.
const DEMO_PLAYER_ID = '00000000-0000-4000-8000-000000000001';

export default function FormationPage() {
  return <FormationScreen playerId={DEMO_PLAYER_ID} />;
}
