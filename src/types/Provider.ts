import { Signal } from "./Signals"

export interface Provider< T = void > {
  name: string
  fetch( input: T ): Promise< Signal[] >
}