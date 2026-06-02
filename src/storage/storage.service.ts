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

export interface GetSilverSignalsRequest {
  provider?: string
  minPainScore?: number
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

  async getSilverSignals( { provider, minPainScore = 6 }: GetSilverSignalsRequest ): Promise< SilverSignal[] > {
    const where: Record< string, unknown > = {}
    if ( minPainScore != undefined ) where.painScore = { gte: minPainScore }
    if ( provider ) where.bronzeRecord = { provider: provider }
    return this.prisma.silverSignal.findMany( { where, orderBy: { painScore: 'desc' } } )
  }
}
