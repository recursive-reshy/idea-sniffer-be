// Nest
import { Injectable } from '@nestjs/common'
// Providers
import { RedditProvider } from '../../providers/reddit'
// Types
import type { FetchSubredditsPayload } from '../../providers/reddit'

@Injectable()
export class RedditService {
  constructor( private readonly redditProvider: RedditProvider ) {}

  async startRun( body: FetchSubredditsPayload ) {
    // 1. Start scrape and get snapshot id
    const snapshotId: string = await this.redditProvider.startScrape( body )

    // 2. Poll for results until ready or failed
    await this.redditProvider.pollSnapshot( snapshotId )

    // 3. Download results if ready
    return await this.redditProvider.downloadSnapshot( snapshotId )
  }
}
