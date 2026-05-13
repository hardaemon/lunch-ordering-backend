export enum OrderStatus {
  COLLECTING = 'collecting',     // Сбор позиций
  PREPARING = 'preparing',       // Готовится
  ON_THE_WAY = 'on_the_way',     // В пути
  DELIVERED = 'delivered',       // Доставлено (сбор оплат)
  CLOSED = 'closed',             // Заказ закрыт
}