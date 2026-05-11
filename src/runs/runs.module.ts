// Nest
import { Module } from '@nestjs/common'
// Http
import { CommonHttpModule } from '../common/http/http.module'
// Controllers
import { RunsController } from './runs.controller'
// Services
import { RunsService } from './runs.service'
// Providers
import { RedditProvider } from '../providers/reddit'

@Module( { 
  imports: [ CommonHttpModule ],
  controllers: [ RunsController ],
  providers: [ RunsService, RedditProvider ],
} )
export class RunsModule {}