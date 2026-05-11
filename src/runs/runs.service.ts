// Nest
import { Injectable } from '@nestjs/common'
// Providers
import { RedditProvider } from '../providers/reddit'
// Types
import type { FetchSubredditsPayload } from '../providers/reddit'

@Injectable()
export class RunsService {
  constructor(private readonly RedditProvider: RedditProvider) {}

  async createRedditRun( body: FetchSubredditsPayload ) {
    // 1. Start scrape and get snapshot id
    const snapshotId: string = await this.RedditProvider.startScrape( body )

    // 2. Poll for results until ready or failed
    await this.RedditProvider.pollSnapshot( snapshotId )

    // 3. Download results if ready
    const results = await this.RedditProvider.downloadSnapshot( snapshotId )
    
    return results
  }
}