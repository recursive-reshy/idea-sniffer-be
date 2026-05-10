import { Signal } from "./Signals"

export interface Provider {
  name: string
  fetch(): Promise< Signal[] >
}