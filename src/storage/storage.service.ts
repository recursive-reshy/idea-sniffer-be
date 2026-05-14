// Nest
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// System
import path from 'path'
import { mkdirSync, existsSync, appendFileSync,  } from 'fs'
// Types
import { RedditRecord } from '../types/Reddit'

@Injectable()
export class StorageService {
  private readonly logger = new Logger( StorageService.name )
  private readonly bronzeDir: string

  constructor( private readonly configService: ConfigService ) {
    this.bronzeDir = this.configService.get< string >( 'BRONZE_DIR' ) || '.data/bronze'
    this.ensureDir( this.bronzeDir )
  }

  // Helper function to ensure that a directory exists, creating it if necessary
  private ensureDir( path: string ): void {
    this.logger.debug( `Ensuring directory exists: ${ path }` )
    if ( !existsSync( path ) ) {
      mkdirSync( path, { recursive: true } )
      this.logger.log( `Created directory: ${ path }` )
    }
  }

  // Helper function to resolve the file path for a given provider and current date
  private resolvePath( provider: string ): string {
    const date = new Date().toISOString().split( 'T' )[ 0 ] // YYYY-MM-DD
    const fileName = `${ provider }_${ date }.jsonl`

    // .data/bronze/provider_2026-05-14.jsonl
    return path.join( this.bronzeDir, fileName )
  }

  async writeBronze( records: RedditRecord[], provider: string ): Promise< void > {
    const filePath = this.resolvePath( provider )
    this.logger.debug( `Writing ${ records.length } records to ${ filePath }` )

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
    }
  }
}