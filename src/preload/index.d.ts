import { ElectronAPI } from '@electron-toolkit/preload'
import type { PakBasicInfoDto } from '../shared/bg3Types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectPakAndReadBasicInfo: () => Promise<PakBasicInfoDto | null>
    }
  }
}