import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShopCategory } from '../types/shop.types';

export class GetProductsQueryDto {
  @ApiPropertyOptional({ enum: ShopCategory, description: 'Filter by shop tab/category' })
  @IsOptional()
  @IsEnum(ShopCategory)
  tab?: ShopCategory;

  @ApiPropertyOptional({ description: 'Player race for race-exclusive bundle filtering' })
  @IsOptional()
  @IsString()
  race?: string;
}
