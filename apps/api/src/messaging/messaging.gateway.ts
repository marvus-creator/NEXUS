import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TokensService, ACCESS_COOKIE } from '../auth/tokens.service.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MessagingService } from './messaging.service.js';

type SocketState = {
  userId: string;
  profileId: string;
  displayName: string;
};

function cookieValue(header: string | undefined, name: string) {
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }

  return undefined;
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private readonly state = new Map<string, SocketState>();

  constructor(
    private readonly tokens: TokensService,
    private readonly messaging: MessagingService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private stateFor(client: Socket) {
    const state = this.state.get(client.id);

    if (!state) {
      client.emit('error', { message: 'Not authenticated' });
      client.disconnect(true);
      return null;
    }

    return state;
  }

  async handleConnection(client: Socket) {
    try {
      const raw =
        cookieValue(client.handshake.headers.cookie, ACCESS_COOKIE) ??
        (typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : undefined);

      if (!raw) {
        client.disconnect(true);
        return;
      }

      const payload = await this.tokens.verifyAccessToken(raw);

      if (payload.status === 'SUSPENDED' || payload.status === 'DEACTIVATED') {
        client.disconnect(true);
        return;
      }

      const profile = await this.prisma.profile.findUnique({
        where: { userId: payload.sub },
        select: { id: true, displayName: true },
      });

      if (!profile) {
        client.disconnect(true);
        return;
      }

      this.state.set(client.id, {
        userId: payload.sub,
        profileId: profile.id,
        displayName: profile.displayName,
      });

      const conversationIds = await this.messaging.conversationIdsFor(profile.id);

      for (const id of conversationIds) {
        await client.join(`conversation:${id}`);
      }

      await client.join(`profile:${profile.id}`);

      client.emit('ready', { conversations: conversationIds.length });

      for (const id of conversationIds) {
        client.to(`conversation:${id}`).emit('presence', {
          profileId: profile.id,
          displayName: profile.displayName,
          online: true,
        });
      }
    } catch (error) {
      this.logger.warn(`Rejected socket ${client.id}: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const state = this.state.get(client.id);

    if (!state) return;

    this.state.delete(client.id);

    const conversationIds = await this.messaging.conversationIdsFor(state.profileId);

    for (const id of conversationIds) {
      client.to(`conversation:${id}`).emit('presence', {
        profileId: state.profileId,
        displayName: state.displayName,
        online: false,
      });
    }
  }

  @SubscribeMessage('message:send')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; body: string; replyToId?: string },
  ) {
    const state = this.stateFor(client);

    if (!state) return;

    try {
      const { message } = await this.messaging.send(
        state.userId,
        data.conversationId,
        data.body,
        data.replyToId,
      );

      client.nsp.to(`conversation:${data.conversationId}`).emit('message:new', message);

      await this.messaging.notifyRecipients(data.conversationId, state.profileId, data.body);

      return { ok: true, id: message.id };
    } catch (error) {
      client.emit('error', { message: (error as Error).message });
      return { ok: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('typing')
  async onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; typing: boolean },
  ) {
    const state = this.stateFor(client);

    if (!state) return;

    client.to(`conversation:${data.conversationId}`).emit('typing', {
      conversationId: data.conversationId,
      profileId: state.profileId,
      displayName: state.displayName,
      typing: data.typing,
    });
  }

  @SubscribeMessage('read')
  async onRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const state = this.stateFor(client);

    if (!state) return;

    await this.messaging.markRead(state.userId, data.conversationId);

    client.to(`conversation:${data.conversationId}`).emit('read', {
      conversationId: data.conversationId,
      profileId: state.profileId,
      at: new Date().toISOString(),
    });
  }

  @SubscribeMessage('conversation:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const state = this.stateFor(client);

    if (!state) return;

    const allowed = await this.messaging.conversationIdsFor(state.profileId);

    if (!allowed.includes(data.conversationId)) {
      client.emit('error', { message: 'You are not in this conversation' });
      return { ok: false };
    }

    await client.join(`conversation:${data.conversationId}`);
    return { ok: true };
  }
}
