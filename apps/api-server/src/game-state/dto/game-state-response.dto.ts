import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Race, Resources, BuildingSlot } from '../entities/game-state.entity';

export class GameStateResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() level: number;
  @ApiProperty() age: number;
  @ApiProperty({ enum: Race }) race: Race;
  @ApiProperty() resources: Resources;
  @ApiProperty() buildings: BuildingSlot[];
  @ApiProperty() totalScore: number;
  @ApiProperty() battlesWon: number;
  @ApiProperty() battlesLost: number;
  @ApiPropertyOptional() lastActiveAt: Date;
  @ApiProperty() updatedAt: Date;
}
