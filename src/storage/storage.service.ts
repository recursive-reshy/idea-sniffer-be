// Nest
import { Injectable, Logger } from '@nestjs/common'
// Prisma
import {
  BronzeRecord,
  FilterRun,
  FilterRunStatus,
  MarketSize,
  PreFilterMode,
  PreFilterStatus,
  Run,
  RunStatus,
  SignalCategory,
  SilverSignal,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
// Types
import { RedditRecord } from '@app-types/Reddit'
import { PaginatedResponse, SortOrder } from '@app-types/Common'

export interface GetRunsRequest {
  provider?: string
  status?: RunStatus
  page?: number
  limit?: number
}

export interface GetFilterRunsRequest {
  runId?: string
  page?: number
  limit?: number
}

export interface GetSilverSignalsRequest {
  provider?: string
  minPainScore?: number
  page?: number
  limit?: number
  sortBy?: 'painScore'
  sortOrder?: SortOrder
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger( StorageService.name )

  constructor( private readonly prisma: PrismaService ) {}

  // Run
  async createRun( data: {
    provider: string
    snapshotId: string
    subreddit?: string
    sortBy?: string
  } ): Promise< Run > {
    this.logger.log( `Creating run for provider: ${ data.provider }` )
    return this.prisma.run.create( { data: { ...data, status: RunStatus.PENDING } } )
  }

  async updateRun( id: string, data: Partial< {
    status: RunStatus
    totalFetched: number
    totalStored: number
    totalSkipped: number
    totalFailed: number
    startedAt: Date
    completedAt: Date
  } > ): Promise< Run> {
    return this.prisma.run.update( { where: { id }, data } )
  }

  async getRuns( { provider, status, page = 1, limit = 20 }: GetRunsRequest ): Promise< PaginatedResponse< Run > > {
    const where: Record< string, unknown > = {}
    if ( provider ) where.provider = provider
    if ( status ) where.status = status

    const skip = ( page - 1 ) * limit

    const [ total, data ] = await Promise.all( [
      this.prisma.run.count( { where } ),
      this.prisma.run.findMany( { where, orderBy: { createdAt: 'desc' }, skip, take: limit } ),
    ] )

    return { data, total, page, limit, totalPages: Math.ceil( total / limit ) }
  }

  // BronzeRecord
  async createBronzeRecords( runId: string, provider: string, records: RedditRecord[] ): Promise< { stored: number, skipped: number } > {
    const data = records.map( record => ( {
      runId,
      provider,
      externalId: record.post_id,
      rawPayload: record as object,
      preFilterStatus: PreFilterStatus.PENDING,
    } ) )

    const result = await this.prisma.bronzeRecord.createMany( { data, skipDuplicates: true } )
    const stored = result.count
    const skipped = records.length - stored

    this.logger.log( `Stored ${ stored } bronze records, skipped ${ skipped } duplicates` )
    return { stored, skipped }
  }

  async getBronzeRecords( runId: string, preFilterStatus?: PreFilterStatus ): Promise< BronzeRecord[] > {
    const where = preFilterStatus ? { runId, preFilterStatus } : { runId }
    return this.prisma.bronzeRecord.findMany( { where } )
  }

  async updateBronzeRecord( id: string, data: Partial< {
    preFilterStatus: PreFilterStatus
    preFilterMode: PreFilterMode
    haikuCostUsd: number
  } > ): Promise<BronzeRecord> {
    return this.prisma.bronzeRecord.update( { where: { id }, data } )
  }

  // FilterRun
  async createFilterRun( data: { runId: string, preFilterMode: PreFilterMode } ): Promise< FilterRun > {
    this.logger.log( `Creating filter run for run: ${ data.runId }` )
    return this.prisma.filterRun.create( { data: { ...data, status: FilterRunStatus.PENDING } } )
  }

  async updateFilterRun( id: string, data: Partial< {
    status: FilterRunStatus
    totalProcessed: number
    totalPassed: number
    totalDropped: number
    totalMalformed: number
    totalCostUsd: number
    startedAt: Date
    completedAt: Date
  } > ): Promise<FilterRun> {
    return this.prisma.filterRun.update( { where: { id }, data } )
  }

  async getFilterRuns( { runId, page = 1, limit = 20 }: GetFilterRunsRequest ): Promise< PaginatedResponse< FilterRun > > {
    const where = runId ? { runId } : {}
    const skip = ( page - 1 ) * limit

    const [ total, data ] = await Promise.all( [
      this.prisma.filterRun.count( { where } ),
      this.prisma.filterRun.findMany( { where, orderBy: { createdAt: 'desc' }, skip, take: limit } ),
    ] )

    return { data, total, page, limit, totalPages: Math.ceil( total / limit ) }
  }

  // SilverSignal
  async createSilverSignal( data: {
    bronzeRecordId: string
    painScore: number
    painSummary: string
    category: SignalCategory
    evidenceQuotes: string[]
    marketSize: MarketSize
    sourceMeta: object
    preFilterMode: PreFilterMode
    promotionThreshold: number
    sonnetCostUsd: number
    processedAt: Date
  } ): Promise< SilverSignal > {
    return this.prisma.silverSignal.create( { data } )
  }

  async getSilverSignals( { provider, minPainScore = 6, page = 1, limit = 20, sortBy = 'painScore', sortOrder = 'desc' }: GetSilverSignalsRequest ): Promise< PaginatedResponse< SilverSignal > > {
    const where: Record< string, unknown > = {}
    if ( minPainScore != undefined ) where.painScore = { gte: minPainScore }
    if ( provider ) where.bronzeRecord = { provider }

    const skip = ( page - 1 ) * limit

    const [ total, data ] = await Promise.all( [
      this.prisma.silverSignal.count( { where } ),
      this.prisma.silverSignal.findMany( { where, orderBy: { [ sortBy ]: sortOrder }, skip, take: limit } ),
    ] )

    return { data, total, page, limit, totalPages: Math.ceil( total / limit ) }
  }
}
