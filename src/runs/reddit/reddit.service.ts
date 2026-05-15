// Nest
import { Injectable, Logger } from '@nestjs/common'
// Providers
import { RedditProvider } from '@providers/reddit'
// Services
import { StorageService } from '@storage/storage.service'
import { CacheService } from '../../cache/cache.service'
// Types
import { FetchSubredditsPayload, RedditRecord } from '@app-types/Reddit'

@Injectable()
export class RedditService {
  private readonly logger = new Logger( RedditService.name )
  private readonly PROVIDER = 'reddit'
  
  constructor( 
    private readonly redditProvider: RedditProvider,
    private readonly storageService: StorageService,
    private readonly cacheService: CacheService
  ) {}

  async startRun( body: FetchSubredditsPayload ): Promise< RedditRecord[] > {
    // 1. Start scrape and get snapshot id
    const snapshotId: string = await this.redditProvider.startScrape( body )

    // 2. Poll for results until ready or failed
    await this.redditProvider.pollSnapshot( snapshotId )

    // 3. Download results if ready
    const results: RedditRecord[] = await this.redditProvider.downloadSnapshot( snapshotId )

    // 4. Filter out already seen records using cache service
    const newRecords: RedditRecord[] = results.filter( record => this.cacheService.isNew( this.PROVIDER, record.post_id ) )

    const skipped: number = results.length - newRecords.length

    // 5. Write new records to bronze storage
    if( newRecords.length ) {
      await this.storageService.writeBronze( newRecords, this.PROVIDER )
      await this.cacheService.markSeenBatch( this.PROVIDER, newRecords.map( record => record.post_id ) )
    }

    this.logger.log( `Reddit run completed. Total: ${ results.length }, New: ${ newRecords.length }, Skipped: ${ skipped }` )

    return newRecords
  }
}
