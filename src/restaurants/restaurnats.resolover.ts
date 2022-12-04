import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateRestaurantDto } from './dtos/create-restaurant.dto';
import { Restaurant } from './entities/restaurant.entity';

@Resolver((of) => Restaurant)
export class RestaurnatResolover {
  @Query((returns) => [Restaurant])
  restaurants(@Args('verganOnly') veganOnly: boolean): Restaurant[] {
    return [];
  }

  @Mutation((returns) => Boolean)
  createRestaurants(@Args() CreateRestaurantDto: CreateRestaurantDto): boolean {
    return true;
  }
}
