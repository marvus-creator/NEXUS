import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isSupportedCurrency, money, toMinor } from '../common/util/money.js';
import { LedgerService } from './ledger.service.js';

const RAILS_CONNECTED = Boolean(process.env.PAYMENTS_PROVIDER);

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private async profileFor(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true, username: true, displayName: true, currency: true },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    return profile;
  }

  async overview(userId: string) {
    const profile = await this.profileFor(userId);
    const wallet = await this.ledger.walletForProfile(profile.id, profile.currency);
    const balance = await this.ledger.balanceOf(wallet.id);
    const history = await this.ledger.history(wallet.id);

    const pendingOrders = await this.prisma.order.count({
      where: { buyerId: profile.id, status: 'PENDING' },
    });

    return {
      wallet: {
        id: wallet.id,
        currency: wallet.currency,
        balance: money(balance, wallet.currency),
      },
      rails: {
        connected: RAILS_CONNECTED,
        note: RAILS_CONNECTED
          ? 'Top-ups and withdrawals are available.'
          : 'No payment provider is connected, so money cannot enter or leave Nexus yet. Balances here move only between Nexus accounts.',
      },
      pendingOrders,
      history: history.map((entry) => ({
        ...entry,
        amount: money(entry.amountMinor, entry.currency),
        signedMinor: entry.direction === 'CREDIT' ? entry.amountMinor : -entry.amountMinor,
      })),
    };
  }

  async transfer(
    userId: string,
    input: { username: string; amount: number; memo?: string },
  ) {
    const profile = await this.profileFor(userId);

    if (input.username.toLowerCase() === profile.username.toLowerCase()) {
      throw new BadRequestException('You cannot send money to yourself');
    }

    const target = await this.prisma.profile.findUnique({
      where: { username: input.username.toLowerCase() },
      select: { id: true, username: true, displayName: true, currency: true, user: { select: { id: true, deletedAt: true } } },
    });

    if (!target || target.user.deletedAt) throw new NotFoundException('No one by that username');

    const sender = await this.ledger.walletForProfile(profile.id, profile.currency);
    const recipient = await this.ledger.walletForProfile(target.id, target.currency);

    if (sender.currency !== recipient.currency) {
      throw new BadRequestException(
        `You hold ${sender.currency} and they hold ${recipient.currency}. Currency conversion is not built yet.`,
      );
    }

    if (!isSupportedCurrency(sender.currency)) {
      throw new BadRequestException(`${sender.currency} is not a supported currency`);
    }

    const amountMinor = toMinor(input.amount, sender.currency);

    if (amountMinor <= 0) {
      throw new BadRequestException('Send an amount above zero');
    }

    const transaction = await this.ledger.post({
      kind: 'TRANSFER',
      currency: sender.currency,
      memo: input.memo,
      entries: [
        { walletId: sender.id, direction: 'DEBIT', amountMinor },
        { walletId: recipient.id, direction: 'CREDIT', amountMinor },
      ],
    });

    await this.notifications.notify({
      userId: target.user.id,
      category: 'SYSTEM',
      title: `${profile.displayName} sent you ${money(amountMinor, sender.currency).display}`,
      body: input.memo ?? undefined,
      href: '/wallet',
    });

    await this.audit.record({
      action: 'wallet.transfer',
      actorUserId: userId,
      metadata: { reference: transaction.reference, amountMinor, currency: sender.currency },
    });

    return {
      reference: transaction.reference,
      amount: money(amountMinor, sender.currency),
      to: { username: target.username, displayName: target.displayName },
      balance: money(await this.ledger.balanceOf(sender.id), sender.currency),
    };
  }

  async devGrant(userId: string, amount: number) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Grants are not available');
    }

    const profile = await this.profileFor(userId);
    const wallet = await this.ledger.walletForProfile(profile.id, profile.currency);
    const treasury = await this.ledger.treasury(wallet.currency);
    const amountMinor = toMinor(amount, wallet.currency);

    if (amountMinor <= 0) throw new BadRequestException('Grant an amount above zero');

    const transaction = await this.ledger.post(
      {
        kind: 'ADJUSTMENT',
        currency: wallet.currency,
        memo: 'Development grant — not real money',
        entries: [
          { walletId: treasury.id, direction: 'DEBIT', amountMinor },
          { walletId: wallet.id, direction: 'CREDIT', amountMinor },
        ],
      },
      { allowNegative: [treasury.id] },
    );

    return {
      reference: transaction.reference,
      balance: money(await this.ledger.balanceOf(wallet.id), wallet.currency),
    };
  }
}
