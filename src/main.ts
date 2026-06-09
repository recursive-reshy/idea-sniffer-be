import { NestFactory } from '@nestjs/core'
// Http Addpater'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
// App
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create< NestFastifyApplication >( 
    AppModule, 
    new FastifyAdapter() 
  )

  // Without enableShutdownHooks, onModuleDestroy will not be called when the app is shutting down
  app.enableShutdownHooks()
  app.setGlobalPrefix( 'api/v1' )

  app.enableCors( {
    origin: 'http://localhost:5173', // TODO: Should come from env
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  } )

  await app.listen( process.env.PORT ?? 3000 )
}

bootstrap()
