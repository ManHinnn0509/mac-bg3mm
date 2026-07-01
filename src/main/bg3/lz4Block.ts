import { PakError } from './types'

export function decompressLz4Block(input: Buffer, expectedSize: number): Buffer {
  const output = Buffer.alloc(expectedSize)

  let inputPos = 0
  let outputPos = 0

  while (inputPos < input.length) {
    const token = input[inputPos]
    inputPos += 1

    let literalLength = token >> 4

    if (literalLength === 15) {
      let next: number

      do {
        if (inputPos >= input.length) {
          throw new PakError('Invalid LZ4 block: unexpected EOF while reading literal length')
        }

        next = input[inputPos]
        inputPos += 1
        literalLength += next
      } while (next === 255)
    }

    if (inputPos + literalLength > input.length) {
      throw new PakError('Invalid LZ4 block: literal length exceeds input size')
    }

    if (outputPos + literalLength > expectedSize) {
      throw new PakError('Invalid LZ4 block: literal length exceeds expected output size')
    }

    input.copy(output, outputPos, inputPos, inputPos + literalLength)

    inputPos += literalLength
    outputPos += literalLength

    // A valid LZ4 block can end immediately after literals.
    if (inputPos >= input.length) {
      break
    }

    if (inputPos + 2 > input.length) {
      throw new PakError('Invalid LZ4 block: missing match offset')
    }

    const matchOffset = input[inputPos] | (input[inputPos + 1] << 8)
    inputPos += 2

    if (matchOffset === 0) {
      throw new PakError('Invalid LZ4 block: match offset cannot be 0')
    }

    let matchLength = token & 0x0f

    if (matchLength === 15) {
      let next: number

      do {
        if (inputPos >= input.length) {
          throw new PakError('Invalid LZ4 block: unexpected EOF while reading match length')
        }

        next = input[inputPos]
        inputPos += 1
        matchLength += next
      } while (next === 255)
    }

    matchLength += 4

    const matchSource = outputPos - matchOffset

    if (matchSource < 0) {
      throw new PakError('Invalid LZ4 block: match offset points before output start')
    }

    if (outputPos + matchLength > expectedSize) {
      throw new PakError('Invalid LZ4 block: match length exceeds expected output size')
    }

    // Important: copy byte-by-byte because LZ4 matches can overlap.
    for (let i = 0; i < matchLength; i += 1) {
      output[outputPos] = output[outputPos - matchOffset]
      outputPos += 1
    }
  }

  if (outputPos !== expectedSize) {
    throw new PakError(
      `Invalid LZ4 block: expected ${expectedSize} decompressed bytes, got ${outputPos}`
    )
  }

  return output
}