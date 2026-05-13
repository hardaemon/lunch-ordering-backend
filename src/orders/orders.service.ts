import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderParticipant } from './entities/order-participant.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatus } from './enums/order-status.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { OrdersGateway } from './orders.gateway';
import { ORDER_EVENTS } from './events/order-events.types';
import { NotificationsService } from '../notifications/notifications.service';
import { ORDER_STATUS_LABELS } from './events/order-events.types';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    @InjectRepository(OrderParticipant)
    private readonly participantsRepo: Repository<OrderParticipant>,
    @InjectRepository(OrderItem)
    private readonly itemsRepo: Repository<OrderItem>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly gateway: OrdersGateway,
    private readonly notifications: NotificationsService,
  ) {}

  // ============== Создание заказа ==============
  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    const deadline = new Date(dto.deadlineAt);
    if (deadline.getTime() <= Date.now()) {
      throw new BadRequestException('Deadline must be in the future');
    }

    // Транзакция: создаём заказ И сразу делаем создателя участником
    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        ownerId: userId,
        restaurantName: dto.restaurantName,
        restaurantUrl: dto.restaurantUrl ?? null,
        deliveryAddress: dto.deliveryAddress,
        deliveryCost: dto.deliveryCost.toFixed(2),
        freeDeliveryThreshold:
          dto.freeDeliveryThreshold != null
            ? dto.freeDeliveryThreshold.toFixed(2)
            : null,
        deadlineAt: deadline,
        status: OrderStatus.COLLECTING,
      });
      const saved = await manager.save(order);

      const participant = manager.create(OrderParticipant, {
        orderId: saved.id,
        userId,
      });
      await manager.save(participant);

      return this.loadFullOrder(saved.id, manager);
    });
  }

  // ============== Получение заказа ==============
  async getOrderById(orderId: string, userId: string): Promise<Order> {
    const order = await this.loadFullOrder(orderId);
    await this.ensureCanView(order, userId);
    return order;
  }

  // Списки заказов
  async listForUser(userId: string): Promise<Order[]> {
    // Заказы, где пользователь — владелец или участник
    return this.ordersRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.participants', 'p')
      .leftJoinAndSelect('p.user', 'pu')
      .leftJoinAndSelect('order.items', 'i')
      .leftJoinAndSelect('order.owner', 'o')
      .where(
        'order.ownerId = :userId OR EXISTS (SELECT 1 FROM order_participants op WHERE op."orderId" = order.id AND op."userId" = :userId)',
        { userId },
      )
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  // ============== Обновление заказа ==============
  async updateOrder(
    orderId: string,
    userId: string,
    dto: UpdateOrderDto,
  ): Promise<Order> {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.ownerId !== userId) {
      throw new ForbiddenException('Only owner can update the order');
    }

    if (dto.restaurantName !== undefined) order.restaurantName = dto.restaurantName;
    if (dto.restaurantUrl !== undefined) order.restaurantUrl = dto.restaurantUrl ?? null;
    if (dto.deliveryAddress !== undefined) order.deliveryAddress = dto.deliveryAddress;
    if (dto.deliveryCost !== undefined) order.deliveryCost = dto.deliveryCost.toFixed(2);
    if (dto.freeDeliveryThreshold !== undefined) {
      order.freeDeliveryThreshold =
        dto.freeDeliveryThreshold != null
          ? dto.freeDeliveryThreshold.toFixed(2)
          : null;
    }
    if (dto.deadlineAt !== undefined) order.deadlineAt = new Date(dto.deadlineAt);
    if (dto.status !== undefined) order.status = dto.status;

    await this.ordersRepo.save(order);
    const full = await this.loadFullOrder(order.id);
    this.gateway.emitToOrder(orderId, ORDER_EVENTS.ORDER_UPDATED, { order: full });
    if (dto.status !== undefined) {
      const participantUserIds = full.participants
        .map((p) => p.userId)
        .filter((id) => id !== userId);
      await this.notifications.sendToUsers(participantUserIds, {
        title: full.restaurantName,
        body: `Статус: ${ORDER_STATUS_LABELS[dto.status]}`,
        category: 'statusChanges',
        data: { orderId: full.id, type: 'status_changed' },
      });
    }
    return full;
  }

  async deleteOrder(orderId: string, userId: string): Promise<void> {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.ownerId !== userId) {
      throw new ForbiddenException('Only owner can delete the order');
    }
    await this.ordersRepo.remove(order);
  }

  // ============== Присоединение к заказу ==============
  async joinOrder(orderId: string, userId: string): Promise<Order> {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.COLLECTING) {
      throw new BadRequestException('Order is no longer collecting participants');
    }

    const existing = await this.participantsRepo.findOne({
      where: { orderId, userId },
    });
    if (!existing) {
      const participant = this.participantsRepo.create({ orderId, userId });
      const saved = await this.participantsRepo.save(participant);
      // Подгружаем с user для отправки клиентам
      const full = await this.participantsRepo.findOne({
        where: { id: saved.id },
        relations: ['user'],
      });
      if (full) {
        this.gateway.emitToOrder(orderId, ORDER_EVENTS.PARTICIPANT_JOINED, {
          participant: full,
        });
      }
    }

    return this.loadFullOrder(orderId);
  }

  // ============== Позиции ==============
  async addItem(
    orderId: string,
    userId: string,
    dto: CreateOrderItemDto,
  ): Promise<OrderItem> {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.COLLECTING) {
      throw new BadRequestException('Order is not accepting items anymore');
    }
    if (new Date() > order.deadlineAt) {
      throw new BadRequestException('Deadline has passed');
    }

    const participant = await this.participantsRepo.findOne({
      where: { orderId, userId },
    });
    if (!participant) {
      throw new ForbiddenException('You must join the order first');
    }

    const item = this.itemsRepo.create({
      orderId,
      addedById: userId,
      name: dto.name,
      pricePerUnit: dto.pricePerUnit.toFixed(2),
      quantity: dto.quantity,
    });
    const saved = await this.itemsRepo.save(item);
    const full = await this.itemsRepo.findOne({
      where: { id: saved.id },
      relations: ['addedBy'],
    });
    if (full) {
      this.gateway.emitToOrder(orderId, ORDER_EVENTS.ITEM_ADDED, { item: full });
    }
    if (userId !== order.ownerId) {
      await this.notifications.sendToUsers([order.ownerId], {
        title: order.restaurantName,
        body: `${full?.addedBy?.name ?? 'Кто-то'} добавил(а): ${full!.name}`,
        category: 'newItems',
        data: { orderId: order.id, type: 'item_added' },
      });
    }
    return full!;
  }

  async updateItem(
    itemId: string,
    userId: string,
    dto: UpdateOrderItemDto,
  ): Promise<OrderItem> {
    const item = await this.itemsRepo.findOne({
      where: { id: itemId },
      relations: ['order'],
    });
    if (!item) throw new NotFoundException('Item not found');

    const isOwner = item.order.ownerId === userId;
    const isAuthor = item.addedById === userId;

    if (dto.isOrdered !== undefined && !isOwner) {
      throw new ForbiddenException('Only order owner can mark items as ordered');
    }
    const editingContent =
      dto.name !== undefined ||
      dto.pricePerUnit !== undefined ||
      dto.quantity !== undefined;
    if (editingContent && !isAuthor && !isOwner) {
      throw new ForbiddenException('You can only edit your own items');
    }
    if (
      editingContent &&
      !isOwner &&
      (item.order.status !== OrderStatus.COLLECTING ||
        new Date() > item.order.deadlineAt)
    ) {
      throw new BadRequestException('Cannot edit items after deadline');
    }

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.pricePerUnit !== undefined) item.pricePerUnit = dto.pricePerUnit.toFixed(2);
    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.isOrdered !== undefined) item.isOrdered = dto.isOrdered;

    const saved = await this.itemsRepo.save(item);
    const full = await this.itemsRepo.findOne({
      where: { id: saved.id },
      relations: ['addedBy'],
    });
    if (full) {
      this.gateway.emitToOrder(item.orderId, ORDER_EVENTS.ITEM_UPDATED, { item: full });
    }
    return full!;
  }

  async deleteItem(itemId: string, userId: string): Promise<void> {
    const item = await this.itemsRepo.findOne({
      where: { id: itemId },
      relations: ['order'],
    });
    if (!item) throw new NotFoundException('Item not found');

    const isOwner = item.order.ownerId === userId;
    const isAuthor = item.addedById === userId;
    if (!isOwner && !isAuthor) {
      throw new ForbiddenException('Cannot delete this item');
    }
    if (
      !isOwner &&
      (item.order.status !== OrderStatus.COLLECTING ||
        new Date() > item.order.deadlineAt)
    ) {
      throw new BadRequestException('Cannot delete items after deadline');
    }

    const orderId = item.orderId;
    const itemIdToDelete = item.id;
    await this.itemsRepo.remove(item);
    this.gateway.emitToOrder(orderId, ORDER_EVENTS.ITEM_DELETED, {
      itemId: itemIdToDelete,
    });
  }


  // ============== Оплата ==============
  async markAsPaid(orderId: string, userId: string): Promise<OrderParticipant> {
    const participant = await this.participantsRepo.findOne({
      where: { orderId, userId },
    });
    if (!participant) throw new NotFoundException('You are not a participant');
    participant.hasPaid = true;
    const saved = await this.participantsRepo.save(participant);
    const full = await this.participantsRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
    if (full) {
      this.gateway.emitToOrder(orderId, ORDER_EVENTS.PAYMENT_MARKED, {
        participant: full,
      });
    }
    // Уведомляем организатора
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (order && order.ownerId !== userId) {
      await this.notifications.sendToUsers([order.ownerId], {
        title: order.restaurantName,
        body: `${full?.user?.name ?? 'Участник'} отметил(а) оплату`,
        category: 'payments',
        data: { orderId, type: 'payment_marked' },
      });
    }
    return saved;
  }

  async confirmPayment(
    orderId: string,
    participantUserId: string,
    requesterId: string,
  ): Promise<OrderParticipant> {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.ownerId !== requesterId) {
      throw new ForbiddenException('Only owner can confirm payments');
    }
    const participant = await this.participantsRepo.findOne({
      where: { orderId, userId: participantUserId },
    });
    if (!participant) throw new NotFoundException('Participant not found');
    participant.paymentConfirmedAt = new Date();
    const saved = await this.participantsRepo.save(participant);
    const full = await this.participantsRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
    if (full) {
      this.gateway.emitToOrder(orderId, ORDER_EVENTS.PAYMENT_CONFIRMED, {
        participant: full,
      });
    }
    // Уведомляем плательщика
    if (participantUserId !== requesterId) {
      await this.notifications.sendToUsers([participantUserId], {
        title: order.restaurantName,
        body: 'Организатор подтвердил получение вашего платежа',
        category: 'payments',
        data: { orderId, type: 'payment_confirmed' },
      });
    }
    return saved;
  }

  // ============== Хелперы ==============
  private async loadFullOrder(orderId: string, manager?: any): Promise<Order> {
    const repo = manager ? manager.getRepository(Order) : this.ordersRepo;
    const order = await repo.findOne({
      where: { id: orderId },
      relations: ['owner', 'participants', 'participants.user', 'items', 'items.addedBy'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private async ensureCanView(order: Order, userId: string): Promise<void> {
    if (order.ownerId === userId) return;
    const isParticipant = order.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You do not have access to this order');
    }
  }
}