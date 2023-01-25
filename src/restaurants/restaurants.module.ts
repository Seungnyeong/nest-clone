import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { provideCustomRepository } from "src/common/utils/custom-repository.util";
import { Category } from "./entities/category.entity";
import { Restaurant } from "./entities/restaurant.entity";
import { CategoryRepository } from "./repositories/category.repository";
import { RestaurantResolver } from "./restaurants.resolver";

import { RestaurantService } from "./restaurants.service";

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, Category])],
  providers: [
    provideCustomRepository(Category, CategoryRepository),
    RestaurantResolver,
    RestaurantService,
  ],
})
export class RestaurantsModule {}
