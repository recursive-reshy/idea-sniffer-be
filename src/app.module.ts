// Nest
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
// Modules
import { CommonHttpModule } from './common/http/http.module'
import { RunsModule } from './runs/runs.module'
// Controllers
import { HealthController } from './health/health.controller'

@Module( {
  imports: [
    ConfigModule.forRoot( { isGlobal: true } ), // Load environment variables from .env file
    CommonHttpModule, 
    RunsModule 
  ],
  controllers: [ HealthController ],
} )
export class AppModule {}
