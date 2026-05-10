// Nest
import { Module } from '@nestjs/common'
// Axios
import { HttpModule } from '@nestjs/axios'
// Services
import { HttpService } from './http.service'

@Module( {
  imports: [
    // TODO: Consider making these options configurable via environment variables or a config service
    HttpModule.register( {
      timeout: 5 * 1000, // 5 seconds timeout for all HTTP requests
      maxRedirects: 5, // Follow up to 5 redirects
    } )
  ],
  providers: [ HttpService ],
  exports: [ HttpService ]
} )
export class CommonHttpModule {}