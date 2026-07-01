// src/preload/index.d.ts

import { ElectronAPI } from '@electron-toolkit/preload'
import type { PakBasicInfoDto, PakEntriesInfoDto } from '../shared/bg3Types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectPakAndReadBasicInfo: () => Promise<PakBasicInfoDto | null>
      selectPakAndReadEntriesInfo: () => Promise<PakEntriesInfoDto | null>
    }
  }
}