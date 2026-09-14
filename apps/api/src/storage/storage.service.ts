import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
]);

const MAX_BYTES = 4 * 1024 * 1024;

export type StoredFile = {
  url: string;
  key: string;
};

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get root() {
    return path.resolve(process.cwd(), '../../uploads');
  }

  private get publicUrl() {
    return this.config.get('API_PUBLIC_URL', { infer: true });
  }

  async saveImage(file: Express.Multer.File, folder: string): Promise<StoredFile> {
    const extension = ALLOWED.get(file.mimetype);

    if (!extension) {
      throw new BadRequestException('Images must be JPEG, PNG, WebP or AVIF');
    }

    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Images must be 4MB or smaller');
    }

    const key = `${folder}/${randomUUID()}.${extension}`;
    const target = path.join(this.root, key);

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.buffer);

    return { key, url: `${this.publicUrl}/uploads/${key}` };
  }
}
