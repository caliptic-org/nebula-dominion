import type { Metadata } from 'next';
import { SplashClient } from './SplashClient';

export const metadata: Metadata = {
  title: 'Açılış',
};

export default function SplashPage() {
  return <SplashClient />;
}
