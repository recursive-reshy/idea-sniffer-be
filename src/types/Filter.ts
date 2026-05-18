export enum FilterMode {
  CONSERVATIVE = 'conservative',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive',
}

// TODO: Need to revisit. This does not seem agnostic to the provider
export interface FilterThresholds {
  minUpvotes: number
  minComments: number
}

// TODO: Add comments on what each field represents
export interface FilterStats {
  total: number
  passed: number
  dropped: number
}

export interface FilterResult {
  filteredFile: string
  stats: FilterStats
}
