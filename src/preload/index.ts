import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import type {
  ModsFolderScanResultDto,
  PakBasicInfoDto,
  PakEntriesInfoDto,
  PakModInfoDto,
  ProfilesStateDto,
  ModuleShortDescInputDto,
  ModSettingsExportResultDto
} from '../shared/bg3Types'

const api = {
  selectPakAndReadBasicInfo: (): Promise<PakBasicInfoDto | null> => {
    return ipcRenderer.invoke('bg3:selectPakAndReadBasicInfo')
  },

  selectPakAndReadEntriesInfo: (): Promise<PakEntriesInfoDto | null> => {
    return ipcRenderer.invoke('bg3:selectPakAndReadEntriesInfo')
  },

  selectPakAndReadModInfo: (): Promise<PakModInfoDto | null> => {
    return ipcRenderer.invoke('bg3:selectPakAndReadModInfo')
  },

  scanDefaultModsFolder: (): Promise<ModsFolderScanResultDto> => {
    return ipcRenderer.invoke('bg3:scanDefaultModsFolder')
  },

  loadProfiles: (): Promise<ProfilesStateDto> => {
    return ipcRenderer.invoke('profiles:load')
  },

  saveProfiles: (state: ProfilesStateDto): Promise<ProfilesStateDto> => {
    return ipcRenderer.invoke('profiles:save', state)
  },

  exportModSettings: (
    enabledMods: ModuleShortDescInputDto[]
  ): Promise<ModSettingsExportResultDto> => {
    return ipcRenderer.invoke('bg3:exportModSettings', enabledMods)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}