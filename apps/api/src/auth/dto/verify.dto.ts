import { IsEmail, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyEmailDto {
  @IsString()
  @MaxLength(512)
  token!: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @MaxLength(254)
  email!: string;
}
