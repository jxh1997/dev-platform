import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateRecordDto {
  @ApiProperty() @IsString() @Matches(/^[A-Z0-9_-]{2,64}$/) code!: string;
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name!: string;
  @ApiPropertyOptional({ enum: ['enabled', 'disabled'], default: 'enabled' })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';
  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_o, v: unknown) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(500)
  remark?: string | null;
}
export class VersionDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(2147483646)
  version!: number;
}
export class UpdateRecordDto extends VersionDto {
  @ApiPropertyOptional()
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name?: string;
  @ApiPropertyOptional({ enum: ['enabled', 'disabled'] })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';
  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_o, v: unknown) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(500)
  remark?: string | null;
}
function decimalInteger(value: unknown) {
  return typeof value === 'string' && /^[1-9]\d{0,8}$/.test(value)
    ? Number(value)
    : value;
}
export class QueryRecordsDto {
  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }: { value: unknown }) => decimalInteger(value))
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;
  @ApiPropertyOptional({ default: 20 })
  @Transform(({ value }: { value: unknown }) => decimalInteger(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
  @ApiPropertyOptional()
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString()
  @MaxLength(100)
  name?: string;
  @ApiPropertyOptional({ enum: ['enabled', 'disabled'] })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';
}
export class RecordResponse {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['enabled', 'disabled'] }) status!:
    | 'enabled'
    | 'disabled';
  @ApiProperty({ type: String, nullable: true }) remark!: string | null;
  @ApiProperty() createdBy!: string;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
export class RecordsPageResponse {
  @ApiProperty({ type: RecordResponse, isArray: true }) list!: RecordResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class DeleteRecordResponse {
  @ApiProperty() id!: string;
  @ApiProperty() version!: number;
  @ApiProperty() deleted!: boolean;
}
