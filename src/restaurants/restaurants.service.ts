import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { Raw, Repository } from "typeorm";
import { AllCategoriesOutput } from "./dtos/all-categories.dto";
import { CategoryInput, CategoryOutput } from "./dtos/category.dto";
import { CreateDishInput, CreateDishOutput } from "./dtos/create-dish.dto";
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from "./dtos/create-restaurant.dto";
import { DeleteDishInput, DeleteDishOutput } from "./dtos/delete-dish.dto";
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from "./dtos/delete-restaurant.dto";
import { EditDishInput, EditDishOutput } from "./dtos/edit-dish.dto";
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from "./dtos/edit-restaurant.dto";
import { MyRestaurantInput, MyRestaurantOutput } from "./dtos/my-restaurant";
import { MyRestaurantsOutput } from "./dtos/my-restaurants.dto";
import { RestaurantInput, RestaurantOutput } from "./dtos/restaurant.dto";
import { RestaurantsInput, RestaurantsOutput } from "./dtos/restaurants.dto";
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from "./dtos/search-restaurant.dto";
import { Category } from "./entities/category.entity";
import { Dish } from "./entities/dish.entity";
import { Restaurant } from "./entities/restaurant.entity";
import { CategoryRepository } from "./repositories/category.repository";

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Category)
    private readonly categories: CategoryRepository,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>
  ) {}

  async createRestaurant(
    owner: User,
    createRestaurantInput: CreateRestaurantInput
  ): Promise<CreateRestaurantOutput> {
    try {
      const newRestaurant = this.restaurants.create(createRestaurantInput);
      newRestaurant.owner = owner;
      const category = await this.categories.getOrCreate(
        createRestaurantInput.categoryName
      );
      newRestaurant.category = category;
      await this.restaurants.save(newRestaurant);
      return {
        ok: true,
        restaurantId: newRestaurant.id,
      };
    } catch {
      return {
        ok: false,
        error: "Could not create restaurant",
      };
    }
  }

  async editRestaurant(
    owner: User,
    editRestaurantInput: EditRestaurantInput
  ): Promise<EditRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: {
          id: editRestaurantInput.restaurantId,
        },
        relations: ["menu"],
      });

      if (!restaurant) {
        return {
          ok: false,
          error: "Restaurant not found",
        };
      }

      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: "You can't edit a restaurant that you don't won",
        };
      }

      let category: Category = null;
      if (editRestaurantInput.categoryName) {
        category = await this.categories.getOrCreate(
          editRestaurantInput.categoryName
        );
      }
      await this.restaurants.save([
        {
          id: editRestaurantInput.restaurantId,
          ...editRestaurantInput,
          ...(category && { category }),
        },
      ]);
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: error,
      };
    }
  }

  async deleteRestaurant(
    owner: User,
    { restaurantId }: DeleteRestaurantInput
  ): Promise<DeleteRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: {
          id: restaurantId,
        },
      });

      if (!restaurant) {
        return {
          ok: false,
          error: "Restaurant not found",
        };
      }

      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: "You can't delete a restaurant that you don't won",
        };
      }
      await this.restaurants.delete(restaurantId);
    } catch {
      return {
        ok: false,
        error: "Could not delete restaurant!",
      };
    }
  }

  async allCategories(): Promise<AllCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      return {
        ok: true,
        categories,
      };
    } catch {
      return {
        ok: false,
        error: "Could not load categories",
      };
    }
  }

  countRestaurants(category: Category) {
    return this.restaurants.count({
      where: {
        category: {
          id: category.id,
        },
      },
    });
  }

  async findCategoryBySlug({
    slug,
    page,
  }: CategoryInput): Promise<CategoryOutput> {
    try {
      const category = await this.categories.findOne({
        where: {
          slug: slug,
        },
      });
      if (!category) {
        return {
          ok: false,
          error: "Category not found",
        };
      }
      const restaurants = await this.restaurants.find({
        where: {
          category: {
            id: category.id,
          },
        },
        order: {
          isPromoted: "DESC",
        },
        take: 3,
        skip: (page - 1) * 3,
      });
      category.restaurants = restaurants;
      const totalResult = await this.countRestaurants(category);
      return {
        ok: true,
        category,
        totalPages: Math.ceil(totalResult / 3),
      };
    } catch {
      return {
        ok: false,
        error: "Could not load category",
      };
    }
  }

  async allRestaurants({ page }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        skip: (page - 1) * 3,
        take: 3,
        order: {
          isPromoted: "DESC",
        },
      });
      return {
        ok: true,
        results: restaurants,
        totalPages: Math.ceil(totalResults / 3),
        totalResults: totalResults,
      };
    } catch {
      return {
        ok: false,
        error: "Could not load restaurants",
      };
    }
  }

  async findRestaurantById({
    restaurantId,
  }: RestaurantInput): Promise<RestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: {
          id: restaurantId,
        },
        relations: ["menu"],
      });
      if (!restaurant) {
        return {
          ok: false,
          error: "Restaurant not found",
        };
      }

      return {
        ok: true,
        restaurant,
      };
    } catch {
      return {
        ok: false,
        error: "Could not find restaurant",
      };
    }
  }

  async searchRestaurantByName({
    query,
    page,
  }: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        where: {
          name: Raw((name) => `${name} ILIKE '%${query}%'`),
        },
      });
      return {
        ok: true,
        restaurants,
        totalResults,
        totalPages: Math.ceil(totalResults / 3),
      };
    } catch {
      return {
        ok: false,
        error: "Could not search for SearchResult",
      };
    }
  }

  async createDish(
    owner: User,
    createDishInput: CreateDishInput
  ): Promise<CreateDishOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: createDishInput.restaurantId },
      });

      if (!restaurant) {
        return {
          ok: false,
          error: "Restaurant not found",
        };
      }

      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: "You can't do that.",
        };
      }

      await this.dishes.save(
        this.dishes.create({ ...createDishInput, restaurant })
      );

      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: "Couldn't creat dish",
      };
    }
  }

  async editDish(
    owner: User,
    editDishInput: EditDishInput
  ): Promise<EditDishOutput> {
    try {
      const dish = await this.dishes.findOne({
        where: { id: editDishInput.dishId },
        relations: ["restaurant"],
      });
      if (!dish) {
        return {
          ok: false,
          error: "Dish not found",
        };
      }
      if (dish.restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: "You can't do that.",
        };
      }

      await this.dishes.save([
        {
          id: editDishInput.dishId,
          ...editDishInput,
        },
      ]);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: "Could not delete Dishes.",
      };
    }
  }

  async deleteDish(
    owner: User,
    { dishId }: DeleteDishInput
  ): Promise<DeleteDishOutput> {
    try {
      const dish = await this.dishes.findOne({
        where: { id: dishId },
        relations: ["restaurant"],
      });
      if (!dish) {
        return {
          ok: false,
          error: "Dish not found",
        };
      }
      if (dish.restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: "You can't do that.",
        };
      }
      await this.dishes.delete(dishId);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: "Could not delete Dishes.",
      };
    }
  }

  async myRestaurants(owner: User): Promise<MyRestaurantsOutput> {
    try {
      const restaurants = await this.restaurants.find({
        where: {
          owner: {
            id: owner.id,
          },
        },
      });
      return {
        restaurants,
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: "Could not find restaurants.",
      };
    }
  }

  async myRestaurant(
    owner: User,
    { id }: MyRestaurantInput
  ): Promise<MyRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: {
          owner: {
            id: owner.id,
          },
          id: id,
        },
        relations: ["menu", "orders"],
      });
      return {
        restaurant,
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: "Could not find restaurant",
      };
    }
  }
}
