export interface EraTransitionPackage {
  goldGranted: number;
  gemsGranted: number;
  premiumCurrencyGranted: number;
  unitPackCount: number;
  productionBoostMultiplier: number;
  productionBoostExpiresAt: Date;
}

export interface EraTransitionEvent {
  userId: string;
  fromAge: number;
  toAge: number;
  catchUpPackage: EraTransitionPackage;
}

export class AdvanceAgeDto {
  userId: string;
}

export class ActiveBoostDto {
  productionBoostMultiplier: number;
  productionBoostExpiresAt: Date | null;
  isActive: boolean;
}
