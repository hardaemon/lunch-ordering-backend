export enum OrderStatus {
  COLLECTING = 'collecting',      // Сбор позиций
  CONFIRMING = 'confirming',      // Подтверждение
  PREPARING = 'preparing',        // Готовится
  ON_THE_WAY = 'on_the_way',      // В пути
  DELIVERED = 'delivered',        // Доставлено
  CLOSED = 'closed',              // Закрыт
  CANCELLED = 'cancelled',        // Отменён
  COMPLAINT = 'complaint',        // Претензии
}