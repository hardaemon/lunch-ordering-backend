import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard) // все эндпоинты защищены
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.ordersService.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.ordersService.getOrderById(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.updateOrder(id, user.id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.ordersService.deleteOrder(id, user.id);
  }

  // ===== Присоединение по ссылке =====
  @Post(':id/join')
  join(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.ordersService.joinOrder(id, user.id);
  }

  // ===== Позиции =====
  @Post(':id/items')
  addItem(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateOrderItemDto,
  ) {
    return this.ordersService.addItem(id, user.id, dto);
  }

  @Patch('items/:itemId')
  updateItem(
    @CurrentUser() user: any,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.ordersService.updateItem(itemId, user.id, dto);
  }

  @Delete('items/:itemId')
  deleteItem(
    @CurrentUser() user: any,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ) {
    return this.ordersService.deleteItem(itemId, user.id);
  }

  // ===== Оплата =====
  @Post(':id/pay')
  markPaid(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.ordersService.markAsPaid(id, user.id);
  }

  @Post(':id/participants/:userId/confirm-payment')
  confirmPayment(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) participantUserId: string,
  ) {
    return this.ordersService.confirmPayment(id, participantUserId, user.id);
  }
}