import { Injectable } from "@nestjs/common";
import { Cron, Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Restaurant } from "src/restaurants/entities/restaurant.entity";
import { User } from "src/users/entities/user.entity";
import { LessThan, Repository } from "typeorm";
import {
  CreatePaymentInput,
  CreatePaymentOutput,
} from "./dtos/create-payment.dto";
import { GetPaymentsOutput } from "./dtos/get-payments.dto";
import { Payment } from "./entities/payment.entity";

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    @InjectRepository(Restaurant)
    private readonly restaurant: Repository<Restaurant>
  ) {}

  async createPayment(
    owner: User,
    { transactionId, restaurantId }: CreatePaymentInput
  ): Promise<CreatePaymentOutput> {
    try {
      const restaurant = await this.restaurant.findOne({
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

      if (restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: "You are not allowd to do this.",
        };
      }

      restaurant.isPromoted = true;
      const date = new Date();
      date.setDate(date.getDate() + 7);
      restaurant.promoteUntil = date;
      this.restaurant.save(restaurant);

      await this.payments.save(
        this.payments.create({ transactionId, user: owner, restaurant })
      );

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: "Could not create payment.",
      };
    }
  }

  async getPayments(user: User): Promise<GetPaymentsOutput> {
    try {
      const payments = await this.payments.find({
        where: {
          user: {
            id: user.id,
          },
        },
      });

      return {
        ok: true,
        payments,
      };
    } catch {
      return {
        ok: false,
        error: "Could not get payments",
      };
    }
  }

  @Interval(2000)
  async checkPromotedRestaurants() {
    const restaurant = await this.restaurant.find({
      where: {
        isPromoted: true,
        promoteUntil: LessThan(new Date()),
      },
    });

    restaurant.forEach(async (restaurant) => {
      restaurant.isPromoted = false;
      restaurant.promoteUntil = null;
      await this.restaurant.save(restaurant);
    });
  }
}
