export interface StoryChapter {
  id: string;
  number: number;
  title: string;
  age: number;
  levelRequirement: number;
  summary: string;
  narrative: string;
  choices?: StoryChoice[];
  reward: { gold?: number; gems?: number; xp?: number; titleUnlock?: string };
  bossEncounterCode?: string;
  nextChapterId: string | null;
}

export interface StoryChoice {
  id: string;
  text: string;
  outcome: string;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  // Age 1 chapters
  {
    id: 'ch_01_arrival',
    number: 1,
    title: 'Geliş',
    age: 1,
    levelRequirement: 1,
    summary: 'Nebula Dominion\'a ilk adım.',
    narrative:
      'Yıldız haritası önünde, komutanın gözleri binlerce ışık yılı ötesini tarıyor. Nebula Dominion — ' +
      'yüzlerce medeniyetin çöküşüne sahne olmuş, şimdi de senin hâkimiyet sahnen olacak bu uçsuz bucaksız galaksi. ' +
      'Filo flagmanın Sektör Alfa\'ya demir attığında, radar ekranları bilinmeyen bir sinyali saptadı. ' +
      'İlk ırklar bölgeyi aralarında paylaşmaya çalışıyor, oysa sen daha büyük planlar kuruyorsun.',
    choices: [
      { id: 'diplomacy', text: 'Diplomatik iletişim kur', outcome: 'Yerel fraksiyonlarla erken ittifak fırsatı doğuyor.' },
      { id: 'expand', text: 'Hemen genişle', outcome: 'Daha hızlı kaynak edinimi ama erken çatışma riski.' },
    ],
    reward: { gold: 500, xp: 100 },
    nextChapterId: 'ch_02_first_contact',
  },
  {
    id: 'ch_02_first_contact',
    number: 2,
    title: 'İlk Temas',
    age: 1,
    levelRequirement: 3,
    summary: 'Zerg sürüsüyle ilk karşılaşma.',
    narrative:
      'Mineral kaynaklarını tararken ekranlar alarmla doldu. Zerg sürüsü — milyonlarca biyolojik varlıktan oluşan, ' +
      'evrimin saf öfkesi — Sektör Alfa\'nın dışından yaklaşıyor. İlk savaş kaçınılmaz; savunma hatlarını kur ' +
      've bu organik tufanı geri püskürt.',
    reward: { gold: 750, gems: 15, xp: 200 },
    nextChapterId: 'ch_03_iron_tide',
  },
  {
    id: 'ch_03_iron_tide',
    number: 3,
    title: 'Demir Dalga',
    age: 1,
    levelRequirement: 5,
    summary: 'Automata\'nın ilk belirtileri.',
    narrative:
      'Savaş alanındaki hasarı incelerken, kırık Zerg zırhlarının altında garip metalik izler buldun. ' +
      'Robotik ajanlar — Automata olarak adlandırılan mekanik varlıklar — savaşı gözlemliyordu. ' +
      'Onlar sadece izleyici mi, yoksa daha büyük bir oyunun parçası mı?',
    reward: { gold: 1000, xp: 300 },
    nextChapterId: 'ch_04_age1_end',
  },
  {
    id: 'ch_04_age1_end',
    number: 4,
    title: 'Çağ 1\'in Sonu',
    age: 1,
    levelRequirement: 9,
    summary: 'İlk çağın kapanışı ve Çağ 2\'ye geçiş.',
    narrative:
      'Sektör Alfa artık senin kontrolünde. Dokuz ay süren çatışmalar, inşaatlar ve ittifaklar sonucu ' +
      'Çağ 1 bir efsaneye dönüştü. Ama ufukta yeni bir tehdit yükseliyor: Automata fabrikaları tam kapasiteyle çalışıyor, ' +
      've Hidra — kadim bir Zerg savaş canavarı — uyandırılıyor. Çağ 2 başlamak üzere.',
    reward: { gold: 3000, gems: 75, xp: 500, titleUnlock: 'Çağ 1 Kahramanı' },
    nextChapterId: 'ch_05_iron_dawn',
  },

  // Age 2 chapters
  {
    id: 'ch_05_iron_dawn',
    number: 5,
    title: 'Demir Çağın Şafağı',
    age: 2,
    levelRequirement: 10,
    summary: 'Çağ 2 başlıyor — Automata sahneye çıkıyor.',
    narrative:
      'Çağ 2 saatin 00:00\'ında başladığında, tüm iletişim kanalları aynı anda kesildi. ' +
      'Automata orduları koordineli bir şekilde tüm sektörlere girdi. Onlar bir medeniyetin kalıntısı değil; ' +
      'bilinçli, planlayan, evrim geçiren varlıklar. Nano-dronları gökyüzünü kapladı, ' +
      've Kuantum Reaktörleri\'nin enerji imzaları tüm sensör ağlarını köreltti. ' +
      'Artık oyunun kuralları değişti.',
    reward: { gold: 2000, gems: 50, xp: 400 },
    nextChapterId: 'ch_06_hydra_rises',
  },
  {
    id: 'ch_06_hydra_rises',
    number: 6,
    title: 'Hidra\'nın Yükselişi',
    age: 2,
    levelRequirement: 12,
    summary: 'Kadim Zerg savaş canavarı Hidra uyandırıldı.',
    narrative:
      'Zerg veri arşivlerinde gizlenmiş bir kayıt bulundu: "Hidra Protokolü — düşmanı ezmek için uyuyan tanrıyı uyandır." ' +
      'Hidra, milyonlarca yıllık evrimle donatılmış bir Zerg mutant. İki fazlı saldırısı — ' +
      'Yenilenen Zırh ve Zehir Barajı — daha önce hiçbir orduya karşı duramadı. ' +
      'Sen ilk olacaksın ya da en son düşen olacaksın.',
    bossEncounterCode: 'hydra_age2',
    reward: { gold: 3500, gems: 100, xp: 600 },
    nextChapterId: 'ch_07_automata_secret',
  },
  {
    id: 'ch_07_automata_secret',
    number: 7,
    title: 'Automata\'nın Sırrı',
    age: 2,
    levelRequirement: 13,
    summary: 'Automata\'nın gerçek amacı ortaya çıkıyor.',
    narrative:
      'Hidra\'nın yenilgisinin ardından ele geçirilen bir Automata veri çekirdeği çarpıcı bilgiler içeriyordu: ' +
      'Automata bir araç değil, bir yaşam formu. Mutasyon ağaçları bilinçli seçimler. ' +
      'Titan — Automata\'nın savaş liderliği için tasarlanmış mega robot — aktive edilmek üzere. ' +
      'Cyber Core tesislerini ele geçirmeden önce Titan uyanırsa, ' +
      'Nano Forge fabrikaları durdurulamaz bir üretim döngüsüne girecek.',
    reward: { gold: 2500, gems: 75, xp: 500 },
    nextChapterId: 'ch_08_titan_protocol',
  },
  {
    id: 'ch_08_titan_protocol',
    number: 8,
    title: 'Titan Protokolü',
    age: 2,
    levelRequirement: 15,
    summary: 'Titan — Automata\'nın mega robotu — savaşa giriyor.',
    narrative:
      'Titan\'ın aktivasyon koordinatları alındı. Üç fazlı saldırı protokolü: ' +
      'Mekanik Taarruz, Kale Modu ve Aşırı Yük. Her faz öncekinden daha yıkıcı. ' +
      'Ama sen artık Çağ 2\'nin en güçlü komutanısın. ' +
      'Kuantum Kalkan\'ın, Sürü Zekası\'nın ve Titan Şasisi mutasyonlarının kombinasyonu ' +
      'bu savaşın gidişatını değiştirebilir.',
    bossEncounterCode: 'titan_age2',
    reward: { gold: 5000, gems: 150, xp: 800 },
    nextChapterId: 'ch_09_new_order',
  },
  {
    id: 'ch_09_new_order',
    number: 9,
    title: 'Yeni Düzen',
    age: 2,
    levelRequirement: 17,
    summary: 'Çağ 2\'nin sonu — galaksinin yeni dengesi.',
    narrative:
      'Titan çöktüğünde tüm Automata ağı kısa devre yaptı. Zerg sürüsü lidersiz dağıldı. ' +
      'Ve sen — İnsanlığın, Zerg\'in ve Automata\'nın en iyi özelliklerini taktiksel dehânla birleştiren ' +
      'bir komutan olarak — Çağ 2\'yi kapattın. ' +
      'Ama galaksinin daha uzak köşelerinde Canavar ırkı uyanıyor. ' +
      'Çağ 3 için hazırlan: sosyal özellikler, ittifaklar ve çok daha büyük tehditler geliyor.',
    choices: [
      { id: 'rebuild', text: 'Yeniden inşaya odaklan', outcome: 'Çağ 3\'e güçlendirilmiş kaynakla gir.' },
      { id: 'conquer', text: 'Zayıf sektörleri fethet', outcome: 'Çağ 3\'e daha fazla toprakla gir.' },
    ],
    reward: { gold: 8000, gems: 300, xp: 1000, titleUnlock: 'Çağ 2 Fatihi' },
    nextChapterId: null,
  },
];

export function getChapterById(id: string): StoryChapter | undefined {
  return STORY_CHAPTERS.find((c) => c.id === id);
}

export function getChaptersByAge(age: number): StoryChapter[] {
  return STORY_CHAPTERS.filter((c) => c.age === age);
}
