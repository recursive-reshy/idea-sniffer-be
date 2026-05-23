// Nest
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// System
import path from 'path'
import { mkdirSync, existsSync, appendFileSync, readFileSync } from 'fs'
// Types
import { RedditRecord } from '@app-types/Reddit'
import { SilverRecord } from '@app-types/Silver'

@Injectable()
export class StorageService {
  private readonly logger = new Logger( StorageService.name )
  private readonly bronzeDir: string
  private readonly filteredDir: string
  private readonly silverDir: string

  constructor( private readonly configService: ConfigService ) {
    this.bronzeDir = this.configService.get< string >( 'BRONZE_DIR' ) || '.data/bronze'
    this.ensureDir( this.bronzeDir )
    this.filteredDir = this.configService.get< string >( 'FILTERED_DIR' ) || '.data/filtered'
    this.ensureDir( this.filteredDir )
    this.silverDir = this.configService.get< string >( 'SILVER_DIR' ) || '.data/silver'
    this.ensureDir( this.silverDir )
  }

  private ensureDir( dir: string ): void {
    this.logger.log( `Ensuring directory exists: ${ dir }` )
    if ( !existsSync( dir ) ) {
      mkdirSync( dir, { recursive: true } )
      this.logger.log( `Created directory: ${ dir }` )
    }
  }

  private resolvePath( provider: string, dir: string ): string {
    const date = new Date().toISOString().split( 'T' )[ 0 ]
    return path.join( dir, `${ provider }_${ date }.jsonl` )
  }

  private async writeToDir( records: object[], dir: string, provider: string ): Promise< string > {
    const filePath = this.resolvePath( provider, dir )
    this.logger.log( `Writing ${ records.length } records to ${ filePath }` )

    try {
      const lines = records.map( record => JSON.stringify( record ) ).join( '\n' ) + '\n'
      appendFileSync( filePath, lines, 'utf-8' )
      this.logger.log( `Successfully wrote ${ records.length } records to ${ filePath }` )
    } catch ( error: any ) {
      this.logger.error( `Error writing to ${ filePath }: ${ error.message }` )
      throw error
    }

    return path.basename( filePath )
  }

  private readFromDir< T >( fileName: string, dir: string ): T[] {
    const filePath = path.join( dir, fileName )

    if ( !existsSync( filePath ) ) {
      this.logger.error( `File not found: ${ filePath }` )
      throw new Error( `File not found: ${ filePath }` )
    }

    return readFileSync( filePath, 'utf-8' )
      .split( '\n' )
      .filter( line => line.trim() )
      .map( line => JSON.parse( line ) as T )
  }

  // TODO: Not provider agnostic, need to review
  async writeBronze( records: RedditRecord[], provider: string ): Promise< string > {
    return this.writeToDir( records, this.bronzeDir, provider )
  }

  async readBronze< T >( fileName: string ): Promise< T[] > {
    return this.readFromDir< T >( fileName, this.bronzeDir )
  }

  // TODO: Not provider agnostic, need to review
  async writeFiltered( records: RedditRecord[], provider: string ): Promise< string > {
    return this.writeToDir( records, this.filteredDir, provider )
  }

  async readFiltered< T >( fileName: string ): Promise< T[] > {
    return this.readFromDir< T >( fileName, this.filteredDir )
  }

  async writeSilver( records: SilverRecord[], provider: string ): Promise< string > {
    return this.writeToDir( records, this.silverDir, provider )
  }

  async readSilver< T >( fileName: string ): Promise< T[] > {
    return this.readFromDir< T >( fileName, this.silverDir )
  }
}
