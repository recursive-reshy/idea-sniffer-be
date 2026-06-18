// Realistic Anthropic response for FilterService (PASS classification)
export const mockPassAnthropicResponse = {
  content: [ { type: 'text', text: 'PASS' } ],
  usage:   { input_tokens: 150, output_tokens: 1 },
}

// Realistic Anthropic response for FilterService (DROP classification)
export const mockDropAnthropicResponse = {
  content: [ { type: 'text', text: 'DROP' } ],
  usage:   { input_tokens: 150, output_tokens: 1 },
}

// Realistic Anthropic response for DistillService (pain signal JSON)
export const mockPainSignalAnthropicResponse = {
  content: [
    {
      type: 'text',
      text: JSON.stringify( {
        painScore:      8,
        painSummary:    'Founders spending hours manually copying data between CRM and billing tools',
        category:       'manual_process',
        evidenceQuotes: [
          'spending hours on manual data entry',
          'We tried Zapier but it breaks every other week',
        ],
        marketSize: 'large',
        reasoning:  'High upvotes and engagement indicate a widespread and acute problem.',
      } ),
    },
  ],
  usage: { input_tokens: 500, output_tokens: 120 },
}

// Low-score pain signal response (below promotion threshold of 6)
export const mockLowScorePainSignalAnthropicResponse = {
  content: [
    {
      type: 'text',
      text: JSON.stringify( {
        painScore:      3,
        painSummary:    'User mildly annoyed by a UI quirk',
        category:       'broken_workflow',
        evidenceQuotes: [ 'kind of annoying sometimes' ],
        marketSize:     'small',
      } ),
    },
  ],
  usage: { input_tokens: 400, output_tokens: 80 },
}

export const mockAnthropicClient = {
  messages: {
    create: jest.fn(),
  },
}
