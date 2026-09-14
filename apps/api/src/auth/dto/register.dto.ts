import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(10, { message: 'Use at least 10 characters' })
  @MaxLength(200)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  displayName!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Matches(/^[a-z0-9_]{3,24}$/, {
    message: 'Usernames use 3-24 lowercase letters, numbers or underscores',
  })
  username!: string;
}
