import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResearchCategory } from '../types/research.types';

export class TechTreeQueryDto {
  @ApiProperty({ description: 'Player ID (UUID)' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ description: 'Race identifier (e.g., nebula, crimson, void)' })
  @IsString()
  race: string;

  @ApiPropertyOptional({ enum: ResearchCategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(ResearchCategory)
  category?: ResearchCategory;
}

export class NodeDetailQueryDto {
  @ApiProperty({ description: 'Player ID (UUID)' })
  @IsUUID()
  playerId: string;
}

export class StartResearchDto {
  @ApiProperty({ description: 'Player ID (UUID)' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ description: 'Tech node key (e.g., ek-madencilik)' })
  @IsString()
  nodeKey: string;
}

export class CancelResearchDto {
  @ApiProperty({ description: 'Player ID (UUID)' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ description: 'Tech node key to cancel' })
  @IsString()
  nodeKey: string;
}

export class QueueQueryDto {
  @ApiProperty({ description: 'Player ID (UUID)' })
  @IsUUID()
  playerId: string;
}

export class ProgressQueryDto {
  @ApiProperty({ description: 'Player ID (UUID)' })
  @IsUUID()
  playerId: string;
}
