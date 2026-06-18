import Anthropic from '@anthropic-ai/sdk'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { FilterRunStatus, PreFilterMode, PreFilterStatus } from '@prisma/client'

import { FilterService } from './filter.service'
import { StorageService } from '../storage/storage.service'
import { mockPassAnthropicResponse, mockAnthropicClient } from '../test/mocks/anthropic.mock'
import { mockBronzeRecord, mockFilterRun } from '../test/fixtures'

jest.mock( '@anthropic-ai/sdk' )

const MockedAnthropic = Anthropic as jest.MockedClass< typeof Anthropic >

const mockStorageService = {
  createFilterRun:    jest.fn(),
  updateFilterRun:    jest.fn(),
  getBronzeRecords:   jest.fn(),
  updateBronzeRecord: jest.fn(),
  getFilterRuns:      jest.fn(),
}

const mockConfigService = {
  get: jest.fn().mockReturnValue( 'test-anthropic-api-key' ),
}

describe( 'FilterService', () => {
  let service: FilterService

  beforeEach( async () => {
    jest.clearAllMocks()

    // Make the Anthropic constructor return our mock client
    MockedAnthropic.mockImplementation( () => mockAnthropicClient as unknown as Anthropic )

    const module: TestingModule = await Test.createTestingModule( {
      providers: [
        FilterService,
        { provide: StorageService,  useValue: mockStorageService },
        { provide: ConfigService,   useValue: mockConfigService },
      ],
    } ).compile()

    service = module.get< FilterService >( FilterService )
  } )

  describe( 'filter', () => {
    it( 'creates a filter run, classifies records, updates each record, and returns FilterResult with correct stats', async () => {
      const pendingRecord = { ...mockBronzeRecord, preFilterStatus: PreFilterStatus.PENDING }
      const pendingFilterRun = { ...mockFilterRun, status: FilterRunStatus.PENDING }

      mockStorageService.createFilterRun.mockResolvedValue( pendingFilterRun )
      mockStorageService.updateFilterRun.mockResolvedValue( {} )
      mockStorageService.getBronzeRecords.mockResolvedValue( [ pendingRecord ] )
      mockStorageService.updateBronzeRecord.mockResolvedValue( {} )
      mockAnthropicClient.messages.create.mockResolvedValue( mockPassAnthropicResponse )

      const result = await service.filter( 'run-uuid-1', PreFilterMode.LENIENT )

      // 1. Creates filter run
      expect( mockStorageService.createFilterRun ).toHaveBeenCalledWith( {
        runId:         'run-uuid-1',
        preFilterMode: PreFilterMode.LENIENT,
      } )

      // 2. Marks filter run as RUNNING
      expect( mockStorageService.updateFilterRun ).toHaveBeenCalledWith(
        pendingFilterRun.id,
        expect.objectContaining( { status: FilterRunStatus.RUNNING } ),
      )

      // 3. Fetches PENDING bronze records for the run
      expect( mockStorageService.getBronzeRecords ).toHaveBeenCalledWith(
        'run-uuid-1',
        PreFilterStatus.PENDING,
      )

      // 4. Calls Anthropic for each record
      expect( mockAnthropicClient.messages.create ).toHaveBeenCalledTimes( 1 )
      expect( mockAnthropicClient.messages.create ).toHaveBeenCalledWith(
        expect.objectContaining( { model: 'claude-haiku-4-5-20251001' } ),
      )

      // 5. Updates the bronze record with the classification result
      expect( mockStorageService.updateBronzeRecord ).toHaveBeenCalledWith(
        pendingRecord.id,
        expect.objectContaining( {
          preFilterStatus: PreFilterStatus.PASS,
          preFilterMode:   PreFilterMode.LENIENT,
        } ),
      )

      // 6. Marks filter run as COMPLETE with correct counters
      expect( mockStorageService.updateFilterRun ).toHaveBeenCalledWith(
        pendingFilterRun.id,
        expect.objectContaining( {
          status:         FilterRunStatus.COMPLETE,
          totalProcessed: 1,
          totalPassed:    1,
          totalDropped:   0,
          totalMalformed: 0,
        } ),
      )

      // 7. Returns FilterResult
      expect( result ).toEqual( {
        runId: 'run-uuid-1',
        stats: expect.objectContaining( {
          total:      1,
          passed:     1,
          dropped:    0,
          malformed:  0,
          haltedEarly: false,
        } ),
      } )
    } )
  } )

  describe( 'getFilterRuns', () => {
    it( 'delegates to StorageService.getFilterRuns with correct params and returns the paginated response', async () => {
      const paginatedResponse = {
        data:       [ mockFilterRun ],
        total:      1,
        page:       1,
        limit:      20,
        totalPages: 1,
      }
      mockStorageService.getFilterRuns.mockResolvedValue( paginatedResponse )

      const result = await service.getFilterRuns( 'run-uuid-1', 1, 20 )

      expect( mockStorageService.getFilterRuns ).toHaveBeenCalledWith( {
        runId: 'run-uuid-1',
        page:  1,
        limit: 20,
      } )
      expect( result ).toEqual( paginatedResponse )
    } )
  } )
} )
