import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export type ModProfile = {
  id: string
  name: string
  enabledModUuids: string[]
}

export type ProfilesState = {
  activeProfileId: string
  profiles: ModProfile[]
}

const DEFAULT_PROFILE_ID = 'default'

function createDefaultProfilesState(): ProfilesState {
  return {
    activeProfileId: DEFAULT_PROFILE_ID,
    profiles: [
      {
        id: DEFAULT_PROFILE_ID,
        name: 'Default',
        enabledModUuids: []
      }
    ]
  }
}

function getProfilesFilePath(): string {
  return join(app.getPath('userData'), 'profiles.json')
}

function isValidProfilesState(value: unknown): value is ProfilesState {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const state = value as ProfilesState

  return (
    typeof state.activeProfileId === 'string' &&
    Array.isArray(state.profiles) &&
    state.profiles.every(
      (profile) =>
        typeof profile.id === 'string' &&
        typeof profile.name === 'string' &&
        Array.isArray(profile.enabledModUuids) &&
        profile.enabledModUuids.every((uuid) => typeof uuid === 'string')
    )
  )
}

export async function loadProfilesState(): Promise<ProfilesState> {
  const filePath = getProfilesFilePath()

  try {
    const text = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(text)

    if (isValidProfilesState(parsed)) {
      return parsed
    }

    return createDefaultProfilesState()
  } catch {
    return createDefaultProfilesState()
  }
}

export async function saveProfilesState(state: ProfilesState): Promise<ProfilesState> {
  const filePath = getProfilesFilePath()

  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(state, null, 2), 'utf8')

  return state
}