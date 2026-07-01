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