import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AwakeningClient } from './AwakeningClient';

export const metadata: Metadata = {
  title: 'Uyanış',
};

export default function AwakeningPage() {
  return (
    <Suspense>
      <AwakeningClient />
    </Suspense>
  );
}
