// Nest
import { Injectable } from '@nestjs/common'
// Axios
import { AxiosRequestConfig } from 'axios'
import { HttpService as NestHttpService } from '@nestjs/axios'
// Convert Observable to Promise
import { firstValueFrom } from 'rxjs'

@Injectable()
export class HttpService {
  constructor( private readonly httpService: NestHttpService ) {}

  // firstValueFrom — @nestjs/axios returns RxJS Observables, not Promises. 
  // firstValueFrom converts them to Promises so you can use async/await cleanly throughout your codebase.
  async get< T >( url: string, config?: AxiosRequestConfig ): Promise< T > {
    const response = await firstValueFrom( this.httpService.get< T >( url, config ) )
    return response.data
  }

  async post< T >( url: string, body: unknown, config?: AxiosRequestConfig ): Promise< T > {
    const response = await firstValueFrom( this.httpService.post< T >( url, body, config ) )
    return response.data
  }
}