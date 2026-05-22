import type { Metadata } from 'next';
import { RaceSelectClient } from './RaceSelectClient';

export const metadata: Metadata = {
  title: 'Irk Seçimi',
};

export default function RaceSelectPage() {
  return <RaceSelectClient />;
}
