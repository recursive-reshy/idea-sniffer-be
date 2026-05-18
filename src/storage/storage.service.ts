// Nest
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// System
import path from 'path'
import { mkdirSync, existsSync, appendFileSync, readFileSync,  } from 'fs'
// Types
import { RedditRecord } from '@app-types/Reddit'

@Injectable()
export class StorageService {
  private readonly logger = new Logger( StorageService.name )
  private readonly bronzeDir: string
  private readonly filteredDir: string

  constructor( private readonly configService: ConfigService ) {
    this.bronzeDir = this.configService.get< string >( 'BRONZE_DIR' ) || '.data/bronze'
    this.filteredDir = this.configService.get< string >( 'FILTERED_DIR' ) || '.data/filtered'
    this.ensureDir( this.bronzeDir )
    this.ensureDir( this.filteredDir )
  }

  // Helper function to ensure that a directory exists, creating it if necessary
  private ensureDir( path: string ): void {
    this.logger.log( `Ensuring directory exists: ${ path }` )
    if ( !existsSync( path ) ) {
      mkdirSync( path, { recursive: true } )
      this.logger.log( `Created directory: ${ path }` )
    }
  }

  // Helper function to resolve the file path for a given provider and current date
  private resolvePath( provider: string, dir: string ): string {
    const date = new Date().toISOString().split( 'T' )[ 0 ] // YYYY-MM-DD
    const fileName = `${ provider }_${ date }.jsonl`

    // .data/bronze/provider_2026-05-14.jsonl
    return path.join( dir, fileName )
  }

  // TODO: Not provider agnostic, need to review
  async writeBronze( records: RedditRecord[], provider: string ): Promise< void > {
    const filePath = this.resolvePath( provider, this.bronzeDir )
    this.logger.log( `Writing ${ records.length } records to ${ filePath }` )

    let written: number = 0

    try {
      const lines = records
        .map( record => JSON.stringify( record ) )
        .join( '\n' ) + '\n' // Add newline at the end of each record

        appendFileSync( filePath, lines, 'utf-8' )
        written = records.length
        this.logger.log( `Successfully wrote ${ written } records to ${ filePath }` )
    } catch ( error: any ) {
      this.logger.error( `Error writing to bronze storage: ${ error.message }` )
      throw error
    }
  }

  async readBronze< T >( fileName: string ): Promise< T[] > {
    const filePath = path.join( this.bronzeDir, fileName )

    if( !existsSync( filePath ) ) {
      this.logger.error( `File not found: ${ filePath }` )
      throw new Error( `File not found: ${ filePath }` )
    }

    const content = readFileSync( filePath, 'utf-8' )

    return content
      .split( '\n' )
      .filter( line => line.trim() )
      .map( line => JSON.parse( line ) as T )
  }

  // TODO: Not provider agnostic, need to review
  async writeFiltered( records: RedditRecord[], provider: string ): Promise< string > {
    const filePath = this.resolvePath( provider, this.filteredDir )
    this.logger.log( `Writing ${ records.length } filtered records to ${ filePath }` )

    try {
      const lines = records
        .map( record => JSON.stringify( record ) )
        .join( '\n' ) + '\n' // Add newline at the end of each record

        appendFileSync( filePath, lines, 'utf-8' )
        this.logger.log( `Successfully wrote ${ records.length } filtered records to ${ filePath }` )
    } catch ( error ) {
      this.logger.error( `Error writing to filtered storage: ${ ( error as Error ).message }` )
      throw error
    }

    return path.basename( filePath )
  }
}