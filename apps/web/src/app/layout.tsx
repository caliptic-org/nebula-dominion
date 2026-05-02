import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nebula Dominion',
  description: 'Tier sistemi ile çağ bazlı ilerleme',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
