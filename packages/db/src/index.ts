import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export type CreatePrismaClientOptions = {
  connectionString: string;
  log?: ('query' | 'info' | 'warn' | 'error')[];
};

export function createPrismaClient({ connectionString, log }: CreatePrismaClientOptions) {
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter, log });
}

export type NexusPrismaClient = ReturnType<typeof createPrismaClient>;

export * from '@prisma/client';

export function prismaOptions(connectionString: string, log?: CreatePrismaClientOptions['log']) {
  return { adapter: new PrismaPg({ connectionString }), log };
}
