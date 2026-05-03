import type { Metadata } from 'next';
import { Orbitron, Rajdhani } from 'next/font/google';
import './globals.css';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Nebula Dominion',
  description: 'Uzay strateji oyunu — çağ bazlı ilerleme sistemi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${orbitron.variable} ${rajdhani.variable}`}>
      <body className="stars-bg">{children}</body>
    </html>
  );
}
