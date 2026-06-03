import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { DeviceToken, DevicePlatform } from './entities/device-token.entity';
import { UsersService } from '../users/users.service';
import { NotificationPreferences } from '../users/entities/user.entity';

export type NotificationCategory = keyof NotificationPreferences;

export type PushPayload = {
  title: string;
  body: string;
  category?: NotificationCategory;
  data?: Record<string, any>;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo();

  constructor(
    @InjectRepository(DeviceToken)
    private readonly tokensRepo: Repository<DeviceToken>,
    private readonly usersService: UsersService,
  ) {}

  async registerToken(
    userId: string,
    token: string,
    platform?: DevicePlatform,
  ): Promise<DeviceToken> {
    if (!Expo.isExpoPushToken(token)) {
      throw new Error('Invalid Expo push token');
    }

    const existing = await this.tokensRepo.findOne({ where: { token } });
    if (existing) {
      existing.userId = userId;
      if (platform) existing.platform = platform;
      return this.tokensRepo.save(existing);
    }

    const record = this.tokensRepo.create({
      userId,
      token,
      platform: platform ?? null,
    });
    return this.tokensRepo.save(record);
  }

  async removeToken(userId: string, token: string): Promise<void> {
    await this.tokensRepo.delete({ userId, token });
  }

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (userIds.length === 0) return;

    let recipients = userIds;
    if (payload.category) {
      const users = await this.usersService.findManyByIds(userIds);
      const cat = payload.category;
      recipients = users
        .filter((u) => u.notificationPreferences?.[cat] !== false)
        .map((u) => u.id);
      if (recipients.length === 0) return;
    }

    const tokens = await this.tokensRepo.find({
      where: { userId: In(recipients) },
    });
    if (tokens.length === 0) return;
    await this.send(tokens.map((t) => t.token), payload);
  }

  async send(tokens: string[], payload: PushPayload): Promise<void> {
    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t))
      .map((to) => ({
        to,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        ...(payload.data?.orderId
          ? { channelId: 'orders', threadId: `order-${payload.data.orderId}` }
          : {}),
      }));

    if (messages.length === 0) return;

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const chunkTickets = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...chunkTickets);
      } catch (e) {
        this.logger.error('Push send failed', e as any);
      }
    }

    await this.handleTickets(messages, tickets);
  }

  private async handleTickets(
    messages: ExpoPushMessage[],
    tickets: ExpoPushTicket[],
  ): Promise<void> {
    const badTokens: string[] = [];

    tickets.forEach((ticket, idx) => {
      if (ticket.status === 'error') {
        const msg = messages[idx];
        const errCode = (ticket.details as any)?.error;
        this.logger.warn(
          `Push error for ${msg.to}: ${ticket.message} (${errCode})`,
        );
        if (errCode === 'DeviceNotRegistered') {
          const to = Array.isArray(msg.to) ? msg.to[0] : msg.to;
          if (typeof to === 'string') badTokens.push(to);
        }
      }
    });

    if (badTokens.length > 0) {
      await this.tokensRepo.delete({ token: In(badTokens) });
      this.logger.log(`Removed ${badTokens.length} invalid tokens`);
    }
  }
}