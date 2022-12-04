import { Module } from '@nestjs/common';
import { RestaurnatResolover } from './restaurnats.resolover';

@Module({
  providers: [RestaurnatResolover],
})
export class RestaurantsModule {}
