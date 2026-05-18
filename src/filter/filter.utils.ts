// Types
import { FilterMode, FilterThresholds } from '@app-types/Filter'
import { RedditRecord } from '@app-types/Reddit'


// TODO: All the constants should probably go to a config file. If UI is up, it should be controlled from there. 
const THRESHOLDS: Record< FilterMode, FilterThresholds > = {
  [ FilterMode.CONSERVATIVE ]: { minUpvotes: 2, minComments: 1 },
  [ FilterMode.BALANCED ]: { minUpvotes: 10, minComments: 3 },
  [ FilterMode.AGGRESSIVE ]: { minUpvotes: 25, minComments: 8 },
}

// Engagement ratio threshold — posts in small communities
// Get a pass if they punch above their weight
const ENGAGEMENT_RATIO_OVERRIDE = 0.01 // 1% of the subscribers of the community

// Take top 5 comments for analysis
const MAX_COMMENTS = 5

const EXCLUSION_PATTERNS: RegExp[] = [
  /meme/i,
  /shitpost/i,
  /giveaway/i,
  /tutorial/i,
  /course/i,
]

const INCLUSION_PATTERNS: RegExp[] = [
  /is there a tool/i,
  /looking for a tool/i,       // inclusion signal per PRD
  /looking for a software/i,
  /frustrated with/i,
  /alternatives to/i,
  /how do i automate/i,
  /manual workflow/i,
  /tired of spending hours/i,
  /i would pay for/i,
]

// Filter low engagment posts
// TODO: Not provider agnostic. Need to revisit
export const tierAFilter = ( 
  { num_upvotes,
    num_comments,
    community_members_num
  }: RedditRecord, 
  mode: FilterMode 
): boolean => {
  const { minUpvotes, minComments } = THRESHOLDS[ mode ]

  const meetsUpvoteThreshold = num_upvotes >= minUpvotes
  const meetsCommentThreshold = num_comments >= minComments

  // Engagement ratio override for small communities
  const engagementRatio = community_members_num > 0 
    ? num_upvotes / community_members_num
    : 0

  const meetsEngagementRatioOverride = engagementRatio >= ENGAGEMENT_RATIO_OVERRIDE

  return ( meetsUpvoteThreshold && meetsCommentThreshold ) || meetsEngagementRatioOverride
}

// Complile text for LLM analysis. Take title, description and top comments
export const tierBCompile = ( { title, description, comments: parsedComments }: RedditRecord ): string => {
  const comments = parsedComments && parsedComments.length ?
    parsedComments.length && parsedComments
      .slice( 0, MAX_COMMENTS )
      .map( ( { comment } ) => comment )
      .join( ' ' )
    :
      []
      
  return [
    title,
    description,
    comments
  ]
    .filter( Boolean )
    .join( ' ' )
    .toLocaleLowerCase()
}

// Filter based on inclusion/exclusion patterns
export const tierCFilter = ( textBlob: string ): boolean => {
  // Exclusion first - fail fast
  if( EXCLUSION_PATTERNS.some( pattern => pattern.test( textBlob ) ) ) // TODO: Need to review. Might be too aggressive.
    return false

  if( INCLUSION_PATTERNS.some( pattern => pattern.test( textBlob ) ) )
    return true

  return false
}

