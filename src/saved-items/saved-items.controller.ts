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
import { SavedItemsService } from './saved-items.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateSavedAddressDto,
  UpdateSavedAddressDto,
} from './dto/saved-address.dto';
import {
  CreateSavedRestaurantDto,
  UpdateSavedRestaurantDto,
} from './dto/saved-restaurant.dto';

@Controller('saved')
@UseGuards(JwtAuthGuard)
export class SavedItemsController {
  constructor(private readonly service: SavedItemsService) {}

  @Get('addresses')
  listAddresses(@CurrentUser() user: any) {
    return this.service.listAddresses(user.id);
  }

  @Post('addresses')
  createAddress(
    @CurrentUser() user: any,
    @Body() dto: CreateSavedAddressDto,
  ) {
    return this.service.createAddress(user.id, dto);
  }

  @Patch('addresses/:id')
  updateAddress(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSavedAddressDto,
  ) {
    return this.service.updateAddress(user.id, id, dto);
  }

  @Delete('addresses/:id')
  deleteAddress(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.deleteAddress(user.id, id);
  }

  @Get('restaurants')
  listRestaurants(@CurrentUser() user: any) {
    return this.service.listRestaurants(user.id);
  }

  @Post('restaurants')
  createRestaurant(
    @CurrentUser() user: any,
    @Body() dto: CreateSavedRestaurantDto,
  ) {
    return this.service.createRestaurant(user.id, dto);
  }

  @Patch('restaurants/:id')
  updateRestaurant(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSavedRestaurantDto,
  ) {
    return this.service.updateRestaurant(user.id, id, dto);
  }

  @Delete('restaurants/:id')
  deleteRestaurant(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.deleteRestaurant(user.id, id);
  }
}