// Nest
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// Anthropic
import Anthropic from '@anthropic-ai/sdk'
// Prisma
import { MarketSize, PreFilterMode, PreFilterStatus, SignalCategory, SilverSignal } from '@prisma/client'
// Services
import { GetSilverSignalsRequest, StorageService } from '@storage/storage.service'
// Prompts
import { buildRedditUserPrompt, REDDIT_SYSTEM_PROMPT } from '@prompts/reddit.prompt'
// Types
import { RedditRecord } from '@app-types/Reddit'
import { OutputMode, PainSignal } from '@app-types/Silver'
import { PaginatedResponse } from '@app-types/Common'

const INPUT_COST_PER_TOKEN = 0.000003     // claude-sonnet-4 input pricing
const OUTPUT_COST_PER_TOKEN = 0.000015    // claude-sonnet-4 output pricing
// TODO: Should probably be coming from API or config
const MAX_DISTILL_COST_USD = 1.00
const PAIN_SCORE_THRESHOLD = 6

export interface DistillResult {
  runId: string
  stats: {
    total: number
    promoted: number
    rejected: number
    failed: number
    totalCostUsd: number
    haltedEarly: boolean
  }
}

@Injectable()
export class DistillService {
  private readonly logger = new Logger( DistillService.name )
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

  private async scoreRecord(
    record: RedditRecord,
    outputMode: OutputMode,
  ): Promise< { signal: PainSignal, costUsd: number } > {
    const userPrompt = buildRedditUserPrompt( record, outputMode )

    const message = await this.anthropic.messages.create( {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: REDDIT_SYSTEM_PROMPT,
      messages: [ { role: 'user', content: userPrompt } ],
    } )

    const costUsd =
      ( message.usage.input_tokens * INPUT_COST_PER_TOKEN ) +
      ( message.usage.output_tokens * OUTPUT_COST_PER_TOKEN )

    this.logger.log(
      `Record ${ record.post_id } — input: ${ message.usage.input_tokens } tokens, ` +
      `output: ${ message.usage.output_tokens } tokens, cost: $${ costUsd.toFixed( 6 ) }`
    )

    const text = message.content
      .filter( block => block.type === 'text' )
      .map( block => ( block as { type: 'text'; text: string } ).text )
      .join( '' )

    // Strip any accidental markdown fences
    const clean = text.replace( /```json|```/g, '' ).trim()

    return { signal: JSON.parse( clean ) as PainSignal, costUsd }
  }

  async distill(
    runId: string,
    outputMode: OutputMode = OutputMode.WITH_REASONING,
    preFilterMode: PreFilterMode = PreFilterMode.LENIENT,
  ): Promise< DistillResult > {
    // 1. Read PASS bronze records for this run
    const bronzeRecords = await this.storageService.getBronzeRecords( runId, PreFilterStatus.PASS )

    this.logger.log( `Distilling ${ bronzeRecords.length } records for run: ${ runId } [mode: ${ outputMode }]` )

    let failed = 0
    let rejected = 0
    let promoted = 0
    let totalCostUsd = 0
    let haltedEarly = false

    // 2. Score each record
    for ( const bronzeRecord of bronzeRecords ) {
      if ( totalCostUsd >= MAX_DISTILL_COST_USD ) {
        this.logger.warn(
          `Cost cap of $${ MAX_DISTILL_COST_USD } reached at $${ totalCostUsd.toFixed( 6 ) }. Halting early.`
        )
        haltedEarly = true
        break
      }

      const record = bronzeRecord.rawPayload as unknown as RedditRecord

      try {
        const { signal: painSignal, costUsd } = await this.scoreRecord( record, outputMode )
        totalCostUsd += costUsd

        // 3. Only promote records above threshold
        if ( painSignal.painScore < PAIN_SCORE_THRESHOLD ) {
          rejected++
          this.logger.log( `Record ${ record.post_id } rejected with score ${ painSignal.painScore }` )
          continue
        }

        // 4. Persist silver signal to DB
        await this.storageService.createSilverSignal( {
          bronzeRecordId: bronzeRecord.id,
          painScore: painSignal.painScore,
          painSummary: painSignal.painSummary,
          category: painSignal.category as unknown as SignalCategory,
          evidenceQuotes: painSignal.evidenceQuotes,
          marketSize: painSignal.marketSize as unknown as MarketSize,
          sourceMeta: {
            postId: record.post_id,
            url: record.url,
            title: record.title,
            communityName: record.community_name,
            numUpvotes: record.num_upvotes,
            numComments: record.num_comments,
            datePosted: record.date_posted,
          },
          preFilterMode,
          promotionThreshold: PAIN_SCORE_THRESHOLD,
          sonnetCostUsd: costUsd,
          processedAt: new Date(),
        } )

        promoted++

      } catch ( error ) {
        failed++
        this.logger.error( `Failed to score record ${ record.post_id }`, error )
      }
    }

    const stats = {
      total: bronzeRecords.length,
      promoted,
      rejected,
      failed,
      totalCostUsd,
      haltedEarly,
    }

    this.logger.log( `Distillation complete. Stats: ${ JSON.stringify( stats ) }` )

    return { runId, stats }
  }

  async getSilverSignal( request: GetSilverSignalsRequest ): Promise< PaginatedResponse< SilverSignal > > {
    try {
      return await this.storageService.getSilverSignals( request )
    } catch ( error ) {
      this.logger.error( `Failed to fetch silver signals`, error )
      throw new HttpException( 'Server error', HttpStatus.SERVICE_UNAVAILABLE )
    }
  }
}
