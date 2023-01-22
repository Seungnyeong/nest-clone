import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantService } from './restaurants.service';
import { RestaurnatResolver } from './restaurnats.resolver';

@Module({
    imports: [TypeOrmModule.forFeature([Restaurant])],
    providers: [RestaurnatResolver, RestaurantService]
})
export class RestaurantsModule {}
