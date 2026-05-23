import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderParticipant } from '../entities/order-participant.entity';
import { OrderStatus } from '../enums/order-status.enum';

export const ORDER_EVENTS = {
  PARTICIPANT_JOINED: 'participant.joined',
  ITEM_ADDED: 'item.added',
  ITEM_UPDATED: 'item.updated',
  ITEM_DELETED: 'item.deleted',
  ORDER_UPDATED: 'order.updated',
  PAYMENT_MARKED: 'payment.marked',
  PAYMENT_CONFIRMED: 'payment.confirmed',
} as const;

export type OrderEventName = (typeof ORDER_EVENTS)[keyof typeof ORDER_EVENTS];

export type OrderEventPayloads = {
  [ORDER_EVENTS.PARTICIPANT_JOINED]: { participant: OrderParticipant };
  [ORDER_EVENTS.ITEM_ADDED]: { item: OrderItem };
  [ORDER_EVENTS.ITEM_UPDATED]: { item: OrderItem };
  [ORDER_EVENTS.ITEM_DELETED]: { itemId: string };
  [ORDER_EVENTS.ORDER_UPDATED]: { order: Order };
  [ORDER_EVENTS.PAYMENT_MARKED]: { participant: OrderParticipant };
  [ORDER_EVENTS.PAYMENT_CONFIRMED]: { participant: OrderParticipant };
};

export function roomFor(orderId: string): string {
  return `order:${orderId}`;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.COLLECTING]: 'Сбор позиций',
  [OrderStatus.CONFIRMING]: 'Подтверждение',
  [OrderStatus.PREPARING]: 'Готовится',
  [OrderStatus.ON_THE_WAY]: 'В пути',
  [OrderStatus.DELIVERED]: 'Доставлено',
  [OrderStatus.CLOSED]: 'Закрыт',
  [OrderStatus.CANCELLED]: 'Отменён',
  [OrderStatus.COMPLAINT]: 'Претензии',
};