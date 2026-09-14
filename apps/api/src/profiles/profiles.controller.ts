import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { clientIp, userAgent } from '../common/util/request-context.js';
import { StorageService } from '../storage/storage.service.js';
import type { AccessTokenPayload } from '../auth/tokens.service.js';
import { OnboardingStepDto } from './dto/onboarding.dto.js';
import { UpdatePrivacyDto, UpdateProfileDto } from './dto/update-profile.dto.js';
import { ProfilesService } from './profiles.service.js';

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly storage: StorageService,
  ) {}

  @Public()
  @Get('interests')
  listInterests() {
    return this.profiles.listInterests();
  }

  @Patch('me/onboarding')
  saveStep(@CurrentUser('sub') userId: string, @Body() dto: OnboardingStepDto) {
    return this.profiles.saveOnboardingStep(userId, dto);
  }

  @Post('me/onboarding/complete')
  complete(@CurrentUser('sub') userId: string, @Req() request: Request) {
    return this.profiles.completeOnboarding(userId, {
      ipAddress: clientIp(request),
      userAgent: userAgent(request),
    });
  }

  @Patch('me')
  update(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.profiles.updateProfile(userId, dto);
  }

  @Patch('me/privacy')
  updatePrivacy(@CurrentUser('sub') userId: string, @Body() dto: UpdatePrivacyDto) {
    return this.profiles.updatePrivacy(userId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 4 * 1024 * 1024 } }))
  async uploadAvatar(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No image was uploaded');

    const stored = await this.storage.saveImage(file, 'avatars');

    return this.profiles.setAvatar(userId, stored.url);
  }

  @Public()
  @Get(':username')
  getPublic(@Param('username') username: string, @Req() request: Request) {
    const viewer = (request as Request & { user?: AccessTokenPayload }).user;
    return this.profiles.getPublicProfile(username.toLowerCase(), viewer?.sub);
  }
}
