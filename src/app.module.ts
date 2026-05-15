// Nest
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
// Modules
import { CommonHttpModule } from '@common/http/http.module'
import { RunsModule } from '@runs/runs.module'
import { StorageModule } from '@storage/storage.module'
import { CacheModule } from './cache/cache.module'
// Controllers
import { HealthController } from './health/health.controller'

@Module( {
  imports: [
    ConfigModule.forRoot( { isGlobal: true } ), // Load environment variables from .env file
    CommonHttpModule,
    StorageModule,
    CacheModule,
    RunsModule,
  ],
  controllers: [ HealthController ],
} )
export class AppModule {}
