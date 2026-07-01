export function decodeBg3Version(value: string | bigint): string {
  const n = typeof value === 'bigint' ? value : BigInt(value)

  const major = (n >> 55n) & 0x1ffn
  const minor = (n >> 47n) & 0xffn
  const patch = (n >> 31n) & 0xffffn
  const revision = n & 0x7fffffffn

  return [major, minor, patch, revision].map(String).join('.')
}