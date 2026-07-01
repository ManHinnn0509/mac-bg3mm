import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import type {
  ModsFolderScanResultDto,
  PakBasicInfoDto,
  PakEntriesInfoDto,
  PakModInfoDto
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

  selectModsFolderAndScan: (): Promise<ModsFolderScanResultDto | null> => {
    return ipcRenderer.invoke('bg3:selectModsFolderAndScan')
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