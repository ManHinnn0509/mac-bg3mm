import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { getDefaultBg3ModSettingsPath } from './bg3Paths'
import { PakError } from './types'

import type {
  ModuleShortDescInputDto,
  ModSettingsExportResultDto
} from '../../shared/bg3Types'

const GUSTAV_X: ModuleShortDescInputDto = {
  folder: 'GustavX',
  name: 'GustavX',
  uuid: 'cb555efe-2d9e-131f-8195-a89329d218ea',
  version64: '36028797018963968'
}

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function validateModuleShortDesc(mod: ModuleShortDescInputDto): void {
  const missing: string[] = []

  if (!mod.folder.trim()) missing.push('Folder')
  if (!mod.name.trim()) missing.push('Name')
  if (!mod.uuid.trim()) missing.push('UUID')
  if (!mod.version64.trim()) missing.push('Version64')

  if (missing.length > 0) {
    throw new PakError(`Cannot export ${mod.name || mod.folder || mod.uuid}: missing ${missing.join(', ')}`)
  }
}

function attr(id: string, type: string, value: string): string {
  return `                            <attribute id="${id}" type="${type}" value="${escapeXmlAttribute(value)}"/>`
}

function moduleShortDescNode(mod: ModuleShortDescInputDto): string {
  validateModuleShortDesc(mod)

  return [
    '                        <node id="ModuleShortDesc">',
    attr('Folder', 'LSString', mod.folder),
    attr('MD5', 'LSString', ''),
    attr('Name', 'LSString', mod.name),
    attr('PublishHandle', 'uint64', '0'),
    attr('UUID', 'guid', mod.uuid),
    attr('Version64', 'int64', mod.version64),
    '                        </node>'
  ].join('\n')
}

export function buildModSettingsLsx(enabledMods: ModuleShortDescInputDto[]): string {
  const modules = [GUSTAV_X, ...enabledMods]

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<save>',
    '    <version major="4" minor="8" revision="0" build="700"/>',
    '    <region id="ModuleSettings">',
    '        <node id="root">',
    '            <children>',
    '                <node id="Mods">',
    '                    <children>',
    ...modules.map(moduleShortDescNode),
    '                    </children>',
    '                </node>',
    '            </children>',
    '        </node>',
    '    </region>',
    '</save>',
    ''
  ].join('\n')
}

export async function exportModSettings(
  enabledMods: ModuleShortDescInputDto[]
): Promise<ModSettingsExportResultDto> {
  const modSettingsPath = getDefaultBg3ModSettingsPath()
  const xml = buildModSettingsLsx(enabledMods)

  await mkdir(dirname(modSettingsPath), { recursive: true })
  await writeFile(modSettingsPath, xml, 'utf8')

  return {
    modSettingsPath,
    exportedMods: enabledMods.length
  }
}