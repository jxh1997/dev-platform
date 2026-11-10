import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]{3,64}$/)
  username!: string;
  @ApiProperty() @IsString() @Length(1, 72) password!: string;
}
export class ChangePasswordDto {
  @ApiProperty() @IsString() @Length(1, 72) currentPassword!: string;
  @ApiProperty({
    minLength: 6,
    maxLength: 12,
    description: '新密码为 6–12 字符',
  })
  @IsString()
  @Length(6, 12)
  newPassword!: string;
}
export class TokenResponse {
  @ApiProperty() accessToken!: string;
}
export class UserResponse {
  @ApiProperty() userId!: string;
  @ApiProperty() username!: string;
  @ApiProperty() realName!: string;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty() homePath!: string;
  @ApiProperty() mustChangePassword!: boolean;
}
export class MenuMeta {
  @ApiProperty() title!: string;
  @ApiProperty() icon!: string;
}
export class MenuResponse {
  @ApiProperty() name!: string;
  @ApiProperty() path!: string;
  @ApiProperty() component!: string;
  @ApiProperty({ type: MenuMeta }) meta!: MenuMeta;
}
export class SuccessResponse {
  @ApiProperty() success!: boolean;
}
