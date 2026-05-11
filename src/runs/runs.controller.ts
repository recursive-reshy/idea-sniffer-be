// Nest
import { Controller, Post, Body } from '@nestjs/common'
// Services
import { RunsService } from './runs.service'
// Types
import type { FetchSubredditsPayload } from '../providers/reddit'

@Controller( 'runs' )
export class RunsController {
  constructor( private readonly runsService: RunsService ) {}

  @Post( 'reddit' )
  async createRedditRun( @Body() body: FetchSubredditsPayload ) {
    return await this.runsService.createRedditRun( body )
  }
}