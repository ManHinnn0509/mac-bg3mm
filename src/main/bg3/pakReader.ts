import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { inflateSync } from 'node:zlib'
import { decompressLz4Block } from './lz4Block'
import { parseMetaLsx } from './metaParser'
import {
  PakError,
  type PakBasicInfo,
  type PakEntriesInfo,
  type PakEntry,
  type PakHeader,
  type PakModInfo
} from './types'

class BufferReader {
  private offset = 0

  constructor(private readonly buffer: Buffer) {}

  seek(position: number | bigint): void {
    const target = typeof position === 'bigint' ? position : BigInt(position)

    if (target < 0n || target > BigInt(this.buffer.length)) {
      throw new PakError(`Invalid seek position: ${target.toString()}`)
    }

    this.offset = Number(target)
  }

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

function bigintToSafeNumber(value: bigint, fieldName: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new PakError(`${fieldName} is too large to safely represent as a number: ${value}`)
  }

  return Number(value)
}

function fixedString(raw: Buffer): string {
  const nullIndex = raw.indexOf(0)
  const end = nullIndex === -1 ? raw.length : nullIndex

  return raw.toString('utf8', 0, end)
}

function normalizePakEntryName(name: string): string {
  return name.replaceAll('\\', '/').toLowerCase()
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

function readPakBasicInfoFromReader(reader: BufferReader, pakPath: string): PakBasicInfo {
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

function readEntriesV15(data: Buffer, count: number): PakEntry[] {
  const entries: PakEntry[] = []
  const entrySize = 296

  for (let i = 0; i < count; i += 1) {
    const chunk = data.subarray(i * entrySize, (i + 1) * entrySize)

    const name = fixedString(chunk.subarray(0, 256))
    const offset = chunk.readBigUInt64LE(256)
    const sizeOnDisk = bigintToSafeNumber(chunk.readBigUInt64LE(264), `${name}.sizeOnDisk`)
    const uncompressedSize = bigintToSafeNumber(
      chunk.readBigUInt64LE(272),
      `${name}.uncompressedSize`
    )
    const archivePart = chunk.readUInt32LE(280)
    const flags = chunk.readUInt32LE(284)
    const crc = chunk.readUInt32LE(288)

    entries.push({
      name,
      archivePart,
      compressionMethod: flags & 0x0f,
      compressionLevel: flags & 0xf0,
      offset,
      sizeOnDisk,
      uncompressedSize,
      crc
    })
  }

  return entries
}

function readEntriesV18(data: Buffer, count: number): PakEntry[] {
  const entries: PakEntry[] = []
  const entrySize = 272

  for (let i = 0; i < count; i += 1) {
    const chunk = data.subarray(i * entrySize, (i + 1) * entrySize)

    const name = fixedString(chunk.subarray(0, 256))
    const offsetLow = chunk.readUInt32LE(256)
    const offsetHigh = chunk.readUInt16LE(260)
    const archivePart = chunk.readUInt8(262)
    const flags = chunk.readUInt8(263)
    const sizeOnDisk = chunk.readUInt32LE(264)
    const uncompressedSize = chunk.readUInt32LE(268)

    const offset = BigInt(offsetLow) | (BigInt(offsetHigh) << 32n)

    entries.push({
      name,
      archivePart,
      compressionMethod: flags & 0x0f,
      compressionLevel: flags & 0xf0,
      offset,
      sizeOnDisk,
      uncompressedSize
    })
  }

  return entries
}

function readPakEntriesInfoFromReader(reader: BufferReader, pakPath: string): PakEntriesInfo {
  const basicInfo = readPakBasicInfoFromReader(reader, pakPath)

  if (![15, 16, 18].includes(basicInfo.pakVersion)) {
    throw new PakError(`Unsupported LSPK version: ${basicInfo.pakVersion}`)
  }

  reader.seek(basicInfo.header.fileListOffset)

  const numberOfFiles = reader.readUInt32LE()
  const compressedSize = reader.readUInt32LE()
  const compressed = reader.readBytes(compressedSize)

  const entrySize = basicInfo.pakVersion === 15 ? 296 : 272
  const expectedSize = entrySize * numberOfFiles

  const fileListData = decompressLz4Block(compressed, expectedSize)

  const entries =
    basicInfo.pakVersion === 15
      ? readEntriesV15(fileListData, numberOfFiles)
      : readEntriesV18(fileListData, numberOfFiles)

  return {
    ...basicInfo,
    numberOfFiles,
    entries
  }
}

function findMetaEntry(entries: PakEntry[]): PakEntry {
  const candidates = entries.filter((entry) => {
    const name = normalizePakEntryName(entry.name)

    return name.endsWith('/meta.lsx') || name === 'meta.lsx'
  })

  if (candidates.length > 0) {
    return candidates[0]
  }

  const possible = entries
    .map((entry) => entry.name)
    .filter((name) => {
      const normalized = name.toLowerCase()
      return normalized.includes('meta') || normalized.endsWith('.lsx')
    })
    .slice(0, 20)

  throw new PakError(
    `No meta.lsx found in pak. Possible related entries: ${JSON.stringify(possible)}`
  )
}

function findScriptExtenderEntryPaths(entries: PakEntry[]): string[] {
  return entries
    .map((entry) => entry.name)
    .filter((name) => {
      const normalized = normalizePakEntryName(name)

      return (
        normalized.includes('/scriptextender/') ||
        normalized.startsWith('scriptextender/') ||
        normalized.endsWith('/scriptextender/config.json') ||
        normalized.endsWith('/scriptextender/settings.json')
      )
    })
    .sort()
}

function decompressEntryPayload(entry: PakEntry, payload: Buffer): Buffer {
  const method = entry.compressionMethod

  if (method === 0x00) {
    return payload
  }

  if (method === 0x01) {
    try {
      return inflateSync(payload)
    } catch (error) {
      throw new PakError(
        `Failed to decompress ${entry.name} with zlib: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  if (method === 0x02) {
    return decompressLz4Block(payload, entry.uncompressedSize)
  }

  if (method === 0x03) {
    throw new PakError(
      `Zstandard-compressed entry is not supported yet: ${entry.name}. ` +
        `We can add zstd support later if this pak needs it.`
    )
  }

  throw new PakError(`Unsupported compression method ${method} for ${entry.name}`)
}

function readEntryBytesFromBuffer(buffer: Buffer, entry: PakEntry): Buffer {
  const offset = bigintToSafeNumber(entry.offset, `${entry.name}.offset`)
  const end = offset + entry.sizeOnDisk

  if (offset < 0 || end > buffer.length) {
    throw new PakError(
      `Entry ${entry.name} points outside pak buffer: offset=${offset}, end=${end}, buffer=${buffer.length}`
    )
  }

  const payload = buffer.subarray(offset, end)

  return decompressEntryPayload(entry, payload)
}

export async function readPakBasicInfo(pakPath: string): Promise<PakBasicInfo> {
  const buffer = await readFile(pakPath)
  const reader = new BufferReader(buffer)

  return readPakBasicInfoFromReader(reader, pakPath)
}

export async function readPakEntriesInfo(pakPath: string): Promise<PakEntriesInfo> {
  const buffer = await readFile(pakPath)
  const reader = new BufferReader(buffer)

  return readPakEntriesInfoFromReader(reader, pakPath)
}

export async function readPakModInfo(pakPath: string): Promise<PakModInfo> {
  const buffer = await readFile(pakPath)
  const reader = new BufferReader(buffer)

  const entriesInfo = readPakEntriesInfoFromReader(reader, pakPath)
  const metaEntry = findMetaEntry(entriesInfo.entries)
  const metaBytes = readEntryBytesFromBuffer(buffer, metaEntry)
  const mod = parseMetaLsx(metaBytes)
  const pakStats = await stat(pakPath)

  const scriptExtenderPaths = findScriptExtenderEntryPaths(entriesInfo.entries)

  return {
    pakPath,
    pakFileName: basename(pakPath),
    pakVersion: entriesInfo.pakVersion,
    metaPath: metaEntry.name,
    lastModifiedMs: pakStats.mtimeMs,
    scriptExtender: {
      required: scriptExtenderPaths.length > 0,
      detectedPaths: scriptExtenderPaths
    },
    mod
  }
}