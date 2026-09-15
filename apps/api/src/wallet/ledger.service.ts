import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Prisma, WalletTxKind } from '@nexus/db';
import { PrismaService } from '../prisma/prisma.service.js';
import { isSupportedCurrency } from '../common/util/money.js';

export type EntryDraft = {
  walletId: string;
  direction: 'CREDIT' | 'DEBIT';
  amountMinor: number;
};

export type PostDraft = {
  kind: WalletTxKind;
  currency: string;
  memo?: string;
  reference?: string;
  entries: EntryDraft[];
  reversalOfId?: string;
};

const TREASURY_LABEL = 'Nexus treasury';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  reference() {
    return `tx_${randomBytes(9).toString('hex')}`;
  }

  async walletForProfile(profileId: string, currency = 'RWF') {
    const existing = await this.prisma.wallet.findUnique({ where: { profileId } });

    if (existing) return existing;

    return this.prisma.wallet.create({ data: { profileId, currency, kind: 'USER' } });
  }

  async treasury(currency = 'RWF') {
    const existing = await this.prisma.wallet.findFirst({ where: { kind: 'TREASURY', currency } });

    if (existing) return existing;

    return this.prisma.wallet.create({
      data: { kind: 'TREASURY', currency, label: TREASURY_LABEL },
    });
  }

  private validate(draft: PostDraft) {
    if (!isSupportedCurrency(draft.currency)) {
      throw new BadRequestException(`${draft.currency} is not a supported currency`);
    }

    if (draft.entries.length < 2) {
      throw new BadRequestException('A transaction needs at least two entries');
    }

    let net = 0;

    for (const entry of draft.entries) {
      if (!Number.isInteger(entry.amountMinor) || entry.amountMinor <= 0) {
        throw new BadRequestException('Every entry must be a whole amount above zero');
      }

      net += entry.direction === 'CREDIT' ? entry.amountMinor : -entry.amountMinor;
    }

    if (net !== 0) {
      throw new BadRequestException('Credits and debits must cancel out');
    }
  }

  async balanceOf(walletId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    const grouped = await client.ledgerEntry.groupBy({
      by: ['direction'],
      where: { walletId },
      _sum: { amountMinor: true },
    });

    let balance = 0;

    for (const row of grouped) {
      const amount = row._sum.amountMinor ?? 0;
      balance += row.direction === 'CREDIT' ? amount : -amount;
    }

    return balance;
  }

  async post(draft: PostDraft, options: { allowNegative?: string[] } = {}) {
    this.validate(draft);

    const allowNegative = new Set(options.allowNegative ?? []);
    const walletIds = [...new Set(draft.entries.map((entry) => entry.walletId))].sort();

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM wallets WHERE id = ANY(${walletIds}::text[]) ORDER BY id FOR UPDATE`;

      const wallets = await tx.wallet.findMany({ where: { id: { in: walletIds } } });

      if (wallets.length !== walletIds.length) {
        throw new NotFoundException('One of those wallets does not exist');
      }

      for (const wallet of wallets) {
        if (wallet.currency !== draft.currency) {
          throw new BadRequestException(
            `That wallet holds ${wallet.currency}, not ${draft.currency}`,
          );
        }
      }

      const net = new Map<string, number>();

      for (const entry of draft.entries) {
        const delta = entry.direction === 'CREDIT' ? entry.amountMinor : -entry.amountMinor;
        net.set(entry.walletId, (net.get(entry.walletId) ?? 0) + delta);
      }

      for (const [walletId, delta] of net) {
        if (delta >= 0 || allowNegative.has(walletId)) continue;

        const balance = await this.balanceOf(walletId, tx);

        if (balance + delta < 0) {
          throw new BadRequestException('There is not enough in that wallet');
        }
      }

      return tx.walletTransaction.create({
        data: {
          reference: draft.reference ?? this.reference(),
          kind: draft.kind,
          currency: draft.currency,
          memo: draft.memo,
          reversalOfId: draft.reversalOfId,
          entries: {
            create: draft.entries.map((entry) => ({
              walletId: entry.walletId,
              direction: entry.direction,
              amountMinor: entry.amountMinor,
              currency: draft.currency,
            })),
          },
        },
        include: { entries: true },
      });
    });
  }

  async reverse(transactionId: string, memo?: string) {
    const original = await this.prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: { entries: true, reversedBy: { select: { id: true } } },
    });

    if (!original) throw new NotFoundException('Transaction not found');

    if (original.status === 'REVERSED' || original.reversedBy) {
      throw new BadRequestException('That transaction was already reversed');
    }

    const treasury = await this.treasury(original.currency);

    const reversal = await this.post(
      {
        kind: original.kind,
        currency: original.currency,
        memo: memo ?? `Reversal of ${original.reference}`,
        reversalOfId: original.id,
        entries: original.entries.map((entry) => ({
          walletId: entry.walletId,
          direction: entry.direction === 'CREDIT' ? ('DEBIT' as const) : ('CREDIT' as const),
          amountMinor: entry.amountMinor,
        })),
      },
      { allowNegative: [treasury.id] },
    );

    await this.prisma.walletTransaction.update({
      where: { id: original.id },
      data: { status: 'REVERSED' },
    });

    return reversal;
  }

  async history(walletId: string, limit = 40) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        transaction: {
          select: { id: true, reference: true, kind: true, status: true, memo: true, createdAt: true },
        },
      },
    });

    const counterparties = await this.prisma.ledgerEntry.findMany({
      where: {
        transactionId: { in: entries.map((entry) => entry.transactionId) },
        walletId: { not: walletId },
      },
      include: {
        wallet: {
          select: {
            kind: true,
            label: true,
            profile: { select: { username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    const byTransaction = new Map(counterparties.map((entry) => [entry.transactionId, entry.wallet]));

    return entries.map((entry) => ({
      id: entry.id,
      direction: entry.direction,
      amountMinor: entry.amountMinor,
      currency: entry.currency,
      createdAt: entry.createdAt,
      transaction: entry.transaction,
      counterparty: byTransaction.get(entry.transactionId) ?? null,
    }));
  }
}
