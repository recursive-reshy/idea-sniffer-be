// Nest
import { Module } from '@nestjs/common'
// Http
import { CommonHttpModule } from '../../common/http/http.module'
// Controllers
import { RedditController } from './reddit.controller'
// Services
import { RedditService } from './reddit.service'
// Providers
import { RedditProvider } from '../../providers/reddit'

@Module( {
  imports: [ CommonHttpModule ],
  controllers: [ RedditController ],
  providers: [ RedditService, RedditProvider ],
} )
export class RedditModule {}
