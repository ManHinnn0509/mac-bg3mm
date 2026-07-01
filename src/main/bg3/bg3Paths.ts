import { app } from 'electron'
import { join } from 'node:path'
import { PakError } from './types'

export function getDefaultBg3ModsFolderPath(): string {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA

    if (!localAppData) {
      throw new PakError('Cannot resolve BG3 Mods folder: LOCALAPPDATA is not set')
    }

    return join(localAppData, 'Larian Studios', "Baldur's Gate 3", 'Mods')
  }

  if (process.platform === 'darwin') {
    return join(app.getPath('documents'), 'Larian Studios', "Baldur's Gate 3", 'Mods')
  }

  throw new PakError(`Unsupported platform for BG3 Mods folder auto-detection: ${process.platform}`)
}