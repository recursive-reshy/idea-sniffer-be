// Nest
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// System
import path from 'path'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'fs'

@Injectable()
export class CacheService implements OnModuleInit{
  private readonly logger = new Logger( CacheService.name )
  private readonly cacheDir: string
  private seedIds = new Map< string, Set< string > >()

  constructor( private readonly configService: ConfigService ) {
    this.cacheDir = this.configService.get< string >( 'CACHE_DIR' ) || './data/cache'
    this.ensureDir( this.cacheDir )
  }

  // Load all cache files on startup
  onModuleInit() {
    this.logger.log( 'Initializing CacheService...' )
    this.load()
  }

  private resolvePath( provider: string ): string {
    return path.join( this.cacheDir, `${ provider.toLowerCase() }_seen_ids.json` )
  }

  private ensureDir( dir: string ): void {
    if ( !existsSync( dir ) ) {
      mkdirSync( dir, { recursive: true } )
      this.logger.log( `Created cache directory: ${ dir }` )
    }
  }

  private load(): void {
    const files = readdirSync( this.cacheDir )
      .filter( file => file.endsWith( '_seen_ids.json' ) )

    if( !files.length ) {
      this.logger.log( 'No cache files found, starting with empty cache.' )
      return
    }

    for ( const file of files ) {
      try {
        const provider = file.replace( '_seen_ids.json', '' )
        const filePath = path.join( this.cacheDir, file )
        const data = JSON.parse( readFileSync( filePath, 'utf-8' ) )
        this.seedIds.set( provider, new Set( data.seenIds ) )
        this.logger.log( `Loaded cache for provider ${ provider }: ${ data.seenIds.length } IDs` )
      } catch ( error ) {
        this.logger.error( `Error loading cache file ${ file }: ${ JSON.stringify( error ) }` )
      }
    }
  }

  // Check if a record has been seen before
  isNew( provider: string, id: string ): boolean {
    return !( this.seedIds.get( provider )?.has( id ) ?? false )
  }

  // Atomic write to tmp file first, then rename
  // This prevents cache corruption if the process is killed during write
  private async persist( provider: string ): Promise< void > {
    const filePath = this.resolvePath( provider )
    const tempFilePath = `${ filePath }.tmp`

    try {
      const data = JSON.stringify( { seenIds: Array.from( this.seedIds.get( provider ) || [] ) }, null, 2 )

      writeFileSync( tempFilePath, data, 'utf-8' ) // Write to temp file first
      renameSync( tempFilePath, filePath ) // Atomically rename to final file
      this.logger.log( `Cache for provider ${ provider } persisted successfully with ${ this.seedIds.get( provider )?.size || 0 } IDs` )
    } catch ( error ) {
      this.logger.error( `Error writing cache for provider ${ provider }: ${ JSON.stringify( error ) }` )
      throw error
    }
  }

  // Mark a record as seen and persist atomically
  async markAsSeen( provider: string, id: string ): Promise< void > {
    if ( !this.seedIds.has( provider ) ) {
      this.seedIds.set( provider, new Set() )
    }

    this.seedIds.get( provider )!.add( id )
    await this.persist( provider )
  }

  async markSeenBatch( provider: string, ids: string[] ): Promise< void > {
    if ( !this.seedIds.has( provider ) ) {
      this.seedIds.set( provider, new Set() )
    }

    const providerCache = this.seedIds.get( provider )
    ids.filter( Boolean ).forEach( id => providerCache!.add( id ) )
    await this.persist( provider )
  }
}