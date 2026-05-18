// TODO: Need to review once we have a better understanding of the data structure and requirements
// Transformed output from scraped data
export interface Signal {
  sourceId: string
  rawText: string
  originUrl: string
  metadata: Record< string, unknown >
  fetchedAt: string
  provider: string
}