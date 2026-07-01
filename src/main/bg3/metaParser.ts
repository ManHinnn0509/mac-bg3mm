import { XMLParser } from 'fast-xml-parser'
import { PakError, type ModDependency, type ModInfo } from './types'
import { decodeBg3Version } from './version'

type XmlObject = Record<string, unknown>

function isObject(value: unknown): value is XmlObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function collectNodeObjects(value: unknown, result: XmlObject[] = []): XmlObject[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectNodeObjects(item, result)
    }

    return result
  }

  if (!isObject(value)) {
    return result
  }

  // In LSX, useful elements are usually <node id="...">.
  // fast-xml-parser removes the tag name here, so we identify likely node objects by shape.
  if (typeof value.id === 'string' && ('attribute' in value || 'children' in value)) {
    result.push(value)
  }

  for (const child of Object.values(value)) {
    if (Array.isArray(child) || isObject(child)) {
      collectNodeObjects(child, result)
    }
  }

  return result
}

function findFirstNode(root: unknown, nodeId: string): XmlObject | null {
  const nodes = collectNodeObjects(root)
  return nodes.find((node) => node.id === nodeId) ?? null
}

function getAttrs(node: XmlObject): Record<string, string> {
  const attrs: Record<string, string> = {}

  for (const attr of asArray(node.attribute)) {
    if (!isObject(attr)) continue

    const key = attr.id
    const value = attr.value

    if (typeof key === 'string' && value != null) {
      attrs[key] = String(value)
    }
  }

  return attrs
}

function createDependency(attrs: Record<string, string>): ModDependency {
  const version64 = attrs.Version64 ?? attrs.Version ?? null

  return {
    name: attrs.Name ?? null,
    folder: attrs.Folder ?? null,
    uuid: attrs.UUID ?? null,
    version64,
    version: version64 ? decodeBg3Version(version64) : null,
    rawInfo: { ...attrs }
  }
}

function createModInfo(
  attrs: Record<string, string>,
  dependencies: ModDependency[]
): ModInfo {
  const version64 = attrs.Version64 ?? attrs.Version ?? null

  return {
    name: attrs.Name ?? null,
    folder: attrs.Folder ?? null,
    uuid: attrs.UUID ?? null,
    author: attrs.Author ?? null,
    description: attrs.Description ?? null,
    type: attrs.Type ?? null,
    version64,
    version: version64 ? decodeBg3Version(version64) : null,
    rawModuleInfo: { ...attrs },
    dependencies
  }
}

export function parseMetaLsx(xmlBytes: Buffer): ModInfo {
  const text = xmlBytes.toString('utf8').replace(/^\uFEFF/, '')

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: false,
    trimValues: false
  })

  const root = parser.parse(text)

  const moduleInfoNode = findFirstNode(root, 'ModuleInfo')

  if (!moduleInfoNode) {
    throw new PakError('meta.lsx found, but no ModuleInfo node exists')
  }

  const moduleAttrs = getAttrs(moduleInfoNode)

  const dependencies: ModDependency[] = []
  const dependenciesNode = findFirstNode(root, 'Dependencies')

  if (dependenciesNode) {
    const dependencyNodes = collectNodeObjects(dependenciesNode)

    for (const dependencyNode of dependencyNodes) {
      const attrs = getAttrs(dependencyNode)

      if (Object.keys(attrs).length > 0) {
        dependencies.push(createDependency(attrs))
      }
    }
  }

  return createModInfo(moduleAttrs, dependencies)
}