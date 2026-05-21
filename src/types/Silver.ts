export enum PainCategory {
  MISSING_TOOL = 'missing_tool',
  BROKEN_WORKFLOW = 'broken_workflow',
  SWITCHING_FRUSTRATION = 'switching_frustration',
  MANUAL_PROCESS = 'manual_process',
}

export enum MarketSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export enum OutputMode {
  STRUCTURED = 'structured',
  WITH_REASONING = 'with_reasoning',
  WITH_CONFIDENCE = 'with_confidence',
}

// AI generated fields
export interface PainSignal {
  painScore: number
  painSummary: string
  category: PainCategory
  evidenceQuotes: string[]
  marketSize: MarketSize
  reasoning?: string // present when outputMode is with_reasoning
  confidence?: string // present when outputMode is with_confidence
}

// Full Silver layer record
export interface SilverRecord {
  // AI generated
  painScore: number
  painSummary: string
  category: PainCategory
  evidenceQuotes: string[]
  marketSize: MarketSize
  reasoning?: string
  confidence?: string

  // Carried over from RedditRecord
  postId: string
  title: string
  url: string
  communityName: string
  numUpvotes: number
  numComments: number
  datePosted: string

  // System metadata
  provider: string
  processedAt: string
  filterMode: string
  outputMode: OutputMode
}