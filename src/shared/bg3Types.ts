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