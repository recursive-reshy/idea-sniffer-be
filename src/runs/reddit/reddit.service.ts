// Nest
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
// Prisma
import { Run, RunStatus } from '@prisma/client'
// Providers
import { RedditProvider } from '@providers/reddit'
// Services
import { GetRunsRequest, StorageService } from '@storage/storage.service'
// Utils
import { formatElapsed } from '@common/utils'
// Types
import { FetchSubredditsPayload, RedditRecord, RedditRunResult, RedditIngestResult, RedditSnapshotStatus } from '@app-types/Reddit'
import { PaginatedResponse } from '@app-types/Common'

@Injectable()
export class RedditService {
  private readonly logger = new Logger( RedditService.name )
  private readonly PROVIDER = 'reddit'

  constructor(
    private readonly redditProvider: RedditProvider,
    private readonly storageService: StorageService,
  ) {}

  async getRuns( request: GetRunsRequest ): Promise< PaginatedResponse< Run > > {
    try {
      return await this.storageService.getRuns( request )
    } catch ( error ) {
      this.logger.error( `Failed to fetch runs`, error )
      throw new HttpException( 'Server error', HttpStatus.SERVICE_UNAVAILABLE )
    }
  }

  // Trigger a scrape and create the run record. Returns immediately — caller polls for status separately
  async startRun( body: FetchSubredditsPayload ): Promise< RedditRunResult > {
    const snapshotId: string = await this.redditProvider.startScrape( body )

    const run = await this.storageService.createRun( {
      provider: this.PROVIDER,
      snapshotId,
      subreddit: body.subreddits.join( ',' ),
      sortBy: body.sort_by,
    } )

    await this.storageService.updateRun( run.id, { status: RunStatus.SCRAPING, startedAt: new Date() } )

    return { runId: run.id, snapshotId }
  }

  // Single poll passthrough — no DB writes
  async getSnapshotStatus( snapshotId: string ): Promise< RedditSnapshotStatus > {
    const status = await this.redditProvider.getSnapshotStatus( snapshotId )
    return { snapshotId, status }
  }

  // Download snapshot results and persist as bronze records
  async ingestSnapshot( snapshotId: string, runId: string ): Promise< RedditIngestResult > {
    const startTime = Date.now()

    try {
      /**
       * TODO: Seems some of the records are failing silently
       * The record object will return an error message. Try set order_by in scrape payload to see
       * We need to figure out how to handle these records. For now we will just log them and skip
       */
      const results: RedditRecord[] = await this.redditProvider.downloadSnapshot( snapshotId )

      const totalFetched = results.length

      // Write to DB — skipDuplicates handles dedup by (provider, externalId)
      const validRecords = results.filter( record => record.post_id )
      const { stored, skipped } = await this.storageService.createBronzeRecords( runId, this.PROVIDER, validRecords )

      await this.storageService.updateRun( runId, {
        status: RunStatus.COMPLETE,
        totalFetched,
        totalStored: stored,
        totalSkipped: skipped,
        completedAt: new Date(),
      } )

      const elapsed = formatElapsed( Date.now() - startTime )

      this.logger.log( `Reddit run ${ runId } completed. Total: ${ totalFetched }, Stored: ${ stored }, Skipped: ${ skipped }, Elapsed: ${ elapsed }` )

      return { runId, totalFetched, stored, skipped, elapsed }
    } catch ( error ) {
      await this.storageService.updateRun( runId, { status: RunStatus.FAILED } )
      throw error
    }
  }
}
