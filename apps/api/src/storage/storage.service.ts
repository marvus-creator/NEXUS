import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

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
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

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

    if (this.config.get('STORAGE_DRIVER', { infer: true }) === 'database') {
      await this.prisma.storedFile.create({
        data: { key, contentType: file.mimetype, size: file.size, bytes: new Uint8Array(file.buffer) },
      });
    } else {
      const target = path.join(this.root, key);

      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.buffer);
    }

    return { key, url: `${this.publicUrl}/uploads/${key}` };
  }

  async readStored(key: string) {
    return this.prisma.storedFile.findUnique({
      where: { key },
      select: { contentType: true, bytes: true },
    });
  }
}
