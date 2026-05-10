import { Controller, Get } from '@nestjs/common'

interface HealthStatus {
  status: string
  timestamp: string
}

@Controller('health')
export class HealthController {
  @Get()
  checkHealth(): HealthStatus {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  }
}