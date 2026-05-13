import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedItemsService } from './saved-items.service';
import { SavedItemsController } from './saved-items.controller';
import { SavedAddress } from './entities/saved-address.entity';
import { SavedRestaurant } from './entities/saved-restaurant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SavedAddress, SavedRestaurant])],
  providers: [SavedItemsService],
  controllers: [SavedItemsController],
})
export class SavedItemsModule {}