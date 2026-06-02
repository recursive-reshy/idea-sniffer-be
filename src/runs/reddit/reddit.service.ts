// Nest
import { Injectable, Logger } from '@nestjs/common'
// Prisma
import { RunStatus } from '@prisma/client'
// Providers
import { RedditProvider } from '@providers/reddit'
// Services
import { StorageService } from '@storage/storage.service'
// Utils
import { formatElapsed } from '@common/utils'
// Types
import { FetchSubredditsPayload, RedditRecord, RedditRunResult } from '@app-types/Reddit'

@Injectable()
export class RedditService {
  private readonly logger = new Logger( RedditService.name )
  private readonly PROVIDER = 'reddit'

  constructor(
    private readonly redditProvider: RedditProvider,
    private readonly storageService: StorageService,
  ) {}

  async startRun( body: FetchSubredditsPayload ): Promise< RedditRunResult > {
    const startTime = Date.now()

    // 1. Start scrape and get snapshot id
    const snapshotId: string = await this.redditProvider.startScrape( body )

    // 2. Create run record in DB
    const run = await this.storageService.createRun( {
      provider: this.PROVIDER,
      snapshotId,
      subreddit: body.subreddits.join( ',' ),
      sortBy: body.sort_by,
    } )

    await this.storageService.updateRun( run.id, { status: RunStatus.SCRAPING, startedAt: new Date() } )

    try {
      // 3. Poll for results until ready or failed
      await this.redditProvider.pollSnapshot( snapshotId )

      /**
       * TODO: Seems some of the records are failing silently
       * The record object will return an error message. Try set order_by in scrape payload to see
       * We need to figure out how to handle these records. For now we will just log them and skip
       */
      // 4. Download results if ready
      const results: RedditRecord[] = await this.redditProvider.downloadSnapshot( snapshotId )

      const totalFetched = results.length

      // 5. Write to DB — skipDuplicates handles dedup by (provider, externalId)
      const validRecords = results.filter( record => record.post_id )
      const { stored, skipped } = await this.storageService.createBronzeRecords( run.id, this.PROVIDER, validRecords )

      // 6. Finalise run
      await this.storageService.updateRun( run.id, {
        status: RunStatus.COMPLETE,
        totalFetched,
        totalStored: stored,
        totalSkipped: skipped,
        completedAt: new Date(),
      } )

      const elapsed = formatElapsed( Date.now() - startTime )

      this.logger.log( `Reddit run ${ run.id } completed. Total: ${ totalFetched }, Stored: ${ stored }, Skipped: ${ skipped }, Elapsed: ${ elapsed }` )

      return { runId: run.id, elapsed }
    } catch ( error ) {
      await this.storageService.updateRun( run.id, { status: RunStatus.FAILED } )
      throw error
    }
  }
}
