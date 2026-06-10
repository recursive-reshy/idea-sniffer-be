// Nest
import { Controller, Post, Get, Body, Param } from '@nestjs/common'
// Services
import { RedditService } from './reddit.service'
// Types
import type { FetchSubredditsPayload, RedditRunResult, RedditIngestResult, RedditSnapshotStatus } from '@app-types/Reddit'

@Controller( 'reddit' )
export class RedditController {
  constructor( private readonly redditService: RedditService ) {}

  @Post( 'run' )
  async startRun( @Body() body: FetchSubredditsPayload ): Promise< RedditRunResult > {
    return await this.redditService.startRun( body )
  }

  @Get( ':snapshotId/status' )
  async getSnapshotStatus( @Param( 'snapshotId' ) snapshotId: string ): Promise< RedditSnapshotStatus > {
    return await this.redditService.getSnapshotStatus( snapshotId )
  }

  @Post( ':snapshotId/ingest' )
  async ingestSnapshot(
    @Param( 'snapshotId' ) snapshotId: string,
    @Body() { runId }: { runId: string },
  ): Promise< RedditIngestResult > {
    return await this.redditService.ingestSnapshot( snapshotId, runId )
  }
}
