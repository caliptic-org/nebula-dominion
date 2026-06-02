import { IsEnum } from 'class-validator';

export enum GameMode {
  RANKED = 'ranked',
  CASUAL = 'casual',
}

export enum Race {
  HUMAN = 'human',
  ZERG = 'zerg',
  AUTOMATON = 'automaton',
  // Mirror api/src/user/entities/race.enum.ts — a player who selects
  // canavar/şeytan via api's /users/select-race would otherwise hit
  // IsEnum validation here and be locked out of PvP matchmaking.
  // RACE_BONUSES and UNIT_TEMPLATES fall back to HUMAN defaults when
  // these races lack race-specific data (no AI penalty yet for the
  // new races — that's its own balance pass).
  BEAST = 'beast',
  DEMON = 'demon',
}

export class JoinQueueDto {
  @IsEnum(GameMode)
  mode: GameMode;

  @IsEnum(Race)
  race: Race;
}
