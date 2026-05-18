// Nest
import { Injectable, Logger } from '@nestjs/common'
// Services
import { StorageService } from '@storage/storage.service'
// Types
import { FilterMode, FilterResult } from '@app-types/Filter'
import { RedditRecord } from '@app-types/Reddit'
// Utils
import { tierAFilter, tierBCompile, tierCFilter } from './filter.utils'

@Injectable()
export class FilterService {
  private readonly logger = new Logger( FilterService.name )

  constructor( private readonly storageService: StorageService) {}

  async filter( bronzeFile: string, mode: FilterMode = FilterMode.BALANCED ): Promise< FilterResult > {
    // 1. Read bronze file
    const records = await this.storageService.readBronze< RedditRecord >( bronzeFile )

    this.logger.log( `Read ${ records.length } records from bronze file: ${ bronzeFile }` )

    // 2. Run waterfall
    const passed: RedditRecord[] = []

    for( const record of records ) {
      // Tier A - Engagement-based filtering
      if( !tierAFilter( record, mode ) ) continue

      // Tier B - Compile text blob
      const textBlob = tierBCompile( record )

      // Tier C - Inclusion/exclusion pattern filtering
      if( !tierCFilter( textBlob ) ) continue

      passed.push( record )
    }

    const stats = {
      total: records.length,
      passed: passed.length,
      dropped: records.length - passed.length,
    }

    this.logger.log( `Filtering complete. Stats: ${ JSON.stringify( stats ) }` )

    const filteredFile = await this.storageService.writeFiltered( passed, 'reddit' )

    return { filteredFile, stats }
  }
}