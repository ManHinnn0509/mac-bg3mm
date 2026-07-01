import { app } from 'electron'
import { join } from 'node:path'
import { PakError } from './types'

function getDefaultBg3DataFolderPath(): string {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA

    if (!localAppData) {
      throw new PakError('Cannot resolve BG3 data folder: LOCALAPPDATA is not set')
    }

    return join(localAppData, 'Larian Studios', "Baldur's Gate 3")
  }

  if (process.platform === 'darwin') {
    return join(app.getPath('documents'), 'Larian Studios', "Baldur's Gate 3")
  }

  throw new PakError(`Unsupported platform for BG3 path auto-detection: ${process.platform}`)
}

export function getDefaultBg3ModsFolderPath(): string {
  return join(getDefaultBg3DataFolderPath(), 'Mods')
}

export function getDefaultBg3PlayerProfilesPublicFolderPath(): string {
  return join(getDefaultBg3DataFolderPath(), 'PlayerProfiles', 'Public')
}

export function getDefaultBg3ModSettingsPath(): string {
  return join(getDefaultBg3PlayerProfilesPublicFolderPath(), 'modsettings.lsx')
}