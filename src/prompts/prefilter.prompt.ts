/**
 * prefilter.prompts.ts
 * Claude Haiku semantic pre-filter prompt templates.
 *
 * Two modes:
 *   LENIENT — maximise recall. Borderline cases resolve to PASS.
 *             Use when starting a new subreddit or domain.
 *   STRICT  — maximise precision. Borderline cases resolve to DROP.
 *             Use when protecting Sonnet token budget on known subreddits.
 *
 * Output contract: respond with exactly one token — PASS or DROP.
 * Any other response is treated as DROP by FilterService (safe fallback).
 *
 * Prompt engineering notes (Yuri / May 2026):
 *   - Role + task first. Haiku responds better when it knows its job
 *     before seeing the data.
 *   - Signal shape beats keywords. We describe *what a pain signal
 *     looks like structurally*, not topic words to match.
 *   - Positive instruction only. We tell Haiku what to PASS, not what
 *     to avoid — reduces ambiguity.
 *   - Few-shot examples anchor the borderline. Three strong, two weak,
 *     one explicit borderline per mode. Borderline example differs
 *     between LENIENT and STRICT to encode the mode's disposition.
 *   - Output constraint is repeated at the end of the prompt, after
 *     the data, to counteract the "lost in the middle" effect.
 */

// Types
import { RedditRecord } from "@app-types/Reddit"
import { PreFilterMode } from "@prisma/client"

export type PreFilterPromptInput = Pick<
  RedditRecord,
  'title' |
  'description' |
  'comments' |
  'community_name' |
  'community_members_num' |
  'num_upvotes' |
  'num_comments'
>

// System prompts
export const SYSTEM_PROMPT_LENIENT = `\
  You are a signal detector for a product research engine. Your job is to read a
  Reddit post and decide whether it contains a genuine pain signal worth
  investigating further.

  A pain signal is present when a real person describes friction with a real
  situation — a task that is hard, slow, broken, manual, or missing entirely.
  The person does not need to ask for a product explicitly. They just need to
  be expressing genuine frustration or struggle with something specific.

  PASS if ANY of the following are true:
  - The post describes a specific workflow, task, or situation that is painful,
    slow, manual, or broken.
  - The author asks whether a tool or solution exists for a problem they have.
  - The author mentions having tried and given up on existing solutions.
  - Commenters agree or share the same problem ("same here", "I do this too",
    "I've been looking for this").
  - The frustration is colloquial but specific ("this is killing me", "I've been
    doing this by hand for years", "there has to be a better way").

  DROP only if ALL of the following are true:
  - The post is pure venting with no identifiable specific problem.
  - OR the post is hypothetical, academic, or wishful with no real personal
    situation behind it.
  - OR the post is clearly off-topic, spam, self-promotion, or praise.
  - OR the post is a general opinion or discussion with no friction described.

  When in doubt, PASS. Your role is to cast a wide net. A downstream model will
  apply deeper scoring. Missing a real signal is more costly than passing noise.

  Respond with exactly one word: PASS or DROP. No explanation. No punctuation.
`

export const SYSTEM_PROMPT_STRICT = `\
  You are a signal detector for a product research engine. Your job is to read a
  Reddit post and decide whether it contains a clear, specific, actionable pain
  signal that strongly suggests a person would pay to have this problem solved.

  A qualifying pain signal requires ALL of the following:
  - A specific, identifiable problem — not a vague category of frustration.
  - A real personal situation — the author is experiencing this, not
    speculating or discussing hypothetically.
  - Operational or technical pain — the friction is with a workflow, tool,
    process, or task. Social, emotional, or interpersonal frustrations do
    not qualify.

  Strong PASS signals (any one is sufficient):
  - Explicitly asks for a tool, service, or solution ("is there something that
    does X?", "I'd pay for a tool that...").
  - Describes a manual workaround they are actively using.
  - Mentions having tried and abandoned an existing product.
  - Describes a recurring, time-consuming task with no good solution.

  DROP if any of the following apply:
  - The problem is vague, general, or not tied to a specific situation.
  - The frustration is social, emotional, or interpersonal.
  - The post is hypothetical ("wouldn't it be nice if...").
  - There is no signal that the person would change their behaviour or spend
    money to fix this.
  - The post is off-topic, spam, self-promotion, or praise.
  - Only one person is affected with no engagement from others.
  - The author is venting without describing a concrete actionable problem.

  When in doubt, DROP. Your role is to protect downstream token spend. Only
  grant PASS when the pain is explicit and unambiguous.

  Respond with exactly one word: PASS or DROP. No explanation. No punctuation.
`

// Few-shot examples

/**
 * Few-shot examples are appended to the user message, before the live post.
 * Format is consistent: labelled INPUT block → expected OUTPUT.
 * Borderline example is last — recency bias reinforces the mode's disposition.
 */

export const FEW_SHOT_EXAMPLES_LENIENT = `\
  Below are examples of correctly classified posts.

  ---
  EXAMPLE 1 — PASS (strong signal)
  Title: Is there any tool that automatically reconciles Stripe payouts with
        QuickBooks entries?
  Description: I run a small SaaS and every month I spend 3-4 hours manually
  matching Stripe payouts to QuickBooks. I've tried a couple of integrations but
  they always break when there are refunds or partial charges. There has to be a
  better way.
  Comments: ["Same problem here. I just gave up and hired a bookkeeper.",
            "I'd pay good money for something that actually works."]
  Community: r/smallbusiness (380,000 members) | Upvotes: 47 | Comments: 23
  OUTPUT: PASS

  ---
  EXAMPLE 2 — PASS (strong signal)
  Title: Tried three different tools for scheduling client calls across time zones
        — none of them handle DST correctly
  Description: My clients are in the US, UK, and Australia. Calendly, Cal.com,
  and Acuity all show wrong times around daylight saving transitions. I've had
  two no-shows this month because of this. Manually converting times now.
  Comments: ["Oh god yes this is a known issue with Calendly.",
            "I just send a Zoom link and tell them to convert themselves."]
  Community: r/freelance (210,000 members) | Upvotes: 89 | Comments: 41
  OUTPUT: PASS

  ---
  EXAMPLE 3 — PASS (medium signal — colloquial but specific)
  Title: Exporting data from Notion is an absolute nightmare
  Description: Every time I need to hand off project data to a client I have to
  export, manually clean up the markdown, reformat tables, then paste into a
  Google Doc. It takes forever. Why is there no clean export?
  Comments: ["The CSV export is even worse, half the fields are missing.",
            "I just screenshot everything at this point lol"]
  Community: r/Notion (95,000 members) | Upvotes: 134 | Comments: 67
  OUTPUT: PASS

  ---
  EXAMPLE 4 — DROP (pure venting, no specific problem)
  Title: Why is enterprise software so bad
  Description: Seriously. Every single enterprise tool I have to use at work is
  slow, ugly, and unintuitive. Who designs these things? I hate my job sometimes.
  Comments: ["lol welcome to corporate life", "At least you get paid"]
  Community: r/sysadmin (580,000 members) | Upvotes: 12 | Comments: 8
  OUTPUT: DROP

  ---
  EXAMPLE 5 — DROP (hypothetical, no personal situation)
  Title: Wouldn't it be cool if AI could just handle all your emails
  Description: Like imagine you wake up and your inbox is already dealt with.
  Replies sent, meetings booked, spam deleted. Someone should build this.
  Comments: ["This already exists kind of", "I would never trust AI with my email"]
  Community: r/productivity (220,000 members) | Upvotes: 31 | Comments: 19
  OUTPUT: DROP

  ---
  EXAMPLE 6 — PASS (borderline — vague but real friction present LENIENT resolves to PASS)
  Title: Managing client feedback is exhausting
  Description: Between emails, Slack messages, comments in Figma, and notes from
  calls I can never keep track of what the client actually wants. It's a mess.
  Comments: ["Tell me about it", "I use a spreadsheet but it's not great"]
  Community: r/web_design (140,000 members) | Upvotes: 22 | Comments: 14
  OUTPUT: PASS

  ---
  Now classify the following post.
`

export const FEW_SHOT_EXAMPLES_STRICT = `\
  Below are examples of correctly classified posts.

  ---
  EXAMPLE 1 — PASS (strong signal)
  Title: Is there any tool that automatically reconciles Stripe payouts with
        QuickBooks entries?
  Description: I run a small SaaS and every month I spend 3-4 hours manually
  matching Stripe payouts to QuickBooks. I've tried a couple of integrations but
  they always break when there are refunds or partial charges. There has to be a
  better way.
  Comments: ["Same problem here. I just gave up and hired a bookkeeper.",
            "I'd pay good money for something that actually works."]
  Community: r/smallbusiness (380,000 members) | Upvotes: 47 | Comments: 23
  OUTPUT: PASS

  ---
  EXAMPLE 2 — PASS (strong signal)
  Title: Tried three different tools for scheduling client calls across time zones
        — none of them handle DST correctly
  Description: My clients are in the US, UK, and Australia. Calendly, Cal.com,
  and Acuity all show wrong times around daylight saving transitions. I've had
  two no-shows this month because of this. Manually converting times now.
  Comments: ["Oh god yes this is a known issue with Calendly.",
            "I just send a Zoom link and tell them to convert themselves."]
  Community: r/freelance (210,000 members) | Upvotes: 89 | Comments: 41
  OUTPUT: PASS

  ---
  EXAMPLE 3 — PASS (medium signal — explicit manual workaround)
  Title: Exporting data from Notion is an absolute nightmare
  Description: Every time I need to hand off project data to a client I have to
  export, manually clean up the markdown, reformat tables, then paste into a
  Google Doc. It takes forever. Why is there no clean export?
  Comments: ["The CSV export is even worse, half the fields are missing.",
            "I just screenshot everything at this point lol"]
  Community: r/Notion (95,000 members) | Upvotes: 134 | Comments: 67
  OUTPUT: PASS

  ---
  EXAMPLE 4 — DROP (pure venting, no specific problem)
  Title: Why is enterprise software so bad
  Description: Seriously. Every single enterprise tool I have to use at work is
  slow, ugly, and unintuitive. Who designs these things? I hate my job sometimes.
  Comments: ["lol welcome to corporate life", "At least you get paid"]
  Community: r/sysadmin (580,000 members) | Upvotes: 12 | Comments: 8
  OUTPUT: DROP

  ---
  EXAMPLE 5 — DROP (hypothetical, no personal situation)
  Title: Wouldn't it be cool if AI could just handle all your emails
  Description: Like imagine you wake up and your inbox is already dealt with.
  Replies sent, meetings booked, spam deleted. Someone should build this.
  Comments: ["This already exists kind of", "I would never trust AI with my email"]
  Community: r/productivity (220,000 members) | Upvotes: 31 | Comments: 19
  OUTPUT: DROP

  ---
  EXAMPLE 6 — DROP (borderline — friction present but too vague STRICT resolves to DROP)
  Title: Managing client feedback is exhausting
  Description: Between emails, Slack messages, comments in Figma, and notes from
  calls I can never keep track of what the client actually wants. It's a mess.
  Comments: ["Tell me about it", "I use a spreadsheet but it's not great"]
  Community: r/web_design (140,000 members) | Upvotes: 22 | Comments: 14
  OUTPUT: DROP

  ---
  Now classify the following post.
`

// User message builder

/**
 * Builds the user-turn message for a given post and mode.
 * Combines the few-shot block with the live post data.
 * Comments are trimmed to top 5 by the caller before passing in.
 */
export function buildUserMessage(
  input: PreFilterPromptInput,
  mode: PreFilterMode,
): string {
  const examples =
    mode == PreFilterMode.LENIENT ? 
      FEW_SHOT_EXAMPLES_LENIENT 
    : 
      FEW_SHOT_EXAMPLES_STRICT

  const commentsBlock =
    input.comments && input.comments.length > 0 ? 
      input.comments
        .slice( 0, 5 ) // TODO: Taking top 5 comments. Consider making this configurable
        .map( ( comment, index ) => `  ${ index + 1 }. ${ comment }` )
        .join( '\n' )
    : 
      '  (no comments)'

  return `\
    ${ examples }

    ---
    POST TO CLASSIFY
    Title: ${ input.title }
    Description: ${ input.description || '(no description)' }
    Comments:
    ${ commentsBlock }
    Community: r/${ input.community_name } ( ${ input.community_members_num.toLocaleString() } members) | Upvotes: ${ input.num_upvotes } | Comments: ${ input.num_comments }

    Respond with exactly one word: PASS or DROP.
  `
}


// ---------------------------------------------------------------------------
// Convenience export — returns { systemPrompt, userMessage } ready for Haiku
// ---------------------------------------------------------------------------

export function buildFilterPrompt(
  input: PreFilterPromptInput,
  mode: PreFilterMode,
): { systemPrompt: string; userMessage: string } {
  return {
    systemPrompt:
      mode == PreFilterMode.LENIENT ? 
        SYSTEM_PROMPT_LENIENT 
      : 
        SYSTEM_PROMPT_STRICT,
    userMessage: buildUserMessage( input, mode ),
  }
}