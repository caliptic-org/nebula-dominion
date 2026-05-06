import type { Metadata } from 'next';
import { BaseScreen } from '@/components/game/base-v2/BaseScreen';

export const metadata: Metadata = {
  title: 'Ana Üs · v2',
  description: 'AoE4/SC2 standardında izometrik ana üs yönetimi: tıklanabilir yapılar, üretim kuyruğu, command card, minimap.',
};

export default function BaseV2Page() {
  return <BaseScreen />;
}
