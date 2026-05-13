// Payload for starting a Reddit scrape run
export interface FetchSubredditsPayload {
  subreddits: string[]
  // TODO: Add other params i.e. sort_by, sort_by_time, keyword, start_date
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
