// Nest
import { Body, Controller, Post } from '@nestjs/common'
// Prisma
import { PreFilterMode } from '@prisma/client'
// Services
import { FilterService } from './filter.service'
// Types
import { FilterResult } from '@app-types/Filter'

interface FilterRequest {
  runId: string
  filterMode?: PreFilterMode
}

@Controller( 'filter' )
export class FilterController {
  constructor( private readonly filterService: FilterService ) {}

  @Post()
  async filter( @Body() { runId, filterMode }: FilterRequest ): Promise< FilterResult > {
    return await this.filterService.filter( runId, filterMode )
  }
}
