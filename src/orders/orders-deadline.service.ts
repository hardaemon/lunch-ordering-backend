import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersDeadlineService {
  private readonly logger = new Logger(OrdersDeadlineService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    await this.sendUpcomingReminders();
    await this.handleExpired();
  }

  private async sendUpcomingReminders() {
    const now = new Date();
    const in5Min = new Date(now.getTime() + 5 * 60 * 1000);

    const orders = await this.ordersRepo.find({
      where: {
        status: OrderStatus.COLLECTING,
        deadlineAt: Between(now, in5Min),
        deadlineReminderSentAt: IsNull(),
      },
      relations: ['participants'],
    });

    for (const order of orders) {
      const userIds = order.participants.map((p) => p.userId);
      await this.notifications.sendToUsers(userIds, {
        title: order.restaurantName,
        body: 'Через 5 минут закроется сбор позиций',
        category: 'deadline',
        data: { orderId: order.id, type: 'deadline_soon' },
      });
      order.deadlineReminderSentAt = now;
      await this.ordersRepo.save(order);
      this.logger.log(`Deadline reminder sent for order ${order.id}`);
    }
  }

  private async handleExpired() {
    const now = new Date();
    const orders = await this.ordersRepo.find({
      where: {
        status: OrderStatus.COLLECTING,
        deadlineAt: LessThanOrEqual(now),
        deadlineExpiredHandledAt: IsNull(),
      },
      relations: ['participants'],
    });

    for (const order of orders) {
      const userIds = order.participants.map((p) => p.userId);
      await this.notifications.sendToUsers(userIds, {
        title: order.restaurantName,
        body: 'Дедлайн истёк — сбор позиций закрыт',
        category: 'deadline',
        data: { orderId: order.id, type: 'deadline_expired' },
      });
      order.status = OrderStatus.CONFIRMING;
      order.deadlineExpiredHandledAt = now;
      await this.ordersRepo.save(order);
      this.logger.log(`Order ${order.id} deadline expired, switched to PREPARING`);
    }
  }
}