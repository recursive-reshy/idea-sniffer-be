// Nest
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// Prisma
import { PrismaPg  } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger( PrismaService.name )

  constructor( private readonly configService: ConfigService ) {
    const  connectionString = configService.get< string >( 'DATABASE_URL' )!
    super( {
      adapter: new PrismaPg ( { connectionString } ),
      log: [
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' }
      ]
    } )
  }

  // TODO: Add a health check logic
  
  async onModuleInit() {
    // TODO: Need to add retry mechanism
    try {
      this.logger.log( 'Connecting to database...' )
      await this.$connect()
      this.logger.log( 'Connected to database' ) 
    } catch ( error ) {
      this.logger.error( 'Error connecting to database', error )
      throw error
    }
  }

  async onModuleDestroy() {
    this.logger.log( 'Disconnecting from database...' )
    await this.$disconnect()
    this.logger.log( 'Disconnected from database' )
  }
}