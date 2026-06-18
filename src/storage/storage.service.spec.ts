import { Test, TestingModule } from '@nestjs/testing'
import { PreFilterMode, PreFilterStatus, RunStatus } from '@prisma/client'

import { StorageService } from './storage.service'
import { PrismaService } from '../prisma/prisma.service'
import { mockPrismaService } from '../test/mocks/prisma.mock'
import {
  mockBronzeRecord,
  mockFilterRun,
  mockPaginatedResponse,
  mockRedditRecord,
  mockRun,
  mockSilverSignal,
} from '../test/fixtures'

describe( 'StorageService', () => {
  let service: StorageService

  beforeEach( async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule( {
      providers: [
        StorageService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    } ).compile()

    service = module.get< StorageService >( StorageService )
  } )

  // ──────────────────────────────────────────
  // Run
  // ──────────────────────────────────────────

  describe( 'createRun', () => {
    it( 'calls prisma.run.create with status PENDING and returns the run', async () => {
      mockPrismaService.run.create.mockResolvedValue( mockRun )

      const result = await service.createRun( {
        provider:   'reddit',
        snapshotId: 'snap-uuid-1',
        subreddit:  'SaaS',
        sortBy:     'hot',
      } )

      expect( mockPrismaService.run.create ).toHaveBeenCalledWith( {
        data: {
          provider:   'reddit',
          snapshotId: 'snap-uuid-1',
          subreddit:  'SaaS',
          sortBy:     'hot',
          status:     RunStatus.PENDING,
        },
      } )
      expect( result ).toEqual( mockRun )
    } )
  } )

  describe( 'updateRun', () => {
    it( 'calls prisma.run.update with correct where and data and returns the run', async () => {
      const updated = { ...mockRun, status: RunStatus.COMPLETE }
      mockPrismaService.run.update.mockResolvedValue( updated )

      const result = await service.updateRun( 'run-uuid-1', { status: RunStatus.COMPLETE } )

      expect( mockPrismaService.run.update ).toHaveBeenCalledWith( {
        where: { id: 'run-uuid-1' },
        data:  { status: RunStatus.COMPLETE },
      } )
      expect( result ).toEqual( updated )
    } )
  } )

  describe( 'getRuns', () => {
    it( 'returns a correctly shaped PaginatedResponse with correct pagination', async () => {
      mockPrismaService.run.count.mockResolvedValue( 1 )
      mockPrismaService.run.findMany.mockResolvedValue( [ mockRun ] )

      const result = await service.getRuns( { provider: 'reddit', page: 1, limit: 20 } )

      expect( mockPrismaService.run.count ).toHaveBeenCalledWith( { where: { provider: 'reddit' } } )
      expect( mockPrismaService.run.findMany ).toHaveBeenCalledWith( {
        where:   { provider: 'reddit' },
        orderBy: { createdAt: 'desc' },
        skip:    0,
        take:    20,
      } )
      expect( result ).toEqual( { data: [ mockRun ], total: 1, page: 1, limit: 20, totalPages: 1 } )
    } )
  } )

  // ──────────────────────────────────────────
  // BronzeRecord
  // ──────────────────────────────────────────

  describe( 'createBronzeRecords', () => {
    it( 'calls prisma.bronzeRecord.createMany with skipDuplicates and returns stored/skipped counts', async () => {
      mockPrismaService.bronzeRecord.createMany.mockResolvedValue( { count: 1 } )

      const result = await service.createBronzeRecords( 'run-uuid-1', 'reddit', [ mockRedditRecord ] )

      expect( mockPrismaService.bronzeRecord.createMany ).toHaveBeenCalledWith( {
        data: [
          {
            runId:           'run-uuid-1',
            provider:        'reddit',
            externalId:      mockRedditRecord.post_id,
            rawPayload:      mockRedditRecord,
            preFilterStatus: PreFilterStatus.PENDING,
          },
        ],
        skipDuplicates: true,
      } )
      expect( result ).toEqual( { stored: 1, skipped: 0 } )
    } )

    it( 'counts skipped records as total minus stored', async () => {
      // Two records submitted but only one stored (the other is a duplicate)
      mockPrismaService.bronzeRecord.createMany.mockResolvedValue( { count: 1 } )

      const result = await service.createBronzeRecords( 'run-uuid-1', 'reddit', [
        mockRedditRecord,
        { ...mockRedditRecord, post_id: 't3_dup' },
      ] )

      expect( result ).toEqual( { stored: 1, skipped: 1 } )
    } )
  } )

  describe( 'getBronzeRecords', () => {
    it( 'filters by preFilterStatus when provided', async () => {
      mockPrismaService.bronzeRecord.findMany.mockResolvedValue( [ mockBronzeRecord ] )

      const result = await service.getBronzeRecords( 'run-uuid-1', PreFilterStatus.PENDING )

      expect( mockPrismaService.bronzeRecord.findMany ).toHaveBeenCalledWith( {
        where: { runId: 'run-uuid-1', preFilterStatus: PreFilterStatus.PENDING },
      } )
      expect( result ).toEqual( [ mockBronzeRecord ] )
    } )

    it( 'omits preFilterStatus from where clause when not provided', async () => {
      mockPrismaService.bronzeRecord.findMany.mockResolvedValue( [ mockBronzeRecord ] )

      await service.getBronzeRecords( 'run-uuid-1' )

      expect( mockPrismaService.bronzeRecord.findMany ).toHaveBeenCalledWith( {
        where: { runId: 'run-uuid-1' },
      } )
    } )
  } )

  describe( 'updateBronzeRecord', () => {
    it( 'calls prisma.bronzeRecord.update with correct id and data and returns the record', async () => {
      const updated = { ...mockBronzeRecord, preFilterStatus: PreFilterStatus.PASS }
      mockPrismaService.bronzeRecord.update.mockResolvedValue( updated )

      const result = await service.updateBronzeRecord( 'bronze-uuid-1', {
        preFilterStatus: PreFilterStatus.PASS,
        preFilterMode:   PreFilterMode.LENIENT,
        haikuCostUsd:    0.00012,
      } )

      expect( mockPrismaService.bronzeRecord.update ).toHaveBeenCalledWith( {
        where: { id: 'bronze-uuid-1' },
        data:  {
          preFilterStatus: PreFilterStatus.PASS,
          preFilterMode:   PreFilterMode.LENIENT,
          haikuCostUsd:    0.00012,
        },
      } )
      expect( result ).toEqual( updated )
    } )
  } )

  // ──────────────────────────────────────────
  // FilterRun
  // ──────────────────────────────────────────

  describe( 'createFilterRun', () => {
    it( 'calls prisma.filterRun.create with status PENDING and returns the filter run', async () => {
      mockPrismaService.filterRun.create.mockResolvedValue( mockFilterRun )

      const result = await service.createFilterRun( {
        runId:         'run-uuid-1',
        preFilterMode: PreFilterMode.LENIENT,
      } )

      expect( mockPrismaService.filterRun.create ).toHaveBeenCalledWith( {
        data: {
          runId:         'run-uuid-1',
          preFilterMode: PreFilterMode.LENIENT,
          status:        'PENDING',
        },
      } )
      expect( result ).toEqual( mockFilterRun )
    } )
  } )

  describe( 'updateFilterRun', () => {
    it( 'calls prisma.filterRun.update with correct id and data and returns the filter run', async () => {
      mockPrismaService.filterRun.update.mockResolvedValue( mockFilterRun )

      const result = await service.updateFilterRun( 'filter-run-uuid-1', {
        totalProcessed: 5,
        totalPassed:    3,
      } )

      expect( mockPrismaService.filterRun.update ).toHaveBeenCalledWith( {
        where: { id: 'filter-run-uuid-1' },
        data:  { totalProcessed: 5, totalPassed: 3 },
      } )
      expect( result ).toEqual( mockFilterRun )
    } )
  } )

  describe( 'getFilterRuns', () => {
    it( 'returns a correctly shaped PaginatedResponse', async () => {
      mockPrismaService.filterRun.count.mockResolvedValue( 1 )
      mockPrismaService.filterRun.findMany.mockResolvedValue( [ mockFilterRun ] )

      const result = await service.getFilterRuns( { runId: 'run-uuid-1', page: 1, limit: 20 } )

      expect( mockPrismaService.filterRun.count ).toHaveBeenCalledWith( { where: { runId: 'run-uuid-1' } } )
      expect( mockPrismaService.filterRun.findMany ).toHaveBeenCalledWith( {
        where:   { runId: 'run-uuid-1' },
        orderBy: { createdAt: 'desc' },
        skip:    0,
        take:    20,
      } )
      expect( result ).toEqual( {
        data:       [ mockFilterRun ],
        total:      1,
        page:       1,
        limit:      20,
        totalPages: 1,
      } )
    } )
  } )

  // ──────────────────────────────────────────
  // SilverSignal
  // ──────────────────────────────────────────

  describe( 'createSilverSignal', () => {
    it( 'calls prisma.silverSignal.create with the full data shape and returns the signal', async () => {
      mockPrismaService.silverSignal.create.mockResolvedValue( mockSilverSignal )

      const input = {
        bronzeRecordId:     'bronze-uuid-1',
        painScore:          8,
        painSummary:        'Founders spending hours manually copying data between CRM and billing tools',
        category:           mockSilverSignal.category,
        evidenceQuotes:     mockSilverSignal.evidenceQuotes,
        marketSize:         mockSilverSignal.marketSize,
        sourceMeta:         mockSilverSignal.sourceMeta,
        preFilterMode:      PreFilterMode.LENIENT,
        promotionThreshold: 6,
        sonnetCostUsd:      0.00045,
        processedAt:        mockSilverSignal.processedAt,
      }

      const result = await service.createSilverSignal( input )

      expect( mockPrismaService.silverSignal.create ).toHaveBeenCalledWith( { data: input } )
      expect( result ).toEqual( mockSilverSignal )
    } )
  } )

  describe( 'getSilverSignals', () => {
    it( 'applies minPainScore as gte filter and returns a correctly shaped PaginatedResponse', async () => {
      mockPrismaService.silverSignal.count.mockResolvedValue( 1 )
      mockPrismaService.silverSignal.findMany.mockResolvedValue( [ mockSilverSignal ] )

      const result = await service.getSilverSignals( { minPainScore: 7, page: 1, limit: 20 } )

      expect( mockPrismaService.silverSignal.count ).toHaveBeenCalledWith( {
        where: { painScore: { gte: 7 } },
      } )
      expect( mockPrismaService.silverSignal.findMany ).toHaveBeenCalledWith( {
        where:   { painScore: { gte: 7 } },
        orderBy: { painScore: 'desc' },
        skip:    0,
        take:    20,
      } )
      expect( result ).toEqual( {
        data:       [ mockSilverSignal ],
        total:      1,
        page:       1,
        limit:      20,
        totalPages: 1,
      } )
    } )
  } )
} )
