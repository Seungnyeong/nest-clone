import {
  ArgsType,
  Field,
  InputType,
  Int,
  ObjectType,
  OmitType,
  PickType,
} from "@nestjs/graphql";
import { IsBoolean, IsString, Length } from "class-validator";
import { CoreOutput } from "src/common/dtos/output.dto";
import { Restaurant } from "../entities/restaurant.entity";

@InputType()
export class CreateRestaurantInput extends PickType(Restaurant, [
  "name",
  "coverImage",
  "address",
]) {
  @Field((type) => String)
  categoryName: string;
}

@ObjectType()
export class CreateRestaurantOutput extends CoreOutput {
  @Field((type) => Int)
  restaurantId?: number;
}
