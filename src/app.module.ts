// Nest
import { Module } from '@nestjs/common'
// Modules
import { CommonHttpModule } from './common/http/http.module'
// Controllers
import { HealthController } from './health/health.controller'

@Module( {
  imports: [ CommonHttpModule ],
  controllers: [ HealthController ],
} )
export class AppModule {}
