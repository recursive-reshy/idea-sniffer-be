// Nest
import { Module } from '@nestjs/common'
// Modules
import { CommonHttpModule } from '@common/http/http.module'
import { StorageModule } from '@storage/storage.module'
import { CacheModule } from '../../cache/cache.module'
// Controllers
import { RedditController } from './reddit.controller'
// Services
import { RedditService } from './reddit.service'
// Providers
import { RedditProvider } from '@providers/reddit'

@Module( {
  imports: [ CommonHttpModule, StorageModule, CacheModule ],
  controllers: [ RedditController ],
  providers: [ RedditService, RedditProvider ],
} )
export class RedditModule {}
