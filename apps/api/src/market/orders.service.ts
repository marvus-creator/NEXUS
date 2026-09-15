import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { money } from '../common/util/money.js';
import { LedgerService } from '../wallet/ledger.service.js';

const ORDER_INCLUDE = {
  listing: { select: { slug: true, title: true, coverUrl: true, kind: true } },
  buyer: { select: { username: true, displayName: true, avatarUrl: true } },
  seller: { select: { username: true, displayName: true, avatarUrl: true } },
  business: { select: { slug: true, name: true } },
} as const;

@Injectable()
export class OrdersService {
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

  private code() {
    return `NX-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private shape(order: {
    id: string;
    code: string;
    quantity: number;
    unitPriceMinor: number;
    totalMinor: number;
    currency: string;
    status: string;
    note: string | null;
    paidTransactionId: string | null;
    createdAt: Date;
    decidedAt: Date | null;
    fulfilledAt: Date | null;
    buyerId: string;
    sellerId: string;
    listing?: { slug: string; title: string; coverUrl: string | null; kind: string };
    buyer?: { username: string; displayName: string; avatarUrl: string | null };
    seller?: { username: string; displayName: string; avatarUrl: string | null };
    business?: { slug: string; name: string } | null;
  }) {
    return {
      id: order.id,
      code: order.code,
      quantity: order.quantity,
      unitPrice: money(order.unitPriceMinor, order.currency),
      total: money(order.totalMinor, order.currency),
      currency: order.currency,
      status: order.status,
      note: order.note,
      paid: Boolean(order.paidTransactionId),
      createdAt: order.createdAt,
      decidedAt: order.decidedAt,
      fulfilledAt: order.fulfilledAt,
      listing: order.listing ?? null,
      buyer: order.buyer ?? null,
      seller: order.seller ?? null,
      business: order.business ?? null,
    };
  }

  async place(userId: string, slug: string, input: { quantity?: number; note?: string }) {
    const profile = await this.profileFor(userId);

    const listing = await this.prisma.listing.findFirst({
      where: { slug, deletedAt: null },
      include: { business: { select: { id: true } } },
    });

    if (!listing) throw new NotFoundException('Listing not found');

    if (listing.status !== 'ACTIVE') {
      throw new BadRequestException('That listing is not taking orders');
    }

    if (listing.sellerId === profile.id) {
      throw new BadRequestException('You cannot order your own listing');
    }

    const quantity = input.quantity ?? 1;

    if (quantity < 1) throw new BadRequestException('Order at least one');

    if (listing.kind === 'PRODUCT' && quantity > listing.quantity) {
      throw new BadRequestException(
        listing.quantity === 0
          ? 'That is out of stock'
          : `Only ${listing.quantity} left`,
      );
    }

    const order = await this.prisma.order.create({
      data: {
        code: this.code(),
        listingId: listing.id,
        buyerId: profile.id,
        sellerId: listing.sellerId,
        businessId: listing.business?.id,
        quantity,
        unitPriceMinor: listing.priceMinor,
        totalMinor: listing.priceMinor * quantity,
        currency: listing.currency,
        note: input.note,
      },
      include: ORDER_INCLUDE,
    });

    const seller = await this.prisma.profile.findUnique({
      where: { id: listing.sellerId },
      select: { user: { select: { id: true } } },
    });

    if (seller) {
      await this.notifications.notify({
        userId: seller.user.id,
        category: 'SYSTEM',
        title: `${profile.displayName} wants ${quantity} × ${listing.title}`,
        body: input.note ?? undefined,
        href: '/market/orders',
      });
    }

    return this.shape(order);
  }

  async list(userId: string, scope: 'buying' | 'selling' = 'buying') {
    const profile = await this.profileFor(userId);

    const orders = await this.prisma.order.findMany({
      where: scope === 'buying' ? { buyerId: profile.id } : { sellerId: profile.id },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    return orders.map((order) => this.shape(order));
  }

  async detail(userId: string, code: string) {
    const profile = await this.profileFor(userId);

    const order = await this.prisma.order.findUnique({
      where: { code },
      include: ORDER_INCLUDE,
    });

    if (!order || (order.buyerId !== profile.id && order.sellerId !== profile.id)) {
      throw new NotFoundException('Order not found');
    }

    return this.shape(order);
  }

  async decide(userId: string, code: string, accept: boolean) {
    const profile = await this.profileFor(userId);

    const order = await this.prisma.order.findUnique({
      where: { code },
      include: { listing: { select: { id: true, kind: true, quantity: true, title: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.sellerId !== profile.id) throw new ForbiddenException('That is not your order to decide');

    if (order.status !== 'PENDING') {
      throw new BadRequestException(`That order was already ${order.status.toLowerCase()}`);
    }

    if (accept && order.listing.kind === 'PRODUCT' && order.quantity > order.listing.quantity) {
      throw new BadRequestException('You no longer have that many in stock');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (accept && order.listing.kind === 'PRODUCT') {
        const remaining = order.listing.quantity - order.quantity;

        await tx.listing.update({
          where: { id: order.listing.id },
          data: { quantity: remaining, ...(remaining === 0 ? { status: 'SOLD' as const } : {}) },
        });
      }

      return tx.order.update({
        where: { id: order.id },
        data: { status: accept ? 'ACCEPTED' : 'DECLINED', decidedAt: new Date() },
        include: ORDER_INCLUDE,
      });
    });

    const buyer = await this.prisma.profile.findUnique({
      where: { id: order.buyerId },
      select: { user: { select: { id: true } } },
    });

    if (buyer) {
      await this.notifications.notify({
        userId: buyer.user.id,
        category: 'SYSTEM',
        title: accept
          ? `${profile.displayName} accepted your order for ${order.listing.title}`
          : `${profile.displayName} declined your order for ${order.listing.title}`,
        href: '/market/orders',
      });
    }

    return this.shape(updated);
  }

  async cancel(userId: string, code: string) {
    const profile = await this.profileFor(userId);

    const order = await this.prisma.order.findUnique({ where: { code } });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== profile.id) throw new ForbiddenException('That is not your order');

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Only a pending order can be cancelled');
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', decidedAt: new Date() },
      include: ORDER_INCLUDE,
    });

    return this.shape(updated);
  }

  async pay(userId: string, code: string) {
    const profile = await this.profileFor(userId);

    const order = await this.prisma.order.findUnique({
      where: { code },
      include: { listing: { select: { title: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== profile.id) throw new ForbiddenException('That is not your order');

    if (order.status !== 'ACCEPTED') {
      throw new BadRequestException('Only an accepted order can be paid');
    }

    if (order.paidTransactionId) throw new BadRequestException('That order is already paid');

    const buyerWallet = await this.ledger.walletForProfile(order.buyerId, order.currency);
    const sellerWallet = await this.ledger.walletForProfile(order.sellerId, order.currency);

    if (buyerWallet.currency !== order.currency) {
      throw new BadRequestException(
        `That order is priced in ${order.currency} but your wallet holds ${buyerWallet.currency}`,
      );
    }

    if (sellerWallet.currency !== order.currency) {
      throw new BadRequestException(
        `The seller's wallet holds ${sellerWallet.currency}, not ${order.currency}`,
      );
    }

    const transaction = await this.ledger.post({
      kind: 'ORDER_PAYMENT',
      currency: order.currency,
      memo: `Order ${order.code} — ${order.listing.title}`,
      entries: [
        { walletId: buyerWallet.id, direction: 'DEBIT', amountMinor: order.totalMinor },
        { walletId: sellerWallet.id, direction: 'CREDIT', amountMinor: order.totalMinor },
      ],
    });

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { paidTransactionId: transaction.id, status: 'FULFILLED', fulfilledAt: new Date() },
      include: ORDER_INCLUDE,
    });

    const seller = await this.prisma.profile.findUnique({
      where: { id: order.sellerId },
      select: { user: { select: { id: true } } },
    });

    if (seller) {
      await this.notifications.notify({
        userId: seller.user.id,
        category: 'SYSTEM',
        title: `${profile.displayName} paid ${money(order.totalMinor, order.currency).display} for ${order.listing.title}`,
        href: '/wallet',
      });
    }

    await this.audit.record({
      action: 'order.paid',
      actorUserId: userId,
      entityType: 'order',
      entityId: order.id,
      metadata: { reference: transaction.reference, totalMinor: order.totalMinor },
    });

    return this.shape(updated);
  }

  async refund(userId: string, code: string) {
    const profile = await this.profileFor(userId);

    const order = await this.prisma.order.findUnique({ where: { code } });

    if (!order) throw new NotFoundException('Order not found');
    if (order.sellerId !== profile.id) throw new ForbiddenException('Only the seller can refund');
    if (!order.paidTransactionId) throw new BadRequestException('That order was never paid');

    const reversal = await this.ledger.reverse(
      order.paidTransactionId,
      `Refund for order ${order.code}`,
    );

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', paidTransactionId: null },
      include: ORDER_INCLUDE,
    });

    const buyer = await this.prisma.profile.findUnique({
      where: { id: order.buyerId },
      select: { user: { select: { id: true } } },
    });

    if (buyer) {
      await this.notifications.notify({
        userId: buyer.user.id,
        category: 'SYSTEM',
        title: `Order ${order.code} was refunded`,
        href: '/wallet',
      });
    }

    return { ...this.shape(updated), refundReference: reversal.reference };
  }
}
