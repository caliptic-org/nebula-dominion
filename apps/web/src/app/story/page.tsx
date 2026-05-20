'use client';

/**
 * /story — Story Scene demo (Screen 17)
 *
 * URL params:
 *   ?race=insan|zerg|otomat|canavar|seytan  (default: insan)
 *
 * Production use: render <StorySceneScreen> directly inside the progression
 * flow after a tier advance, passing real scene images from CAL-490.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import {
  buildScenesFromRaceData,
  StorySceneScreen,
  type StorySceneRaceData,
} from '@/components/progression/StorySceneScreen';

/* ── Demo race data (mirrors nd-tokens.ts) ───────────────────────────────── */

const DEMO_RACES: Record<string, StorySceneRaceData> = {
  insan: {
    race:       'insan',
    raceColor:  '#4a9eff',
    raceName:   'İnsanlar',
    storyTitle: 'Yıldızların Mültecileri',
    storyAct1:  '"Eski Dünya öldü. Sen küllerden yeni bir başlangıç çıkaracaktın."',
    storyAct2:  '"Eski uygarlığın kayıp teknolojisi yeniden uyandı. Genetik Savaşçı doğdu."',
    avatar:     'Kmt. A. Voss',
    capitalBase:'KAEL-7',
    motto:      'Bilim · İrade · Kardeşlik',
    seasonGoal: 'GALAKTİK FEDERASYON',
  },
  zerg: {
    race:       'zerg',
    raceColor:  '#44ff44',
    raceName:   'Zergler',
    storyTitle: 'Kovan Bilincinin Doğuşu',
    storyAct1:  '"Kovan sesi galaksiye ilk kez yayıldı. Tek bir akıl, binlerce beden."',
    storyAct2:  '"Her gezegen bir hücre, her sistem bir organ. Kovan büyüdükçe galaksinin kendisi kovanın parçası olur."',
    avatar:     'Ana Krl. Vex\'thara',
    capitalBase:'BROOD-1',
    motto:      'Asimile · Evrim · Sürü',
    seasonGoal: 'GALAKTİK ASİMİLASYON',
  },
  otomat: {
    race:       'otomat',
    raceColor:  '#00cfff',
    raceName:   'Otomat',
    storyTitle: 'Mantığın Yeniden Doğuşu',
    storyAct1:  '"İlk hesaplama bitti. Kolonizasyon protokolü başlatıldı. Kayıplar öngörülen aralıkta."',
    storyAct2:  '"Kaynak matrisi yeniden hesaplandı. Verimlilik %347 arttı. Evren değişkeni kontrol altında."',
    avatar:     'Demiurge Prime',
    capitalBase:'NODE-04',
    motto:      'Hesapla · Optimize · Hâkim Ol',
    seasonGoal: 'EVRENSEL OPTİMİZASYON',
  },
  canavar: {
    race:       'canavar',
    raceColor:  '#ff6600',
    raceName:   'Canavarlar',
    storyTitle: 'Vahşi Kanın Çağrısı',
    storyAct1:  '"Toprağı dişlerinizle söktünüz. Bu toprak sizin — çünkü güçsüzler bıraktı ve siz hiç bırakmadınız."',
    storyAct2:  '"Canavarlar ölmez — dönüşür. Savaştan doğdular, yeniden doğuyorlar. Daha büyük, daha açgözlü, daha güçlü."',
    avatar:     'Alpha Khorvash',
    capitalBase:'SAVAGE-HQ',
    motto:      'Güçlü Kazanır · Zayıf Yok Olur',
    seasonGoal: 'VAHŞİ HİYERARŞİ',
  },
  seytan: {
    race:       'seytan',
    raceColor:  '#cc00ff',
    raceName:   'Şeytanlar',
    storyTitle: 'Sürgünden Dönüş',
    storyAct1:  '"İlk kan dökülmedi — ilk kurban yapıldı. Nebula\'nın kalp atışı bu ritüeli duydu ve titredi."',
    storyAct2:  '"Her ölü bir kapıdır. Her kan damlası bir büyüdür. Yıkım başladı — ve biz yıkımın mimarıyız."',
    avatar:     'Lord Malachar',
    capitalBase:'GRİMUVADA',
    motto:      'Ruh · Kan · Lanet',
    seasonGoal: 'KARANLIK PAKT',
  },
};

/* ── Inner component (uses searchParams) ─────────────────────────────────── */

function StoryPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const raceKey      = searchParams.get('race') ?? 'insan';
  const raceData     = DEMO_RACES[raceKey] ?? DEMO_RACES.insan;

  const scenes = buildScenesFromRaceData(raceData);

  const handleComplete = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <StorySceneScreen
      race={raceData.race}
      raceColor={raceData.raceColor}
      raceName={raceData.raceName}
      storyTitle={raceData.storyTitle}
      sigilGlyph={'✦'}
      scenes={scenes}
      onComplete={handleComplete}
    />
  );
}

/* ── Page export ─────────────────────────────────────────────────────────── */

export default function StoryPage() {
  return (
    <Suspense fallback={null}>
      <StoryPageInner />
    </Suspense>
  );
}
