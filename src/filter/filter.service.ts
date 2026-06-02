// Nest
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// Prisma
import { BronzeRecord, FilterRunStatus, PreFilterMode, PreFilterStatus } from '@prisma/client'
// Anthropic
import Anthropic from '@anthropic-ai/sdk'
// Services
import { StorageService } from '@storage/storage.service'
// Prompts
import { buildFilterPrompt, PreFilterPromptInput } from '@prompts/prefilter.prompt'
// Types
import { FilterResult } from '@app-types/Filter'
import { RedditRecord } from '@app-types/Reddit'

const INPUT_COST_PER_TOKEN  = 0.0000008   // claude-haiku-4-5 input  pricing
const OUTPUT_COST_PER_TOKEN = 0.000004    // claude-haiku-4-5 output pricing
const MAX_FILTER_COST_USD   = 1 * 2 // 2 USD TODO: Make this configurable

@Injectable()
export class FilterService {
  private readonly logger = new Logger( FilterService.name )
  private readonly anthropic: Anthropic

  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService
  ) {
    // TODO: Consider making this a client so I dont have to repeat myself. Singleton?
    this.anthropic = new Anthropic( {
      apiKey: this.configService.get< string >( 'ANTHROPIC_API_KEY' )
    } )
  }

  private async classifyRecord(
    record: BronzeRecord,
    mode: PreFilterMode,
  ): Promise< { status: PreFilterStatus; costUsd: number } > {
    const raw = record.rawPayload as unknown as RedditRecord
    const input: PreFilterPromptInput = {
      title: raw.title,
      description: raw.description,
      comments: raw.comments,
      community_name: raw.community_name,
      community_members_num: raw.community_members_num,
      num_upvotes: raw.num_upvotes,
      num_comments: raw.num_comments,
    }

    const { systemPrompt, userMessage } = buildFilterPrompt( input, mode )

    const message = await this.anthropic.messages.create( {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      system: systemPrompt,
      messages: [ { role: 'user', content: userMessage } ],
    } )

    const costUsd =
      ( message.usage.input_tokens  * INPUT_COST_PER_TOKEN ) +
      ( message.usage.output_tokens * OUTPUT_COST_PER_TOKEN )

    const text = message.content
      .filter( b => b.type === 'text' )
      .map( b => ( b as { type: 'text'; text: string } ).text )
      .join( '' )
      .trim()
      .toUpperCase()

    // Prompt contract: anything that isn't exactly PASS is treated as DROP
    const status = text === 'PASS' ? PreFilterStatus.PASS : PreFilterStatus.DROP

    this.logger.log( `Record ${ raw.post_id } → ${ status } | cost: $${ costUsd.toFixed( 6 ) }` )

    return { status, costUsd }
  }

  async filter( runId: string, mode: PreFilterMode = PreFilterMode.LENIENT ): Promise< FilterResult > {
    // 1. Create filter run tracking record
    const filterRun = await this.storageService.createFilterRun( { runId, preFilterMode: mode } )
    await this.storageService.updateFilterRun( filterRun.id, { status: FilterRunStatus.RUNNING, startedAt: new Date() } )

    try {
      // 2. Read PENDING bronze records for this run
      const records = await this.storageService.getBronzeRecords( runId, PreFilterStatus.PENDING )

      this.logger.log( `Classifying ${ records.length } records for run: ${ runId } [mode: ${ mode }]` )

      // 3. Classify each record with Haiku
      let passed       = 0
      let dropped      = 0
      let malformed    = 0
      let totalCostUsd = 0
      let haltedEarly  = false

      for ( const record of records ) {
        if ( totalCostUsd >= MAX_FILTER_COST_USD ) {
          this.logger.warn( `Cost cap of $${ MAX_FILTER_COST_USD } reached. Halting early.` )
          haltedEarly = true
          break
        }

        try {
          const { status, costUsd } = await this.classifyRecord( record, mode )
          totalCostUsd += costUsd

          await this.storageService.updateBronzeRecord( record.id, {
            preFilterStatus: status,
            preFilterMode:   mode,
            haikuCostUsd:    costUsd,
          } )

          if ( status === PreFilterStatus.PASS ) passed++
          else dropped++

        } catch ( error ) {
          malformed++
          this.logger.error( `Failed to classify record ${ record.id }`, error )
        }
      }

      const stats = {
        total: records.length,
        passed,
        dropped,
        malformed,
        totalCostUsd,
        haltedEarly,
      }

      // 4. Update filter run to COMPLETE
      await this.storageService.updateFilterRun( filterRun.id, {
        status:         FilterRunStatus.COMPLETE,
        totalProcessed: stats.total,
        totalPassed:    stats.passed,
        totalDropped:   stats.dropped,
        totalMalformed: stats.malformed,
        totalCostUsd:   stats.totalCostUsd,
        completedAt:    new Date(),
      } )

      this.logger.log( `Filter complete. Stats: ${ JSON.stringify( stats ) }` )

      return { runId, stats }
    } catch ( error ) {
      await this.storageService.updateFilterRun( filterRun.id, { status: FilterRunStatus.FAILED } )
      throw error
    }
  }
}
