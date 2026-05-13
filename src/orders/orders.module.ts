import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { Order } from './entities/order.entity';
import { OrderParticipant } from './entities/order-participant.entity';
import { OrderItem } from './entities/order-item.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersDeadlineService } from './orders-deadline.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderParticipant, OrderItem]),
    UsersModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway, OrdersDeadlineService],
  exports: [OrdersService],
})
export class OrdersModule {}