// Nest
import { Injectable } from '@nestjs/common'
// Providers
import { RedditProvider } from '@providers/reddit'
// Services
import { StorageService } from '@storage/storage.service'
// Types
import { FetchSubredditsPayload, RedditRecord } from '@app-types/Reddit'

@Injectable()
export class RedditService {
  constructor( 
    private readonly redditProvider: RedditProvider,
    private readonly storageService: StorageService
  ) {}

  async startRun( body: FetchSubredditsPayload ): Promise< RedditRecord[] > {
    // 1. Start scrape and get snapshot id
    const snapshotId: string = await this.redditProvider.startScrape( body )

    // 2. Poll for results until ready or failed
    await this.redditProvider.pollSnapshot( snapshotId )

    // 3. Download results if ready
    const results: RedditRecord[] = await this.redditProvider.downloadSnapshot( snapshotId )

    // 4. Write to bronze storage
    await this.storageService.writeBronze( results, this.redditProvider.name )

    return results
  }
}
