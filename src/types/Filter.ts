export interface FilterStats {
  total:        number
  passed:       number
  dropped:      number
  malformed:    number
  totalCostUsd: number
  haltedEarly:  boolean
}

export interface FilterResult {
  runId: string
  stats: FilterStats
}
