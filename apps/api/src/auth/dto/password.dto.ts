import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MaxLength(512)
  token!: string;

  @IsString()
  @MinLength(10, { message: 'Use at least 10 characters' })
  @MaxLength(200)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(200)
  currentPassword!: string;

  @IsString()
  @MinLength(10, { message: 'Use at least 10 characters' })
  @MaxLength(200)
  newPassword!: string;
}
