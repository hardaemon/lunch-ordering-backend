import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger, UseFilters, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { OrdersService } from './orders.service';
import {
  OrderEventName,
  OrderEventPayloads,
  roomFor,
} from './events/order-events.types';
import { AllWsExceptionsFilter } from './filters/ws-exception.filter';

type AuthedSocket = Socket & { data: { userId: string } };

@WebSocketGateway({ cors: { origin: '*' } })
@UseFilters(new AllWsExceptionsFilter())
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(OrdersGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  // ============== Подключение / отключение ==============
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new Error('No token provided');
      }
      const payload = this.jwtService.verify<{ sub: string }>(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new Error('User not found');
      }
      (client as AuthedSocket).data.userId = user.id;
      this.logger.log(`Client connected: ${client.id} (user ${user.id})`);
    } catch (e: any) {
      this.logger.warn(`Rejected WS connection: ${e.message}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ============== Команды от клиента ==============
  @SubscribeMessage('order:subscribe')
  async onSubscribe(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { orderId: string },
  ) {
    if (!body?.orderId) {
      throw new WsException('orderId is required');
    }
    // Проверяем, что этот юзер вообще может смотреть заказ
    // (getOrderById сам бросит 403/404 если нет доступа)
    try {
      await this.ordersService.getOrderById(body.orderId, client.data.userId);
    } catch (e: any) {
      throw new WsException(e.message || 'Cannot subscribe');
    }
    const room = roomFor(body.orderId);
    await client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage('order:unsubscribe')
  async onUnsubscribe(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { orderId: string },
  ) {
    if (!body?.orderId) return { ok: false };
    await client.leave(roomFor(body.orderId));
    return { ok: true };
  }

  // ============== Публичный API для сервиса ==============
  emitToOrder<E extends OrderEventName>(
    orderId: string,
    event: E,
    payload: OrderEventPayloads[E],
  ) {
    this.server.to(roomFor(orderId)).emit(event, payload);
  }

  // ============== Хелперы ==============
  private extractToken(client: Socket): string | null {
    // Сначала пробуем auth.token (правильный способ)
    const authToken = client.handshake?.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }
    // Запасной вариант — заголовок Authorization
    const header = client.handshake?.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    return null;
  }
}