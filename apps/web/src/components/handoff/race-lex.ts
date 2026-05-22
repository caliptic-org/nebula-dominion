/* Nebula Dominion — Race lexicon
 * TS mirror of RACE_LEX from nd-race-atoms.jsx. Each race has its own
 * VOCABULARY for progression — not just colours. Screens read action verbs,
 * production/merge labels, tab strips, and quick-action sets from here so
 * Turkish flavour text matches the handoff prototype 1:1.
 */
import type { NDRaceKey } from './nd-tokens';

export type NDTierKind = 'mil' | 'morph' | 'version' | 'blood' | 'seal';
export type NDTimeKind = 'countdown' | 'embryo' | 'tick' | 'phase' | 'ritual';

export type NDQuickActionIcon =
  | 'hammer' | 'helmet' | 'star'
  | 'egg' | 'helix' | 'spiral'
  | 'gear' | 'cpu' | 'fuse'
  | 'claw' | 'fang' | 'jaw'
  | 'sigil' | 'flame' | 'rune'
  | 'roster';

export interface NDQuickAction {
  key: string;
  label: string;
  icon: NDQuickActionIcon;
}

export interface NDRaceLex {
  actionVerb: string;
  productionVerb: string;
  mergeVerb: string;
  fieldName: string;
  catalogName: string;
  productionName: string;
  mergeName: string;
  rosterName: string;
  tierKind: NDTierKind;
  timeKind: NDTimeKind;
  levelLabel: string;
  statusOk: string;
  statusBuild: string;
  buildTabs: readonly string[];
  productionTabs: readonly string[];
  quickActions: readonly NDQuickAction[];
  morphHint: string;
  verticalFlow: string;
}

export const RACE_LEX: Record<NDRaceKey, NDRaceLex> = {
  insan: {
    actionVerb: 'İNŞA', productionVerb: 'EĞİT', mergeVerb: 'TERFI',
    fieldName: 'KOMUTA SEKTÖRÜ', catalogName: 'YAPI KATALOĞU',
    productionName: 'KIŞLA · EĞİTİM HATTI', mergeName: 'PROMOSYON SALONU',
    rosterName: 'TUGAY ENVANTERİ',
    tierKind: 'mil', timeKind: 'countdown',
    levelLabel: 'KOMUTAN LV', statusOk: 'OPERASYONEL', statusBuild: 'İNŞA',
    buildTabs: ['Tümü', 'Ekonomi', 'Askeri', 'Bilim', 'Subspace'],
    productionTabs: ['Tümü', 'Piyade', 'Mecha', 'Komutan', 'Filo'],
    quickActions: [
      { key: 'build',  label: 'İNŞA',     icon: 'hammer' },
      { key: 'prod',   label: 'EĞİT',     icon: 'helmet' },
      { key: 'merge',  label: 'TERFI',    icon: 'star'   },
      { key: 'roster', label: 'TUGAY',    icon: 'roster' },
    ],
    morphHint: 'BLUEPRINT', verticalFlow: 'Sıralı dağıtım',
  },
  zerg: {
    actionVerb: 'MUTASYON', productionVerb: 'DOĞUR', mergeVerb: 'EVRİMLE',
    fieldName: 'KOVAN HARİTASI', catalogName: 'GENOM AĞACI',
    productionName: 'LARVA HAVUZU', mergeName: 'EVRİM ÇUKURU',
    rosterName: 'SÜRÜ TABLOSU',
    tierKind: 'morph', timeKind: 'embryo',
    levelLabel: 'EVRİM AŞ.', statusOk: 'CANLI', statusBuild: 'GEBE',
    buildTabs: ['Tümü', 'Et', 'Çukur', 'Damar', 'Brood'],
    productionTabs: ['Tümü', 'Larva', 'Avcı', 'Mutasyon', 'Brood'],
    quickActions: [
      { key: 'spawn',  label: 'DOĞUR',    icon: 'egg'    },
      { key: 'mutate', label: 'MUTASYON', icon: 'helix'  },
      { key: 'merge',  label: 'EVRİMLE',  icon: 'spiral' },
      { key: 'roster', label: 'SÜRÜ',     icon: 'roster' },
    ],
    morphHint: 'GENOM', verticalFlow: 'Damar akışı',
  },
  otomat: {
    actionVerb: 'MONTAJ', productionVerb: 'DERLE', mergeVerb: 'BİRLEŞTİR',
    fieldName: 'DEVRE TABANI', catalogName: 'MODÜL ŞEMASI',
    productionName: 'AKIŞ BANDI', mergeName: 'KOMPONENT BİRLEŞTİRME',
    rosterName: 'BİRİM REGİSTRİ',
    tierKind: 'version', timeKind: 'tick',
    levelLabel: 'BUILD', statusOk: 'AKTİF', statusBuild: 'DERLENİYOR',
    buildTabs: ['Tümü', 'Veri', 'Montaj', 'Mantık', 'Subspace'],
    productionTabs: ['Tümü', 'Sentinel', 'Catapult', 'Phoenix', 'Demiurge'],
    quickActions: [
      { key: 'assemble', label: 'MONTAJ',    icon: 'gear'   },
      { key: 'compile',  label: 'DERLE',     icon: 'cpu'    },
      { key: 'merge',    label: 'BİRLEŞTİR', icon: 'fuse'   },
      { key: 'roster',   label: 'REGİSTRİ',  icon: 'roster' },
    ],
    morphHint: 'BLUEPRINT v', verticalFlow: 'Data akışı',
  },
  canavar: {
    actionVerb: 'KAZ', productionVerb: 'AV', mergeVerb: 'YE',
    fieldName: 'AVLAK BÖLGESİ', catalogName: 'BEDEN AĞACI',
    productionName: 'AV ROTASI', mergeName: 'YAMYAMLIK HALKASI',
    rosterName: 'SÜRÜ KAYDI',
    tierKind: 'blood', timeKind: 'phase',
    levelLabel: 'AVCI ÇAĞI', statusOk: 'UYANIK', statusBuild: 'BÜYÜYOR',
    buildTabs: ['Tümü', 'Av', 'İn', 'Atalar', 'Yarık'],
    productionTabs: ['Tümü', 'Avcı', 'Sürü', 'Atalar', 'Tanrı'],
    quickActions: [
      { key: 'dig',    label: 'KAZ',  icon: 'claw'   },
      { key: 'hunt',   label: 'AV',   icon: 'fang'   },
      { key: 'eat',    label: 'YE',   icon: 'jaw'    },
      { key: 'roster', label: 'SÜRÜ', icon: 'roster' },
    ],
    morphHint: 'BEDEN', verticalFlow: 'Kan akışı',
  },
  seytan: {
    actionVerb: 'PAKT YAZ', productionVerb: 'ÇAĞIR', mergeVerb: 'MÜHÜRLE',
    fieldName: 'KARANLIK MAHKEME', catalogName: 'GRİMUVA',
    productionName: 'ÇAĞIRMA RİTÜELİ', mergeName: 'PAKT MÜHRÜ',
    rosterName: 'MAHKEME SİCİLİ',
    tierKind: 'seal', timeKind: 'ritual',
    levelLabel: 'PAKT MERTEBESI', statusOk: 'MÜHÜRLÜ', statusBuild: 'AÇILIYOR',
    buildTabs: ['Tümü', 'Ruh', 'Tapınak', 'Pakt', 'Yarık'],
    productionTabs: ['Tümü', 'Imp', 'Cadı', 'Lord', 'Demon'],
    quickActions: [
      { key: 'pact',   label: 'PAKT',    icon: 'sigil'  },
      { key: 'summon', label: 'ÇAĞIR',   icon: 'flame'  },
      { key: 'seal',   label: 'MÜHÜRLE', icon: 'rune'   },
      { key: 'roster', label: 'MAHKEME', icon: 'roster' },
    ],
    morphHint: 'SİGİL', verticalFlow: 'Ruh akışı',
  },
};

export function raceLex(key: NDRaceKey): NDRaceLex {
  return RACE_LEX[key];
}
