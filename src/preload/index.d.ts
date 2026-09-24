import type { ZnerolApi } from './index'

declare global {
  interface Window {
    znerol: ZnerolApi
  }
}
