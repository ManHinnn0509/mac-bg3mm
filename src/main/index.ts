import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { readPakBasicInfo, readPakEntriesInfo } from './bg3/pakReader'
import type { PakBasicInfoDto, PakEntriesInfoDto } from '../shared/bg3Types'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  function toPakBasicInfoDto(info: Awaited<ReturnType<typeof readPakBasicInfo>>): PakBasicInfoDto {
    return {
      pakPath: info.pakPath,
      pakFileName: info.pakFileName,
      pakVersion: info.pakVersion,
      header: {
        fileListOffset: info.header.fileListOffset.toString(),
        fileListSize: info.header.fileListSize,
        flags: info.header.flags,
        priority: info.header.priority,
        md5: info.header.md5,
        numberOfParts: info.header.numberOfParts
      }
    }
  }

  function toPakEntriesInfoDto(
    info: Awaited<ReturnType<typeof readPakEntriesInfo>>
  ): PakEntriesInfoDto {
    return {
      ...toPakBasicInfoDto(info),
      numberOfFiles: info.numberOfFiles,
      entries: info.entries.map((entry) => ({
        name: entry.name,
        archivePart: entry.archivePart,
        compressionMethod: entry.compressionMethod,
        compressionLevel: entry.compressionLevel,
        offset: entry.offset.toString(),
        sizeOnDisk: entry.sizeOnDisk,
        uncompressedSize: entry.uncompressedSize,
        crc: entry.crc
      }))
    }
  }

  function registerBg3Ipc(): void {
    ipcMain.handle('bg3:selectPakAndReadBasicInfo', async () => {
      const result = await dialog.showOpenDialog({
        title: 'Select BG3 .pak file',
        properties: ['openFile'],
        filters: [
          {
            name: 'BG3 Pak Files',
            extensions: ['pak']
          }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      const pakPath = result.filePaths[0]
      const info = await readPakBasicInfo(pakPath)

      return toPakBasicInfoDto(info)
    })

    ipcMain.handle('bg3:selectPakAndReadEntriesInfo', async () => {
      const result = await dialog.showOpenDialog({
        title: 'Select BG3 .pak file',
        properties: ['openFile'],
        filters: [
          {
            name: 'BG3 Pak Files',
            extensions: ['pak']
          }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      const pakPath = result.filePaths[0]
      const info = await readPakEntriesInfo(pakPath)

      return toPakEntriesInfoDto(info)
    })
  }

  registerBg3Ipc()
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
