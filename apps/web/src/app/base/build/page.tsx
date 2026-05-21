import type { Metadata } from 'next';
import { BuildMenu } from '@/components/game/build-menu/BuildMenu';

export const metadata: Metadata = {
  title: 'İnşa Kataloğu · Nebula Dominion',
  description:
    'İnşaa menüsü: ırka özgü katalog, kategori sekmeleri, çift-bezelli yapı kartları, ilerleme barı ve aksiyon çubuğu.',
};

export default function BaseBuildPage() {
  return <BuildMenu />;
}
