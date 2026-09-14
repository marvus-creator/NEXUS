import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@nexus/db';
import { PrismaService } from '../prisma/prisma.service.js';

export type AuditEntry = {
  action: string;
  actorUserId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          actorUserId: entry.actorUserId ?? null,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: entry.metadata,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit entry ${entry.action}`, error as Error);
    }
  }
}
