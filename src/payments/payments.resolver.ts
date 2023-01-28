import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AuthUser } from "src/auth/auth-user.decorator";
import { Role } from "src/auth/role.decorator";
import { User, UserRole } from "src/users/entities/user.entity";
import {
  CreatePaymentInput,
  CreatePaymentOutput,
} from "./dtos/create-payment.dto";
import { GetPaymentsOutput } from "./dtos/get-payments.dto";
import { Payment } from "./entities/payment.entity";
import { PaymentService } from "./payments.service";

@Resolver((of) => Payment)
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  @Mutation((returns) => CreatePaymentOutput)
  @Role([UserRole.Owner])
  createPayment(
    @AuthUser() owner: User,
    @Args("input") creatPaymentInput: CreatePaymentInput
  ): Promise<CreatePaymentOutput> {
    return this.paymentService.createPayment(owner, creatPaymentInput);
  }

  @Query((returns) => GetPaymentsOutput)
  @Role([UserRole.Owner])
  getPayments(@AuthUser() user: User): Promise<GetPaymentsOutput> {
    return this.paymentService.getPayments(user);
  }
}
