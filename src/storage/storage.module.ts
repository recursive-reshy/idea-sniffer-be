// Nest
import { Module } from '@nestjs/common'
// Services
import { StorageService } from './storage.service'

@Module( {
  providers: [ StorageService ],
  exports: [ StorageService ]
} )
export class StorageModule {}