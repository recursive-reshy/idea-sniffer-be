// Nest
import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common'
// Prisma
import { Run, RunStatus } from '@prisma/client'
// Services
import { RedditService } from './reddit.service'
// Types
import type { FetchSubredditsPayload, RedditRunResult, RedditIngestResult, RedditSnapshotStatus } from '@app-types/Reddit'
import type { PaginatedResponse } from '@app-types/Common'

@Controller( 'reddit' )
export class RedditController {
  constructor( private readonly redditService: RedditService ) {}

  @Get( 'runs' )
  async getRuns(
    @Query( 'provider' ) provider: string,
    @Query( 'status' ) status: string,
    @Query( 'page' ) page: string,
    @Query( 'limit' ) limit: string,
  ): Promise< PaginatedResponse< Run > > {
    return this.redditService.getRuns( {
      provider,
      status: Object.values( RunStatus ).includes( status as RunStatus ) ? ( status as RunStatus ) : undefined,
      page: Number( page ) || undefined,
      limit: Number( limit ) || undefined,
    } )
  }

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
