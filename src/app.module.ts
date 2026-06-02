// Nest
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
// Modules
import { CommonHttpModule } from '@common/http/http.module'
import { PrismaModule } from '@prisma/prisma.module'
import { StorageModule } from '@storage/storage.module'
import { RunsModule } from '@runs/runs.module'
import { FilterModule } from './filter/filter.module'
import { DistillModule } from '@distill/distill.module'
// Controllers
import { HealthController } from './health/health.controller'

@Module( {
  imports: [
    ConfigModule.forRoot( { isGlobal: true } ), // Load environment variables from .env file
    CommonHttpModule,
    PrismaModule,
    StorageModule,
    RunsModule,
    FilterModule,
    DistillModule
  ],
  controllers: [ HealthController ],
} )
export class AppModule {}
