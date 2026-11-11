import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const defined = (_: unknown, v: unknown) => v !== undefined;
const normalize = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
export class PageQuery {
  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^[1-9]\d{0,6}$/.test(value)
      ? Number(value)
      : value,
  )
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;
  @ApiPropertyOptional({ default: 20 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^[1-9]\d{0,2}$/.test(value)
      ? Number(value)
      : value,
  )
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
  @ApiPropertyOptional()
  @ValidateIf(defined)
  @IsString()
  @Length(0, 100)
  search?: string;
}
export class ExpectedVersion {
  @ApiProperty() @IsInt() @Min(1) @Max(2147483646) version!: number;
}
export class CreateUserDto {
  @ApiProperty()
  @Transform(normalize)
  @Matches(/^[a-z0-9_.-]{3,64}$/)
  username!: string;
  @ApiProperty() @IsString() @Length(1, 100) realName!: string;
  @ApiProperty({ minLength: 6, maxLength: 12 })
  @IsString()
  @Length(6, 12)
  password!: string;
}
export class UpdateUserDto extends ExpectedVersion {
  @ApiPropertyOptional()
  @ValidateIf(defined)
  @IsString()
  @Length(1, 100)
  realName?: string;
  @ApiPropertyOptional() @ValidateIf(defined) @IsBoolean() enabled?: boolean;
}
export class AssignRolesDto extends ExpectedVersion {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Matches(/^[1-9]\d{0,19}$/, { each: true })
  roleIds!: string[];
}
export class ResetPasswordDto extends ExpectedVersion {
  @ApiProperty({ minLength: 6, maxLength: 12 })
  @IsString()
  @Length(6, 12)
  password!: string;
}
export class CreateRoleDto {
  @ApiProperty()
  @Transform(normalize)
  @Matches(/^[a-z][a-z0-9_-]{2,63}$/)
  code!: string;
  @ApiProperty() @IsString() @Length(1, 100) name!: string;
}
export class UpdateRoleDto extends ExpectedVersion {
  @ApiPropertyOptional()
  @ValidateIf(defined)
  @IsString()
  @Length(1, 100)
  name?: string;
  @ApiPropertyOptional() @ValidateIf(defined) @IsBoolean() enabled?: boolean;
}
export class GrantDto {
  @ApiProperty() @IsString() @Length(1, 100) code!: string;
  @ApiProperty({ enum: ['ALL', 'SELF'] }) @IsIn(['ALL', 'SELF']) scope!:
    | 'ALL'
    | 'SELF';
}
export class RoleGrantsDto extends ExpectedVersion {
  @ApiProperty({
    type: [GrantDto],
    description: '全量替换角色操作权限及各操作范围',
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => GrantDto)
  permissions!: GrantDto[];
  @ApiProperty({
    type: [String],
    description: '全量替换导航，不隐式增加操作权限',
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Matches(/^[1-9]\d{0,19}$/, { each: true })
  menuIds!: string[];
}
export class MenuFieldsDto {
  @ApiPropertyOptional({ default: 'lucide:folder' })
  @ValidateIf(defined)
  @Matches(/^lucide:[a-z0-9-]{1,64}$/)
  icon?: string;
  @ApiProperty() @IsString() @Length(1, 100) name!: string;
  @ApiProperty() @IsString() @Length(1, 250) path!: string;
  @ApiProperty() @IsString() @Length(1, 100) title!: string;
  @ApiProperty() @IsString() @Length(0, 100) component!: string;
  @ApiProperty() @IsString() @Length(0, 100) permission!: string;
  @ApiProperty({ type: String, nullable: true })
  @ValidateIf((_, v: unknown) => v !== null)
  @Matches(/^[1-9]\d{0,19}$/)
  parentId!: string | null;
  @ApiProperty({ enum: ['directory', 'page', 'button', 'link'] })
  @IsIn(['directory', 'page', 'button', 'link'])
  type!: 'directory' | 'page' | 'button' | 'link';
  @ApiProperty() @IsInt() @Min(0) @Max(10000) sort!: number;
  @ApiProperty() @IsBoolean() visible!: boolean;
  @ApiProperty() @IsBoolean() enabled!: boolean;
}
export class CreateMenuDto extends MenuFieldsDto {
  @ApiProperty()
  @Transform(normalize)
  @Matches(/^[a-z][a-z0-9_-]{2,63}$/)
  code!: string;
}
export class UpdateMenuDto extends MenuFieldsDto {
  @ApiProperty() @IsInt() @Min(1) @Max(2147483646) version!: number;
}
export class SessionIdDto {
  @ApiProperty() @IsUUID() sessionId!: string;
}
export class ManagedUserResponse {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() realName!: string;
  @ApiProperty() enabled!: boolean;
  @ApiProperty() mustChangePassword!: boolean;
  @ApiProperty() version!: number;
  @ApiProperty({ type: [String] }) roleIds!: string[];
  @ApiProperty() isSuperAdmin!: boolean;
}
export class ManagedRoleResponse {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() enabled!: boolean;
  @ApiProperty() isSuperAdmin!: boolean;
  @ApiProperty() version!: number;
  @ApiProperty({ type: [GrantDto] }) permissions!: GrantDto[];
  @ApiProperty({ type: [String] }) menuIds!: string[];
}
export class ManagedMenuResponse extends MenuFieldsDto {
  @ApiProperty() declare icon: string;
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() version!: number;
}
export class PermissionResponse {
  @ApiProperty() code!: string;
  @ApiProperty() title!: string;
}
export class PageComponentResponse {
  @ApiProperty() component!: string;
  @ApiProperty() path!: string;
  @ApiProperty() permission!: string;
}
export class UsersPageResponse {
  @ApiProperty({ type: [ManagedUserResponse] }) list!: ManagedUserResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class RolesPageResponse {
  @ApiProperty({ type: [ManagedRoleResponse] }) list!: ManagedRoleResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class MenusPageResponse {
  @ApiProperty({ type: [ManagedMenuResponse] }) list!: ManagedMenuResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
export class SessionResponse {
  @ApiProperty() id!: string;
  @ApiProperty() current!: boolean;
  @ApiProperty() expiresAt!: string;
  @ApiProperty({ type: String, nullable: true }) revokedAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) revokedReason!: string | null;
}
