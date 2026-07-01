export type PakHeaderDto = {
  fileListOffset: string
  fileListSize: number
  flags: number
  priority: number
  md5: string
  numberOfParts: number
}

export type PakBasicInfoDto = {
  pakPath: string
  pakFileName: string
  pakVersion: number
  header: PakHeaderDto
}

export type PakEntryDto = {
  name: string
  archivePart: number
  compressionMethod: number
  compressionLevel: number
  offset: string
  sizeOnDisk: number
  uncompressedSize: number
  crc?: number
}

export type PakEntriesInfoDto = PakBasicInfoDto & {
  numberOfFiles: number
  entries: PakEntryDto[]
}

export type ModDependencyDto = {
  name: string | null
  folder: string | null
  uuid: string | null
  version64: string | null
  version: string | null
  rawInfo: Record<string, string>
}

export type ModInfoDto = {
  name: string | null
  folder: string | null
  uuid: string | null
  author: string | null
  description: string | null
  type: string | null
  version64: string | null
  version: string | null
  rawModuleInfo: Record<string, string>
  dependencies: ModDependencyDto[]
}

export type PakModInfoDto = {
  pakPath: string
  pakFileName: string
  pakVersion: number
  metaPath: string
  lastModifiedMs: number
  mod: ModInfoDto
}

export type PakScanErrorDto = {
  pakPath: string
  pakFileName: string
  error: string
}

export type ModsFolderScanResultDto = {
  folderPath: string
  mods: PakModInfoDto[]
  errors: PakScanErrorDto[]
}