import type { Metadata } from 'next';
import { AwakeningClient } from './AwakeningClient';

export const metadata: Metadata = {
  title: 'Uyanış',
};

export default function AwakeningPage() {
  return <AwakeningClient />;
}
