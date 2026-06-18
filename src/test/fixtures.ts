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
import { RedditRecord } from '@app-types/Reddit'
import { PaginatedResponse } from '@app-types/Common'

export const mockRedditRecord: RedditRecord = {
  post_id: 't3_abc123',
  url: 'https://www.reddit.com/r/SaaS/comments/abc123/struggling_with_crm_integrations',
  title: 'Struggling with CRM integrations — spending hours on manual data entry',
  description: 'We have been manually copying data between our CRM and billing tool for 6 months. There has to be a better way. Would happily pay for something that just works.',
  description_markdown: '## CRM pain\n\nWe have been manually copying data...',
  date_posted: '2024-01-15T10:00:00Z',
  num_upvotes: 142,
  num_comments: 37,
  post_karma: 142,
  community_name: 'r/SaaS',
  community_url: 'https://www.reddit.com/r/SaaS',
  community_description: 'A community for SaaS founders and operators',
  community_members_num: 125000,
  user_posted: 'frustrated_founder',
  user_id: 'u_frustrated_founder',
  comments: [
    {
      comment: 'Same problem here. We tried Zapier but it breaks every other week.',
      url: 'https://www.reddit.com/r/SaaS/comments/abc123/comment/xyz1',
      user_commenting: 'another_founder',
      user_url: 'https://www.reddit.com/u/another_founder',
      date_of_comment: '2024-01-15T11:00:00Z',
      num_upvotes: 28,
      num_replies: 3,
      replies: [],
    },
  ],
  related_posts: [],
  tag: null,
  photos: null,
  videos: null,
  archived: 'false',
  timestamp: '2024-01-15T10:00:00Z',
  input: { url: 'https://www.reddit.com/r/SaaS/' },
  discovery_input: {
    url: 'https://www.reddit.com/r/SaaS/',
    sort_by: 'Hot',
    sort_by_time: 'This Week',
    keyword: '',
    start_date: '',
  },
}

export const mockRun: Run = {
  id: 'run-uuid-1',
  provider: 'reddit',
  snapshotId: 'snap-uuid-1',
  status: RunStatus.COMPLETE,
  subreddit: 'SaaS',
  sortBy: 'hot',
  totalFetched: 10,
  totalStored: 9,
  totalSkipped: 1,
  totalFailed: 0,
  startedAt: new Date('2024-01-15T10:00:00Z'),
  completedAt: new Date('2024-01-15T10:05:00Z'),
  createdAt: new Date('2024-01-15T10:00:00Z'),
}

export const mockBronzeRecord: BronzeRecord = {
  id: 'bronze-uuid-1',
  runId: 'run-uuid-1',
  provider: 'reddit',
  externalId: 't3_abc123',
  rawPayload: mockRedditRecord as unknown as object,
  preFilterStatus: PreFilterStatus.PENDING,
  preFilterMode: null,
  haikuCostUsd: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
}

export const mockFilterRun: FilterRun = {
  id: 'filter-run-uuid-1',
  runId: 'run-uuid-1',
  preFilterMode: PreFilterMode.LENIENT,
  status: FilterRunStatus.COMPLETE,
  totalProcessed: 5,
  totalPassed: 3,
  totalDropped: 2,
  totalMalformed: 0,
  totalCostUsd: 0.0012,
  startedAt: new Date('2024-01-15T10:01:00Z'),
  completedAt: new Date('2024-01-15T10:02:00Z'),
  createdAt: new Date('2024-01-15T10:01:00Z'),
}

export const mockSilverSignal: SilverSignal = {
  id: 'silver-uuid-1',
  bronzeRecordId: 'bronze-uuid-1',
  painScore: 8,
  painSummary: 'Founders spending hours manually copying data between CRM and billing tools',
  category: SignalCategory.manual_process,
  evidenceQuotes: [
    'spending hours on manual data entry',
    'We tried Zapier but it breaks every other week',
  ],
  marketSize: MarketSize.large,
  sourceMeta: {
    postId: 't3_abc123',
    url: 'https://www.reddit.com/r/SaaS/comments/abc123',
    title: 'Struggling with CRM integrations',
    communityName: 'r/SaaS',
    numUpvotes: 142,
    numComments: 37,
    datePosted: '2024-01-15T10:00:00Z',
  },
  preFilterMode: PreFilterMode.LENIENT,
  promotionThreshold: 6,
  sonnetCostUsd: 0.00045,
  processedAt: new Date('2024-01-15T10:03:00Z'),
  createdAt: new Date('2024-01-15T10:03:00Z'),
}

export function mockPaginatedResponse<T>( data: T[], page = 1, limit = 20 ): PaginatedResponse<T> {
  return {
    data,
    total: data.length,
    page,
    limit,
    totalPages: Math.ceil( data.length / limit ),
  }
}
