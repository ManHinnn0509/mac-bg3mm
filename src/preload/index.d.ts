import { ElectronAPI } from '@electron-toolkit/preload'

import type {
  ModsFolderScanResultDto,
  PakBasicInfoDto,
  PakEntriesInfoDto,
  PakModInfoDto,
  ProfilesStateDto
} from '../shared/bg3Types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectPakAndReadBasicInfo: () => Promise<PakBasicInfoDto | null>
      selectPakAndReadEntriesInfo: () => Promise<PakEntriesInfoDto | null>
      selectPakAndReadModInfo: () => Promise<PakModInfoDto | null>
      scanDefaultModsFolder: () => Promise<ModsFolderScanResultDto>
      loadProfiles: () => Promise<ProfilesStateDto>
      saveProfiles: (state: ProfilesStateDto) => Promise<ProfilesStateDto>
    }
  }
}