import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { StorageService } from './storage.service.js';

const FOLDERS = ['posts', 'covers', 'events', 'places', 'circles', 'listings', 'businesses'] as const;

type Folder = (typeof FOLDERS)[number];

@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('image')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 4 * 1024 * 1024 } }))
  async image(@Query('folder') folder: string, @UploadedFile() file: Express.Multer.File) {
    if (!FOLDERS.includes(folder as Folder)) {
      throw new BadRequestException(`folder must be one of ${FOLDERS.join(', ')}`);
    }

    if (!file) throw new BadRequestException('No image was uploaded');

    const stored = await this.storage.saveImage(file, folder);

    return { url: stored.url };
  }
}
