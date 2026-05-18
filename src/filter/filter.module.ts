// Nest
import { Module } from '@nestjs/common'
// Modules
import { StorageModule } from '@storage/storage.module'
// Controller
import { FilterController } from './filter.controller'
// Services
import { FilterService } from './filter.service'

@Module( { 
  imports: [ StorageModule ],
  controllers: [ FilterController ],
  providers: [ FilterService ]
} )
export class FilterModule {}