// Nest
import { Module } from '@nestjs/common'
// Modules
import { StorageModule } from '@storage/storage.module'
// Controllers
import { DistillController } from './distill.controller'
// Services
import { DistillService } from './distill.service'

@Module( { 
  imports: [ StorageModule ],
  controllers: [ DistillController ],
  providers: [ DistillService ]
} )
export class DistillModule {}