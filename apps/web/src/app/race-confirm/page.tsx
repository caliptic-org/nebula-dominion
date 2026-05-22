import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RaceConfirmClient } from './RaceConfirmClient';

export const metadata: Metadata = {
  title: 'Uyanış',
};

export default function RaceConfirmPage() {
  return (
    <Suspense>
      <RaceConfirmClient />
    </Suspense>
  );
}
