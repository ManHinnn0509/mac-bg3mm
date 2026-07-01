import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { readPakModInfo } from './pakReader'
import type { PakModInfo } from './types'

export type PakScanError = {
  pakPath: string
  pakFileName: string
  error: string
}

export type ModsFolderScanResult = {
  folderPath: string
  mods: PakModInfo[]
  errors: PakScanError[]
}

async function collectPakPaths(folderPath: string): Promise<string[]> {
  const result: string[] = []
  const entries = await readdir(folderPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(folderPath, entry.name)

    if (entry.isDirectory()) {
      const childPakPaths = await collectPakPaths(fullPath)
      result.push(...childPakPaths)
      continue
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.pak')) {
      result.push(fullPath)
    }
  }

  return result
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function scanModsFolder(folderPath: string): Promise<ModsFolderScanResult> {
  const pakPaths = await collectPakPaths(folderPath)

  const mods: PakModInfo[] = []
  const errors: PakScanError[] = []

  for (const pakPath of pakPaths) {
    try {
      const modInfo = await readPakModInfo(pakPath)
      mods.push(modInfo)
    } catch (error) {
      errors.push({
        pakPath,
        pakFileName: basename(pakPath),
        error: getErrorMessage(error)
      })
    }
  }

  mods.sort((a, b) => {
    const aName = a.mod.name ?? a.pakFileName
    const bName = b.mod.name ?? b.pakFileName

    return aName.localeCompare(bName)
  })

  return {
    folderPath,
    mods,
    errors
  }
}