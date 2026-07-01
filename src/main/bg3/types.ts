export class PakError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PakError'
  }
}

export type PakHeader = {
  fileListOffset: bigint
  fileListSize: number
  flags: number
  priority: number
  md5: string
  numberOfParts: number
}

export type PakBasicInfo = {
  pakPath: string
  pakFileName: string
  pakVersion: number
  header: PakHeader
}

export type PakEntriesInfo = PakBasicInfo & {
  numberOfFiles: number
  entries: PakEntry[]
}

export type PakEntry = {
  name: string
  archivePart: number
  compressionMethod: number
  compressionLevel: number
  offset: bigint
  sizeOnDisk: number
  uncompressedSize: number
  crc?: number
}

export type ModDependency = {
  name: string | null
  folder: string | null
  uuid: string | null
  version64: string | null
  version: string | null
  rawInfo: Record<string, string>
}

export type ModInfo = {
  name: string | null
  folder: string | null
  uuid: string | null
  author: string | null
  description: string | null
  type: string | null
  version64: string | null
  version: string | null
  rawModuleInfo: Record<string, string>
  dependencies: ModDependency[]
}

export type PakModInfo = {
  pakPath: string
  pakFileName: string
  pakVersion: number
  metaPath: string
  lastModifiedMs: number
  mod: ModInfo
}