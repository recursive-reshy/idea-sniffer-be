// Nest
import { Module } from '@nestjs/common'
// Provider modules
import { RedditModule } from './reddit/reddit.module'

@Module( {
  imports: [ RedditModule ],
} )
export class RunsModule {}
