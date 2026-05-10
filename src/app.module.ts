import { Module } from '@nestjs/common'
// Controllers
import { HealthController } from './health/health.controller'

@Module( {
  imports: [],
  controllers: [ HealthController ],
} )
export class AppModule {}
