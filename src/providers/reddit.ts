// Nest
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// Services
import { HttpService } from '../common/http/http.service'
// Types
import { FetchSubredditsPayload, RedditRecord } from '../types/Reddit'

interface TriggerResponse {
  snapshot_id: string
}

enum PollStatus {
  STARTING = 'starting',
  RUNNING = 'running',
  READY = 'ready',
  FAILED = 'failed'
}

interface PollSnapshotResponse {
  snapshot_id: string
  dataset_id: string
  status: PollStatus
}

enum DownloadStatus {
  BUILDING = 'building',
  READY = 'ready',
  FAILED = 'failed'
}

interface DownloadSnapshotResponse {
  status: DownloadStatus
  message: string
}

@Injectable()
export class RedditProvider {
  readonly name = 'Reddit'
  private readonly logger = new Logger( RedditProvider.name )
  // TODO: Move this to a config file
  private readonly baseUrl = 'https://api.brightdata.com/datasets/v3'
  private readonly datasetId = 'gd_lvz8ah06191smkebj4'
  private readonly triggerUrl = `${ this.baseUrl }/trigger?dataset_id=${ this.datasetId }&notify=false&include_errors=true&type=discover_new&discover_by=subreddit_url`

  constructor( 
    private readonly httpService: HttpService,
    private configService: ConfigService
  ) {}

  // Start bright data scrape. Returns snapshot id to poll for results
  async startScrape( { subreddits }: FetchSubredditsPayload ): Promise< string > {
    try {

      if( !this.configService.get< string >( 'BRIGHT_DATA_API_KEY' )?.trim() ) {
        this.logger.error( 'Bright Data API key not configured' )
        throw new HttpException( 'Bright Data API key not configured', HttpStatus.UNAUTHORIZED )
      }

      if( !subreddits || !subreddits.length ) {
        this.logger.error( 'No subreddits provided in payload' )
        throw new HttpException( 'No subreddits provided', HttpStatus.BAD_REQUEST )
      }

      /** Construct payload for Bright data web scraper 
       * i.e Stringified JSON
       * input: { [
       *  { "url": "https://www.reddit.com/r/freelance",
       *    "sort_by": "", // Hot, New, Top, Rising
       *    "sort_by_time":"", // Today, This Week, This Year, All Time
       *    "keyword": "" // Optional param to filter posts by keyword in title or body
       *    "start_date": "", // Optional param to filter posts by date range
       *  }, 
       * ] }
      */
      const payload = JSON.stringify( {
        input: subreddits.map( ( subReddit ) => ( {
          url: `https://www.reddit.com/r/${ subReddit }`,
          sort_by: 'Hot', // TODO: Should come from payload
        } ) )
      } )

      this.logger.log( `Fetching Reddit signals with payload: ${ payload }` )

      const response: TriggerResponse = await this.httpService.post( 
        this.triggerUrl, // TODO: Move URL to config file
        payload,
        // TODO: Make headers a constant across all requests
        { headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ this.configService.get< string >( 'BRIGHT_DATA_API_KEY' ) }`
          }
        }
      )

      this.logger.log( `Received response from Bright Data: ${ JSON.stringify( response ) }` )

      return response.snapshot_id

    } catch ( error: any ) {
      this.logger.error( 'Error while fetching Reddit signals', error )

      const status =
        error?.status ?? HttpStatus.BAD_GATEWAY

      const message =
        error?.response?.data?.message ??
        error?.message ??
        'Failed to fetch Reddit signals'

      throw new HttpException(message, status)
    }
  }

  // Poll for results using snapshot id until status is ready or failed. Returns status
  async pollSnapshot( snapshotId: string ): Promise< PollStatus > {
    const MAX_RETRIES: number = 3
    let retries: number = 0

    while ( true ) {
      try {
        const response: PollSnapshotResponse = await this.httpService.get( 
          `${ this.baseUrl }/progress/${ snapshotId }`, // TODO: Move URL to config file
          // TODO: Make headers a constant across all requests
          { headers: {
            'Authorization': `Bearer ${ this.configService.get< string >( 'BRIGHT_DATA_API_KEY' ) }`,
            'Content-Type': 'application/json'
          } } 
        )

        this.logger.log( `Polled snapshot ${ snapshotId }, status: ${ response.status }` )

        if ( response.status == PollStatus.READY ) {
          this.logger.log( `Snapshot ${ snapshotId } is ready` )
          return PollStatus.READY
        } else if ( response.status == PollStatus.FAILED ) {
          this.logger.error( `Snapshot ${ snapshotId } failed` )
          throw new HttpException( 'Snapshot processing failed', HttpStatus.BAD_GATEWAY )
        }

        // TODO: Make sleep utility function
        await new Promise( resolve => setTimeout( resolve, 5000 ) ) // Wait for 5 seconds before retrying
        // TODO: Need to handle exceptions thrown in try block. Similar to startScrape
      } catch ( error: any ) {
        retries++
        this.logger.error( `Error while polling snapshot ${ snapshotId }, attempt ${ retries }`, JSON.stringify( error ) )

        if ( retries >= MAX_RETRIES ) {
          this.logger.error( `Maximum retries exceeded for snapshot ${ snapshotId }` )
          throw new HttpException( 'Maximum retries exceeded', HttpStatus.BAD_GATEWAY )
        }

        // TODO: Make sleep utility function
        await new Promise( resolve => setTimeout( resolve, 5000 ) ) // Wait for 5 seconds before retrying
      }
    }
  }

  async downloadSnapshot( snapshotId: string ): Promise< RedditRecord[] > {
    const MAX_RETRIES: number = 3
    let retries: number = 0

    while ( true ) {
      try {
        this.logger.log( `Attempting to download snapshot ${ snapshotId }` )
  
        const response = await this.httpService.get< RedditRecord[] | DownloadSnapshotResponse >(
          `${ this.baseUrl }/snapshot/${ snapshotId }/?format=json`, // TODO: Move URL to config file
          // TODO: Make headers a constant across all requests
          { headers: {
            'Authorization': `Bearer ${ this.configService.get< string >( 'BRIGHT_DATA_API_KEY' ) }`,
            'Content-Type': 'application/json'
          } }
        )

        if( ( response as DownloadSnapshotResponse ).status == DownloadStatus.BUILDING ) {
          this.logger.log( `Snapshot ${ snapshotId } is still building, retrying in 30s...` )
          await new Promise( resolve => setTimeout( resolve, 30000 ) )
          continue
        }
  
        this.logger.log( `Downloaded data for snapshot ${ snapshotId }` )
        return response as RedditRecord[]

      } catch ( error ) {
        this.logger.error( `Error while downloading snapshot ${ snapshotId }`, error )
        throw new HttpException( 'Failed to download snapshot data', HttpStatus.BAD_GATEWAY )
      }
    }
  }
}