import { IsEmail, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(200)
  password!: string;
}
