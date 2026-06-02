// Nest
import { Body, Controller, Get, Post, Query } from '@nestjs/common'
// Prisma
import { PreFilterMode } from '@prisma/client'
// Services
import { DistillService } from './distill.service'
// Types
import { OutputMode } from '@app-types/Silver'

interface DistillRequest {
  runId: string
  outputMode?: OutputMode
  preFilterMode?: PreFilterMode
}

@Controller( 'distill' )
export class DistillController {
  constructor( private readonly distillService: DistillService ) {}

  @Get()
  async getSilverSignals( @Query( 'provider' ) provider: string, @Query( 'minPainScore' ) minPainScore: string ) {
    return this.distillService.getSilverSignal( { provider, minPainScore: Number( minPainScore ) } )
  }

  @Post()
  async distill( @Body() { runId, outputMode, preFilterMode }: DistillRequest ) {
    return this.distillService.distill( runId, outputMode, preFilterMode )
  }
}
