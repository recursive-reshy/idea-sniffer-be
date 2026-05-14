// Nest
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
// Modules
import { CommonHttpModule } from './common/http/http.module'
import { RunsModule } from './runs/runs.module'
import { StorageModule } from './storage/storage.module'
// Controllers
import { HealthController } from './health/health.controller'

@Module( {
  imports: [
    ConfigModule.forRoot( { isGlobal: true } ), // Load environment variables from .env file
    CommonHttpModule, 
    RunsModule,
    StorageModule
  ],
  controllers: [ HealthController ],
} )
export class AppModule {}
