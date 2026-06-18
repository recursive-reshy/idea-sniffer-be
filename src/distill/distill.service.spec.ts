import Anthropic from '@anthropic-ai/sdk'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { PreFilterMode, PreFilterStatus } from '@prisma/client'

import { DistillService } from './distill.service'
import { StorageService } from '../storage/storage.service'
import {
  mockPainSignalAnthropicResponse,
  mockLowScorePainSignalAnthropicResponse,
  mockAnthropicClient,
} from '../test/mocks/anthropic.mock'
import { mockBronzeRecord, mockSilverSignal } from '../test/fixtures'
import { OutputMode } from '../types/Silver'

jest.mock( '@anthropic-ai/sdk' )

const MockedAnthropic = Anthropic as jest.MockedClass< typeof Anthropic >

const mockStorageService = {
  getBronzeRecords:   jest.fn(),
  createSilverSignal: jest.fn(),
  getSilverSignals:   jest.fn(),
}

const mockConfigService = {
  get: jest.fn().mockReturnValue( 'test-anthropic-api-key' ),
}

describe( 'DistillService', () => {
  let service: DistillService

  beforeEach( async () => {
    jest.clearAllMocks()

    MockedAnthropic.mockImplementation( () => mockAnthropicClient as unknown as Anthropic )

    const module: TestingModule = await Test.createTestingModule( {
      providers: [
        DistillService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: ConfigService,  useValue: mockConfigService },
      ],
    } ).compile()

    service = module.get< DistillService >( DistillService )
  } )

  describe( 'distill', () => {
    it( 'scores PASS records and promotes those above the threshold, returning correct stats', async () => {
      const passRecord = { ...mockBronzeRecord, preFilterStatus: PreFilterStatus.PASS }
      mockStorageService.getBronzeRecords.mockResolvedValue( [ passRecord ] )
      mockStorageService.createSilverSignal.mockResolvedValue( mockSilverSignal )
      mockAnthropicClient.messages.create.mockResolvedValue( mockPainSignalAnthropicResponse )

      const result = await service.distill( 'run-uuid-1', OutputMode.WITH_REASONING, PreFilterMode.LENIENT )

      // 1. Fetches PASS bronze records for the run
      expect( mockStorageService.getBronzeRecords ).toHaveBeenCalledWith(
        'run-uuid-1',
        PreFilterStatus.PASS,
      )

      // 2. Calls Anthropic for each record
      expect( mockAnthropicClient.messages.create ).toHaveBeenCalledTimes( 1 )
      expect( mockAnthropicClient.messages.create ).toHaveBeenCalledWith(
        expect.objectContaining( { model: 'claude-sonnet-4-20250514' } ),
      )

      // 3. Persists a SilverSignal for the record (painScore 8 >= threshold 6)
      expect( mockStorageService.createSilverSignal ).toHaveBeenCalledTimes( 1 )
      expect( mockStorageService.createSilverSignal ).toHaveBeenCalledWith(
        expect.objectContaining( {
          bronzeRecordId:     passRecord.id,
          painScore:          8,
          promotionThreshold: 6,
          preFilterMode:      PreFilterMode.LENIENT,
        } ),
      )

      // 4. Returns DistillResult with correct stats
      expect( result ).toEqual( {
        runId: 'run-uuid-1',
        stats: expect.objectContaining( {
          total:       1,
          promoted:    1,
          rejected:    0,
          failed:      0,
          haltedEarly: false,
        } ),
      } )
    } )

    it( 'rejects records below the pain score threshold without creating a SilverSignal', async () => {
      const passRecord = { ...mockBronzeRecord, preFilterStatus: PreFilterStatus.PASS }
      mockStorageService.getBronzeRecords.mockResolvedValue( [ passRecord ] )
      mockAnthropicClient.messages.create.mockResolvedValue( mockLowScorePainSignalAnthropicResponse )

      const result = await service.distill( 'run-uuid-1' )

      expect( mockStorageService.createSilverSignal ).not.toHaveBeenCalled()
      expect( result.stats ).toEqual(
        expect.objectContaining( { promoted: 0, rejected: 1 } ),
      )
    } )
  } )

  describe( 'getSilverSignal', () => {
    it( 'delegates to StorageService.getSilverSignals with correct params and returns the paginated response', async () => {
      const paginatedResponse = {
        data:       [ mockSilverSignal ],
        total:      1,
        page:       1,
        limit:      20,
        totalPages: 1,
      }
      mockStorageService.getSilverSignals.mockResolvedValue( paginatedResponse )

      const request = { minPainScore: 7, page: 1, limit: 20 }
      const result = await service.getSilverSignal( request )

      expect( mockStorageService.getSilverSignals ).toHaveBeenCalledWith( request )
      expect( result ).toEqual( paginatedResponse )
    } )
  } )
} )
