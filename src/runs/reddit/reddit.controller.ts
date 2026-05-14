// Nest
import { Controller, Post, Body } from '@nestjs/common'
// Services
import { RedditService } from './reddit.service'
// Types
import type { FetchSubredditsPayload, RedditRecord } from '@app-types/Reddit'

@Controller( 'reddit' )
export class RedditController {
  constructor( private readonly redditService: RedditService ) {}

  @Post( 'run' )
  async startRun( @Body() body: FetchSubredditsPayload ): Promise< RedditRecord[] > {
    return await this.redditService.startRun( body )
  }
}
