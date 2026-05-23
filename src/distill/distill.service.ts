// Nest
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// Anthropic
import Anthropic from '@anthropic-ai/sdk'
// Services
import { StorageService } from '@storage/storage.service'
// Prompts
import { buildRedditUserPrompt, REDDIT_SYSTEM_PROMPT } from '@prompts/reddit.prompt'
// Types
import { FilterMode } from '@app-types/Filter'
import { RedditRecord } from '@app-types/Reddit'
import { OutputMode, PainSignal, SilverRecord } from '@app-types/Silver'

const INPUT_COST_PER_TOKEN = 0.000003     // claude-sonnet-4 input pricing
const OUTPUT_COST_PER_TOKEN = 0.000015    // claude-sonnet-4 output pricing
// TODO: Should probably be coming from API or config
const MAX_DISTILL_COST_USD = 1.00         // hard cap per distill run
const PAIN_SCORE_THRESHOLD = 6
const SILVER_PROVIDER = 'reddit'

export interface DistillResult {
  filteredFile: string
  silverFile: string
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
      .join('')

    // Strip any accidental markdown fences
    const clean = text.replace( /```json|```/g, '' ).trim()

    return { signal: JSON.parse( clean ) as PainSignal, costUsd }
  }

  async distill(
    filteredFile: string,
    outputMode: OutputMode = OutputMode.WITH_REASONING,
    filterMode: FilterMode = FilterMode.BALANCED,
  ): Promise< DistillResult > {
    // 1. Read filtered file
    const records = await this.storageService.readFiltered< RedditRecord >( filteredFile )

    this.logger.log(`Distilling ${ records.length } records from ${ filteredFile } [mode: ${ outputMode } ]`)

    const silverRecords: SilverRecord[] = []
    let failed = 0
    let rejected = 0
    let totalCostUsd = 0
    let haltedEarly = false

    // 2. Score each record
    for ( const record of records ) {
      if ( totalCostUsd >= MAX_DISTILL_COST_USD ) {
        this.logger.warn(
          `Cost cap of $${ MAX_DISTILL_COST_USD } reached at $${ totalCostUsd.toFixed( 6 ) }. Halting early.`
        )
        haltedEarly = true
        break
      }

      try {
        const { signal: painSignal, costUsd } = await this.scoreRecord( record, outputMode )
        totalCostUsd += costUsd

        // 3. Only promote records above threshold
        if ( painSignal.painScore < PAIN_SCORE_THRESHOLD ) {
          rejected++
          this.logger.log(`Record ${ record.post_id } rejected with score ${ painSignal.painScore }`)
          continue
        }

        // 4. Build Silver record
        const silverRecord: SilverRecord = {
          // AI generated
          ...painSignal,

          // Carried over from RedditRecord
          postId: record.post_id,
          title: record.title,
          url: record.url,
          communityName: record.community_name,
          numUpvotes: record.num_upvotes,
          numComments: record.num_comments,
          datePosted: record.date_posted,

          // System metadata
          provider: SILVER_PROVIDER,
          processedAt: new Date().toISOString(),
          filterMode,
          outputMode,
        }

        silverRecords.push( silverRecord )

      } catch ( error ) {
        failed++
        this.logger.error(`Failed to score record ${ record.post_id }`, error )
      }
    }

    // 5. Write Silver records
    const silverFile = silverRecords.length
      ? await this.storageService.writeSilver( silverRecords, SILVER_PROVIDER )
      : ''

    const stats = {
      total: records.length,
      promoted: silverRecords.length,
      rejected,
      failed,
      totalCostUsd,
      haltedEarly,
    }

    this.logger.log(`Distillation complete. Stats: ${ JSON.stringify( stats ) }`)

    return { filteredFile, silverFile, stats }
  }
}