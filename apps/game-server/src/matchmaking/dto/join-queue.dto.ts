import { IsEnum } from 'class-validator';

export enum GameMode {
  RANKED = 'ranked',
  CASUAL = 'casual',
}

export enum Race {
  HUMAN = 'human',
  ZERG = 'zerg',
  AUTOMATON = 'automaton',
}

export class JoinQueueDto {
  @IsEnum(GameMode)
  mode: GameMode;

  @IsEnum(Race)
  race: Race;
}
