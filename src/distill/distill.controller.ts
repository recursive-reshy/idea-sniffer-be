// Nest
import { Body, Controller, Post } from '@nestjs/common'
// Services
import { DistillService } from './distill.service'
// Types
import { FilterMode } from '@app-types/Filter'
import { OutputMode } from '@app-types/Silver'

interface DistillRequest {
  filteredFile: string
  outputMode?: OutputMode
  filterMode?: FilterMode
}

@Controller( 'distill' )
export class DistillController {
  constructor( private readonly distillService: DistillService ) {}

  @Post()
  async distill( @Body() { filteredFile, outputMode, filterMode }: DistillRequest ) {
    return this.distillService.distill( filteredFile, outputMode, filterMode )
  }
}