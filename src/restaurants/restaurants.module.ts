import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantService } from './restaurants.service';
import { RestaurnatResolover } from './restaurnats.resolover';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant])],
  providers: [RestaurnatResolover, RestaurantService],
})
export class RestaurantsModule {}
