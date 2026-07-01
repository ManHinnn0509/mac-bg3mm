import { ElectronAPI } from '@electron-toolkit/preload'

import type {
  ModsFolderScanResultDto,
  PakBasicInfoDto,
  PakEntriesInfoDto,
  PakModInfoDto
} from '../shared/bg3Types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectPakAndReadBasicInfo: () => Promise<PakBasicInfoDto | null>
      selectPakAndReadEntriesInfo: () => Promise<PakEntriesInfoDto | null>
      selectPakAndReadModInfo: () => Promise<PakModInfoDto | null>
      selectModsFolderAndScan: () => Promise<ModsFolderScanResultDto | null>
    }
  }
}