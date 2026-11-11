import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]{3,64}$/)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  username!: string;
  @ApiProperty() @IsString() @Length(1, 72) password!: string;
  @ApiProperty({ description: '滑块校验返回的浏览器绑定、一次性登录凭证' })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  captchaToken!: string;
}
export class VerifyLoginCaptchaDto {
  @ApiProperty() @IsUUID('4') challengeId!: string;
  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  progress!: number;
}
export class LoginCaptchaChallengeResponse {
  @ApiProperty() challengeId!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}
export class LoginCaptchaVerifyResponse {
  @ApiProperty() captchaToken!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
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
  @ApiProperty() isSuperAdmin!: boolean;
  @ApiProperty() userId!: string;
  @ApiProperty() username!: string;
  @ApiProperty() realName!: string;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty() homePath!: string;
  @ApiProperty() mustChangePassword!: boolean;
}
export class MenuMeta {
  @ApiProperty({ required: false }) order?: number;
  @ApiProperty({ required: false }) hideInMenu?: boolean;
  @ApiProperty({ required: false }) link?: string;
  @ApiProperty() title!: string;
  @ApiProperty() icon!: string;
}
export class MenuResponse {
  @ApiProperty({ type: () => [MenuResponse] }) children!: MenuResponse[];
  @ApiProperty() name!: string;
  @ApiProperty() path!: string;
  @ApiProperty() component!: string;
  @ApiProperty({ type: MenuMeta }) meta!: MenuMeta;
}
export class SuccessResponse {
  @ApiProperty() success!: boolean;
}
