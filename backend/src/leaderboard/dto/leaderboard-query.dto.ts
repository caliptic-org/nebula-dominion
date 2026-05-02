export class LeaderboardQueryDto {
  limit?: number;
  offset?: number;
}

export class UpdateScoreDto {
  playerId: string;
  username: string;
  delta: number;
}
