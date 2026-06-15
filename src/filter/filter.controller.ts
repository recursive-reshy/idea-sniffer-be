// Nest
import { Body, Controller, Get, Post, Query } from '@nestjs/common'
// Prisma
import { FilterRun, PreFilterMode } from '@prisma/client'
// Services
import { FilterService } from './filter.service'
// Types
import { FilterResult } from '@app-types/Filter'
import { PaginatedResponse } from '@app-types/Common'

interface FilterRequest {
  runId: string
  filterMode?: PreFilterMode
}

@Controller( 'filter' )
export class FilterController {
  constructor( private readonly filterService: FilterService ) {}

  @Get()
  async getFilterRuns(
    @Query( 'runId' ) runId?: string,
    @Query( 'page' ) page?: string,
    @Query( 'limit' ) limit?: string,
  ): Promise< PaginatedResponse< FilterRun > > {
    return this.filterService.getFilterRuns(
      runId,
      page ? Number( page ) : undefined,
      limit ? Number( limit ) : undefined,
    )
  }

  @Post()
  async filter( @Body() { runId, filterMode }: FilterRequest ): Promise< FilterResult > {
    return await this.filterService.filter( runId, filterMode )
  }
}
