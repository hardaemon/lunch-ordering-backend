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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
  
  @Get('invite/:orderId')
  async invitePage(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const html = `
  <!DOCTYPE html>
  <html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Приглашение в заказ</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f5f5f7;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 20px;
      }
      .card {
        background: #fff;
        border-radius: 16px;
        padding: 32px 24px;
        max-width: 400px;
        width: 100%;
        text-align: center;
        box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      }
      h1 { font-size: 22px; margin-bottom: 12px; color: #000; }
      p { color: #666; margin-bottom: 24px; line-height: 1.5; }
      .btn {
        display: block;
        width: 100%;
        padding: 14px;
        background: #007AFF;
        color: #fff;
        text-decoration: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .btn-secondary { background: #f0f0f0; color: #000; }
      .small { font-size: 13px; color: #999; margin-top: 16px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Приглашение в заказ</h1>
      <p>Вас приглашают присоединиться к совместному заказу.</p>
      <a href="grouporder://order/${orderId}" class="btn">Открыть в приложении</a>
      <a href="grouporder://order/${orderId}" class="btn btn-secondary" id="retry">Попробовать снова</a>
      <p class="small">
        Если приложение не открылось — установите его и попробуйте снова.
        <br />Ссылка работает только в приложении Group Order.
      </p>
    </div>
    <script>
      // Автоматически пробуем открыть deep link
      setTimeout(() => {
        window.location.href = 'grouporder://order/${orderId}';
      }, 300);
    </script>
  </body>
  </html>
    `;
    res.type('text/html').send(html);
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