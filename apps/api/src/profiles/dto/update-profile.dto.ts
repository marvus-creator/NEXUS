import { IsArray, ArrayMaxSize, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { GoalAreaInput, HelpAreaInput, UserTypeInput } from './onboarding.dto.js';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsEnum(UserTypeInput)
  userType?: UserTypeInput;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(GoalAreaInput, { each: true })
  goalAreas?: GoalAreaInput[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsEnum(HelpAreaInput, { each: true })
  helpAreas?: HelpAreaInput[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  interestSlugs?: string[];
}

export class UpdatePrivacyDto {
  @IsOptional()
  @IsEnum(['PUBLIC', 'FRIENDS', 'PRIVATE'])
  profileVisibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

  @IsOptional()
  @IsEnum(['EVERYONE', 'FRIENDS', 'NOBODY'])
  messagePolicy?: 'EVERYONE' | 'FRIENDS' | 'NOBODY';

  @IsOptional()
  @IsBoolean()
  allowFriendRequests?: boolean;

  @IsOptional()
  @IsBoolean()
  showActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  showInPeopleYouKnow?: boolean;

  @IsOptional()
  @IsBoolean()
  personalizationOptIn?: boolean;
}
