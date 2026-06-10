export enum SortBy {
  HOT = 'Hot',
  NEW = 'New',
  TOP = 'Top',
  RISING = 'Rising'
}

export enum SortByTime {
  TODAY = 'Today',
  THIS_WEEK = 'This Week',
  THIS_YEAR = 'This Year',
  ALL_TIME = 'All Time'
}

// Payload for starting a Reddit scrape run
export interface FetchSubredditsPayload {
  subreddits: string[]
  sort_by?: SortBy
  sort_by_time?: SortByTime
  keyword?: string
  start_date?: string
}

// Response from Bright data scraper
export interface RedditRecord {
  // Core signal fields
  post_id: string
  url: string
  title: string
  description: string
  description_markdown: string
  date_posted: string

  // Engagement signals
  num_upvotes: number
  num_comments: number
  post_karma: number

  // Community context
  community_name: string
  community_url: string
  community_description: string
  community_members_num: number

  // Author
  user_posted: string
  user_id: string

  // Content
  comments: RedditComment[]
  related_posts: RedditRelatedPost[]
  tag: string | null
  photos: string | null
  videos: string | null

  // Metadata
  archived: string
  timestamp: string
  input: { url: string }
  discovery_input: {
    url: string
    sort_by: string
    sort_by_time: string
    keyword: string
    start_date: string
  }
}

export interface RedditComment {
  comment: string
  url: string
  user_commenting: string
  user_url: string
  date_of_comment: string
  num_upvotes: number
  num_replies: number
  replies: any[]
}

export interface RedditRelatedPost {
  community: string
  community_url: string
  title: string
  url: string
  thumbnail: string | null
  num_upvotes: string
  num_comments: number
}

// Response shape returned by startRun
export interface RedditRunResult {
  runId: string
  snapshotId: string
}

// Response shape returned by ingestSnapshot
export interface RedditIngestResult {
  runId: string
  totalFetched: number
  stored: number
  skipped: number
  elapsed: string
}

// Response shape returned by getSnapshotStatus
export interface RedditSnapshotStatus {
  snapshotId: string
  status: string
}
