import { Metadata } from 'next';
import { FormationScreen } from '@/components/formation/FormationScreen';

export const metadata: Metadata = {
  title: 'Formasyon Kurma — Nebula Dominion',
  description: 'Komutanlarını ve birimlerini seç, formasyonunu kur, savaş gücünü artır.',
};

export default function FormationPage() {
  return <FormationScreen />;
}
