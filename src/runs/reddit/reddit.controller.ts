// Nest
import { Controller, Post, Body } from '@nestjs/common'
// Services
import { RedditService } from './reddit.service'
// Types
import type { FetchSubredditsPayload } from '../../providers/reddit'

@Controller( 'reddit' )
export class RedditController {
  constructor( private readonly redditService: RedditService ) {}

  @Post( 'run' )
  async startRun( @Body() body: FetchSubredditsPayload ) {
    return await this.redditService.startRun( body )
  }
}
