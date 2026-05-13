import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedAddress } from './entities/saved-address.entity';
import { SavedRestaurant } from './entities/saved-restaurant.entity';
import {
  CreateSavedAddressDto,
  UpdateSavedAddressDto,
} from './dto/saved-address.dto';
import {
  CreateSavedRestaurantDto,
  UpdateSavedRestaurantDto,
} from './dto/saved-restaurant.dto';

@Injectable()
export class SavedItemsService {
  constructor(
    @InjectRepository(SavedAddress)
    private readonly addressesRepo: Repository<SavedAddress>,
    @InjectRepository(SavedRestaurant)
    private readonly restaurantsRepo: Repository<SavedRestaurant>,
  ) {}

  // ============== Addresses ==============
  listAddresses(userId: string) {
    return this.addressesRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  createAddress(userId: string, dto: CreateSavedAddressDto) {
    const entity = this.addressesRepo.create({ ...dto, userId });
    return this.addressesRepo.save(entity);
  }

  async updateAddress(
    userId: string,
    id: string,
    dto: UpdateSavedAddressDto,
  ) {
    const entity = await this.addressesRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Address not found');
    if (entity.userId !== userId) throw new ForbiddenException();
    Object.assign(entity, dto);
    return this.addressesRepo.save(entity);
  }

  async deleteAddress(userId: string, id: string) {
    const entity = await this.addressesRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Address not found');
    if (entity.userId !== userId) throw new ForbiddenException();
    await this.addressesRepo.remove(entity);
  }

  // ============== Restaurants ==============
  listRestaurants(userId: string) {
    return this.restaurantsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  createRestaurant(userId: string, dto: CreateSavedRestaurantDto) {
    const entity = this.restaurantsRepo.create({
      userId,
      name: dto.name,
      url: dto.url ?? null,
    });
    return this.restaurantsRepo.save(entity);
  }

  async updateRestaurant(
    userId: string,
    id: string,
    dto: UpdateSavedRestaurantDto,
  ) {
    const entity = await this.restaurantsRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Restaurant not found');
    if (entity.userId !== userId) throw new ForbiddenException();
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.url !== undefined) entity.url = dto.url ?? null;
    return this.restaurantsRepo.save(entity);
  }

  async deleteRestaurant(userId: string, id: string) {
    const entity = await this.restaurantsRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Restaurant not found');
    if (entity.userId !== userId) throw new ForbiddenException();
    await this.restaurantsRepo.remove(entity);
  }
}