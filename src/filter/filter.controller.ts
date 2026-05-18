// Nest
import { Body, Controller, Post } from '@nestjs/common'
// Services
import { FilterService } from './filter.service'
// Types
import { FilterMode, FilterResult } from '@app-types/Filter'

interface FilterRequest {
  bronzeFile: string
  filtermode?: FilterMode
}

@Controller( 'filter' )
export class FilterController {
  constructor( private readonly filterService: FilterService ) {}

  @Post()
  async filter( @Body() { bronzeFile, filtermode }: FilterRequest ): Promise< FilterResult > {
    return this.filterService.filter( bronzeFile, filtermode )
  }
}