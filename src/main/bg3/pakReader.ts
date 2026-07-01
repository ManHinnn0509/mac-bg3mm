import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { PakError, type PakBasicInfo, type PakHeader, type PakModInfo } from './types'

class BufferReader {
  private offset = 0

  constructor(private readonly buffer: Buffer) {}

  readBytes(size: number): Buffer {
    if (this.offset + size > this.buffer.length) {
      throw new PakError(`Unexpected EOF while reading ${size} bytes`)
    }

    const result = this.buffer.subarray(this.offset, this.offset + size)
    this.offset += size
    return result
  }

  readUInt8(): number {
    const value = this.buffer.readUInt8(this.offset)
    this.offset += 1
    return value
  }

  readUInt16LE(): number {
    const value = this.buffer.readUInt16LE(this.offset)
    this.offset += 2
    return value
  }

  readUInt32LE(): number {
    const value = this.buffer.readUInt32LE(this.offset)
    this.offset += 4
    return value
  }

  readBigUInt64LE(): bigint {
    const value = this.buffer.readBigUInt64LE(this.offset)
    this.offset += 8
    return value
  }
}

function readHeader(reader: BufferReader, version: number): PakHeader {
  if (version === 15) {
    const fileListOffset = reader.readBigUInt64LE()
    const fileListSize = reader.readUInt32LE()
    const flags = reader.readUInt8()
    const priority = reader.readUInt8()
    const md5 = reader.readBytes(16).toString('hex')

    return {
      fileListOffset,
      fileListSize,
      flags,
      priority,
      md5,
      numberOfParts: 1
    }
  }

  if (version === 16 || version === 18) {
    const fileListOffset = reader.readBigUInt64LE()
    const fileListSize = reader.readUInt32LE()
    const flags = reader.readUInt8()
    const priority = reader.readUInt8()
    const md5 = reader.readBytes(16).toString('hex')
    const numberOfParts = reader.readUInt16LE()

    return {
      fileListOffset,
      fileListSize,
      flags,
      priority,
      md5,
      numberOfParts
    }
  }

  throw new PakError(`Unsupported LSPK version for this prototype: ${version}`)
}

export async function readPakBasicInfo(pakPath: string): Promise<PakBasicInfo> {
  const buffer = await readFile(pakPath)
  const reader = new BufferReader(buffer)

  const signature = reader.readBytes(4).toString('utf8')

  if (signature !== 'LSPK') {
    throw new PakError(`Not an LSPK pak file: signature=${JSON.stringify(signature)}`)
  }

  const pakVersion = reader.readUInt32LE()
  const header = readHeader(reader, pakVersion)

  return {
    pakPath,
    pakFileName: basename(pakPath),
    pakVersion,
    header
  }
}

export async function readPakModInfo(pakPath: string): Promise<PakModInfo> {
  throw new Error(`readPakModInfo is not implemented yet: ${pakPath}`)
}