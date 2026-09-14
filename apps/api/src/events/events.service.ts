import { randomBytes } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AttendeeStatus, Prisma } from '@nexus/db';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PeopleService } from '../people/people.service.js';
import { PlacesService } from '../places/places.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const EVENT_INCLUDE = {
  host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  place: { select: { id: true, slug: true, name: true, city: true, address: true, latitude: true, longitude: true } },
  attendees: {
    select: {
      profileId: true,
      status: true,
      checkedInAt: true,
      profile: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  },
  reviews: { select: { rating: true } },
} satisfies Prisma.EventInclude;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly people: PeopleService,
    private readonly places: PlacesService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private shape(
    event: Prisma.EventGetPayload<{ include: typeof EVENT_INCLUDE }>,
    viewerProfileId: string,
  ) {
    const going = event.attendees.filter((attendee) => attendee.status === 'GOING');
    const interested = event.attendees.filter((attendee) => attendee.status === 'INTERESTED');
    const mine = event.attendees.find((attendee) => attendee.profileId === viewerProfileId);
    const ratings = event.reviews.map((review) => review.rating);

    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description,
      coverUrl: event.coverUrl,
      visibility: event.visibility,
      startAt: event.startAt,
      endAt: event.endAt,
      locationText: event.locationText,
      place: event.place,
      host: event.host,
      isHost: event.hostId === viewerProfileId,
      capacity: event.capacity,
      goingCount: going.length,
      interestedCount: interested.length,
      spotsLeft: event.capacity ? Math.max(0, event.capacity - going.length) : null,
      myStatus: mine?.status ?? null,
      checkedIn: Boolean(mine?.checkedInAt),
      checkedInCount: event.attendees.filter((attendee) => attendee.checkedInAt).length,
      rating:
        ratings.length > 0
          ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
          : null,
      reviewCount: ratings.length,
      attendees: going.slice(0, 12).map((attendee) => attendee.profile),
      hasEnded: event.endAt ? event.endAt < new Date() : event.startAt < new Date(),
    };
  }

  private async circleIdsFor(profileId: string) {
    const memberships = await this.prisma.circleMember.findMany({
      where: { profileId },
      select: { circleId: true },
    });

    return memberships.map((row) => row.circleId);
  }

  private async visibleWhere(profileId: string) {
    const circleIds = await this.circleIdsFor(profileId);

    return {
      deletedAt: null,
      OR: [
        { visibility: 'PUBLIC' as const },
        { hostId: profileId },
        { visibility: 'CIRCLE' as const, circleId: { in: circleIds } },
        { attendees: { some: { profileId } } },
      ],
    } satisfies Prisma.EventWhereInput;
  }

  async list(userId: string, scope: 'upcoming' | 'going' | 'hosting' | 'past' = 'upcoming') {
    const me = await this.people.profileFor(userId);
    const base = await this.visibleWhere(me.id);
    const now = new Date();

    let where: Prisma.EventWhereInput = { AND: [base, { startAt: { gte: now } }] };

    if (scope === 'going') {
      where = {
        AND: [base, { attendees: { some: { profileId: me.id, status: { in: ['GOING', 'INTERESTED'] } } } }],
      };
    }

    if (scope === 'hosting') {
      where = { AND: [base, { hostId: me.id }] };
    }

    if (scope === 'past') {
      where = { AND: [base, { startAt: { lt: now } }] };
    }

    const events = await this.prisma.event.findMany({
      where,
      include: EVENT_INCLUDE,
      orderBy: { startAt: scope === 'past' ? 'desc' : 'asc' },
      take: 60,
    });

    return events.map((event) => this.shape(event, me.id));
  }

  async detail(userId: string, slug: string) {
    const me = await this.people.profileFor(userId);

    const event = await this.prisma.event.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null },
      include: EVENT_INCLUDE,
    });

    if (!event) throw new NotFoundException('No such event');

    if (event.visibility !== 'PUBLIC' && event.hostId !== me.id) {
      const isAttending = event.attendees.some((attendee) => attendee.profileId === me.id);
      const circleIds = await this.circleIdsFor(me.id);
      const inCircle = event.circleId ? circleIds.includes(event.circleId) : false;

      if (!isAttending && !inCircle) {
        throw new ForbiddenException('This event is not open to you');
      }
    }

    const shaped = this.shape(event, me.id);

    return {
      ...shaped,
      checkInCode: event.hostId === me.id ? event.checkInCode : null,
    };
  }

  async create(
    userId: string,
    input: {
      title: string;
      description?: string;
      startAt: string;
      endAt?: string;
      placeSlug?: string;
      locationText?: string;
      circleId?: string;
      visibility?: 'PUBLIC' | 'CIRCLE' | 'PRIVATE';
      capacity?: number;
    },
  ) {
    const me = await this.people.profileFor(userId);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Confirm your email address before creating events');
    }

    const startAt = new Date(input.startAt);
    const endAt = input.endAt ? new Date(input.endAt) : null;

    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Give the event a valid start time');
    }

    if (endAt && endAt <= startAt) {
      throw new BadRequestException('An event has to end after it starts');
    }

    if (startAt < new Date(Date.now() - 60 * 60 * 1000)) {
      throw new BadRequestException('Events cannot be created in the past');
    }

    let placeId: string | undefined;

    if (input.placeSlug) {
      const place = await this.prisma.place.findFirst({
        where: { slug: input.placeSlug.toLowerCase(), deletedAt: null },
        select: { id: true },
      });

      if (!place) throw new BadRequestException('That place does not exist');

      placeId = place.id;
    }

    if (input.circleId) {
      const membership = await this.prisma.circleMember.findUnique({
        where: { circleId_profileId: { circleId: input.circleId, profileId: me.id } },
      });

      if (!membership) throw new ForbiddenException('You are not in that circle');
    }

    const event = await this.prisma.event.create({
      data: {
        slug: await this.places.slugFor(input.title, 'event'),
        title: input.title.trim(),
        description: input.description,
        startAt,
        endAt,
        placeId,
        locationText: input.locationText,
        circleId: input.circleId,
        visibility: input.visibility ?? 'PUBLIC',
        capacity: input.capacity,
        hostId: me.id,
        checkInCode: randomBytes(4).toString('hex').toUpperCase(),
        attendees: { create: { profileId: me.id, status: 'GOING' } },
      },
    });

    await this.audit.record({
      action: 'event.created',
      actorUserId: userId,
      entityType: 'Event',
      entityId: event.id,
    });

    return { id: event.id, slug: event.slug, checkInCode: event.checkInCode };
  }

  async rsvp(userId: string, slug: string, status: AttendeeStatus) {
    const me = await this.people.profileFor(userId);

    const event = await this.prisma.event.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null },
      include: { attendees: { select: { profileId: true, status: true } }, host: { select: { userId: true } } },
    });

    if (!event) throw new NotFoundException('No such event');

    if (event.hostId === me.id && status === 'DECLINED') {
      throw new BadRequestException('A host cannot decline their own event');
    }

    if (status === 'GOING' && event.capacity) {
      const going = event.attendees.filter(
        (attendee) => attendee.status === 'GOING' && attendee.profileId !== me.id,
      ).length;

      if (going >= event.capacity) {
        throw new BadRequestException('This event is full');
      }
    }

    await this.prisma.eventAttendee.upsert({
      where: { eventId_profileId: { eventId: event.id, profileId: me.id } },
      create: { eventId: event.id, profileId: me.id, status },
      update: { status },
    });

    if (status === 'GOING' && event.hostId !== me.id) {
      await this.notifications.notify({
        userId: event.host.userId,
        category: 'EVENTS',
        title: `${me.displayName} is going to ${event.title}`,
        href: `/events/${event.slug}`,
      });
    }

    return { status };
  }

  async invite(userId: string, slug: string, usernames: string[]) {
    const me = await this.people.profileFor(userId);

    const event = await this.prisma.event.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null },
      select: { id: true, slug: true, title: true, hostId: true, startAt: true },
    });

    if (!event) throw new NotFoundException('No such event');

    const profiles = await this.prisma.profile.findMany({
      where: { username: { in: usernames.map((name) => name.toLowerCase()) } },
      select: { id: true, userId: true },
    });

    const blocked = await this.people.blockedIdsFor(me.id);
    const invitable = profiles.filter((profile) => !blocked.includes(profile.id));

    for (const profile of invitable) {
      await this.notifications.notify({
        userId: profile.userId,
        category: 'EVENTS',
        title: `${me.displayName} invited you to ${event.title}`,
        body: new Date(event.startAt).toLocaleString('en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        href: `/events/${event.slug}`,
      });
    }

    return { invited: invitable.length };
  }

  async checkIn(userId: string, slug: string, code: string) {
    const me = await this.people.profileFor(userId);

    const event = await this.prisma.event.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null },
      select: { id: true, checkInCode: true, startAt: true, endAt: true },
    });

    if (!event) throw new NotFoundException('No such event');

    if (event.checkInCode !== code.trim().toUpperCase()) {
      throw new BadRequestException('That check-in code is not right');
    }

    const opensAt = new Date(event.startAt.getTime() - 2 * 60 * 60 * 1000);

    if (new Date() < opensAt) {
      throw new BadRequestException('Check-in opens two hours before the event starts');
    }

    const attendee = await this.prisma.eventAttendee.upsert({
      where: { eventId_profileId: { eventId: event.id, profileId: me.id } },
      create: { eventId: event.id, profileId: me.id, status: 'GOING', checkedInAt: new Date() },
      update: { status: 'GOING', checkedInAt: new Date() },
    });

    return { checkedIn: true, at: attendee.checkedInAt };
  }

  async review(userId: string, slug: string, rating: number, body?: string) {
    const me = await this.people.profileFor(userId);

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Ratings run from 1 to 5');
    }

    const event = await this.prisma.event.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null },
      include: { attendees: { where: { profileId: me.id }, select: { profileId: true } } },
    });

    if (!event) throw new NotFoundException('No such event');

    const ended = event.endAt ? event.endAt < new Date() : event.startAt < new Date();

    if (!ended) {
      throw new BadRequestException('You can review an event once it has happened');
    }

    if (event.attendees.length === 0) {
      throw new ForbiddenException('Only people who went can review this event');
    }

    await this.prisma.eventReview.upsert({
      where: { eventId_profileId: { eventId: event.id, profileId: me.id } },
      create: { eventId: event.id, profileId: me.id, rating, body },
      update: { rating, body },
    });

    const reviews = await this.prisma.eventReview.findMany({
      where: { eventId: event.id },
      select: { rating: true },
    });

    return {
      rating:
        Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) /
        10,
      reviewCount: reviews.length,
    };
  }

  async attendees(userId: string, slug: string) {
    const me = await this.people.profileFor(userId);

    const event = await this.prisma.event.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null },
      include: EVENT_INCLUDE,
    });

    if (!event) throw new NotFoundException('No such event');

    const isHost = event.hostId === me.id;

    return event.attendees.map((attendee) => ({
      ...attendee.profile,
      status: attendee.status,
      checkedIn: isHost ? Boolean(attendee.checkedInAt) : undefined,
    }));
  }

  async cancel(userId: string, slug: string) {
    const me = await this.people.profileFor(userId);

    const event = await this.prisma.event.findFirst({
      where: { slug: slug.toLowerCase(), deletedAt: null },
      include: { attendees: { include: { profile: { select: { userId: true } } } } },
    });

    if (!event) throw new NotFoundException('No such event');

    if (event.hostId !== me.id) throw new ForbiddenException('Only the host can cancel this event');

    await this.prisma.event.update({ where: { id: event.id }, data: { deletedAt: new Date() } });

    for (const attendee of event.attendees) {
      if (attendee.profileId === me.id) continue;

      await this.notifications.notify({
        userId: attendee.profile.userId,
        category: 'EVENTS',
        title: `${event.title} was cancelled`,
        href: '/events',
      });
    }

    return { cancelled: true };
  }
}
