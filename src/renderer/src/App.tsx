import { CSS } from '@dnd-kit/utilities'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { useEffect, useMemo, useState } from 'react'

type ScanResultState = Awaited<ReturnType<typeof window.api.scanDefaultModsFolder>>
type ProfilesState = Awaited<ReturnType<typeof window.api.loadProfiles>>
type ModItem = ScanResultState['mods'][number]

type ColumnKey = 'name' | 'author' | 'version' | 'modified'
type ColumnWidths = Record<ColumnKey, number>

type ContainerId = 'enabled-mods' | 'disabled-mods'

const ENABLED_CONTAINER_ID: ContainerId = 'enabled-mods'
const DISABLED_CONTAINER_ID: ContainerId = 'disabled-mods'

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  name: 200,
  author: 100,
  version: 90,
  modified: 160
}

const COLUMN_LIMITS: Record<ColumnKey, { min: number; max: number }> = {
  name: { min: 160, max: 520 },
  author: { min: 90, max: 260 },
  version: { min: 70, max: 180 },
  modified: { min: 120, max: 260 }
}

const COLUMN_DEFINITIONS: Array<{ key: ColumnKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'author', label: 'Author' },
  { key: 'version', label: 'Version' },
  { key: 'modified', label: 'Last Edited' }
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function createGridTemplate(widths: ColumnWidths): string {
  return `${widths.name}px ${widths.author}px ${widths.version}px ${widths.modified}px`
}

function useResizableColumns(): {
  widths: ColumnWidths
  startResize: (columnKey: ColumnKey, event: React.MouseEvent<HTMLDivElement>) => void
} {
  const [widths, setWidths] = useState<ColumnWidths>(DEFAULT_COLUMN_WIDTHS)

  function startResize(columnKey: ColumnKey, event: React.MouseEvent<HTMLDivElement>): void {
    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const startWidth = widths[columnKey]
    const limits = COLUMN_LIMITS[columnKey]

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function handleMouseMove(moveEvent: MouseEvent): void {
      const delta = moveEvent.clientX - startX
      const nextWidth = clamp(startWidth + delta, limits.min, limits.max)

      setWidths((current) => ({
        ...current,
        [columnKey]: nextWidth
      }))
    }

    function handleMouseUp(): void {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return { widths, startResize }
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString()
}

function getModId(mod: ModItem): string {
  return mod.mod.uuid ?? mod.pakPath
}

function getModDisplayName(mod: ModItem): string {
  return mod.mod.name ?? mod.pakFileName
}

type ModuleShortDescInput = Parameters<typeof window.api.exportModSettings>[0][number]

function getMissingExportFields(mod: ModItem): string[] {
  const missing: string[] = []

  if (!mod.mod.folder) missing.push('Folder')
  if (!mod.mod.name) missing.push('Name')
  if (!mod.mod.uuid) missing.push('UUID')
  if (!mod.mod.version64) missing.push('Version64')

  return missing
}

function toModuleShortDescInput(mod: ModItem): ModuleShortDescInput {
  return {
    folder: mod.mod.folder ?? '',
    name: mod.mod.name ?? '',
    uuid: mod.mod.uuid ?? '',
    version64: mod.mod.version64 ?? ''
  }
}

function findActiveProfile(profilesState: ProfilesState | null): ProfilesState['profiles'][number] | null {
  if (!profilesState) return null

  return (
    profilesState.profiles.find((profile) => profile.id === profilesState.activeProfileId) ??
    profilesState.profiles[0] ??
    null
  )
}

function createProfileId(existingIds: Set<string>): string {
  let id = `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  while (existingIds.has(id)) {
    id = `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }

  return id
}

function uniqueExistingEnabledIds(enabledIds: string[], allMods: ModItem[]): string[] {
  const existingModIds = new Set(allMods.map(getModId))
  const seen = new Set<string>()
  const result: string[] = []

  for (const id of enabledIds) {
    if (!existingModIds.has(id)) continue
    if (seen.has(id)) continue

    seen.add(id)
    result.push(id)
  }

  return result
}

function ModRowContent({ mod }: { mod: ModItem }): React.JSX.Element {
  return (
    <>
      <div className="mod-table-cell">
        <div className="mod-name" title={getModDisplayName(mod)}>
          {getModDisplayName(mod)}
        </div>

        <div className="mod-meta" title={mod.pakFileName}>
          {mod.pakFileName}
        </div>
      </div>

      <div className="mod-table-cell mod-meta" title={mod.mod.author ?? '-'}>
        {mod.mod.author ?? '-'}
      </div>

      <div className="mod-table-cell mod-meta" title={mod.mod.version ?? '-'}>
        {mod.mod.version ?? '-'}
      </div>

      <div className="mod-table-cell mod-meta" title={formatDate(mod.lastModifiedMs)}>
        {formatDate(mod.lastModifiedMs)}
      </div>
    </>
  )
}

function SortableModRow({
  mod,
  gridTemplateColumns
}: {
  mod: ModItem
  gridTemplateColumns: string
}): React.JSX.Element {
  const id = getModId(mod)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  })

  return (
    <div
      ref={setNodeRef}
      className={`mod-table-row ${isDragging ? 'is-dragging' : ''}`}
      style={{
        gridTemplateColumns,
        transform: CSS.Transform.toString(transform),
        transition
      }}
      {...attributes}
      {...listeners}
    >
      <ModRowContent mod={mod} />
    </div>
  )
}

function ModTable({
  containerId,
  title,
  mods,
  emptyMessage,
  columnWidths,
  onStartResize
}: {
  containerId: ContainerId
  title: string
  mods: ModItem[]
  emptyMessage: string
  columnWidths: ColumnWidths
  onStartResize: (columnKey: ColumnKey, event: React.MouseEvent<HTMLDivElement>) => void
}): React.JSX.Element {
  const gridTemplateColumns = createGridTemplate(columnWidths)
  const { setNodeRef, isOver } = useDroppable({ id: containerId })

  return (
    <div className={`mod-column ${isOver ? 'is-over' : ''}`} ref={setNodeRef}>
      <div className="mod-column-header">
        <div className="mod-column-title">{title}</div>
        <div className="mod-column-count">{mods.length}</div>
      </div>

      <div className="mod-list">
        <div className="mod-table">
          <div className="mod-table-header" style={{ gridTemplateColumns }}>
            {COLUMN_DEFINITIONS.map((column) => (
              <div className="mod-table-header-cell" key={column.key}>
                <span>{column.label}</span>

                {column.key !== 'modified' && (
                  <div
                    className="column-resizer"
                    onMouseDown={(event) => onStartResize(column.key, event)}
                  />
                )}
              </div>
            ))}
          </div>

          <SortableContext items={mods.map(getModId)} strategy={verticalListSortingStrategy}>
            {mods.length === 0 ? (
              <div className="empty-state">{emptyMessage}</div>
            ) : (
              mods.map((mod) => (
                <SortableModRow
                  key={getModId(mod)}
                  mod={mod}
                  gridTemplateColumns={gridTemplateColumns}
                />
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  )
}

function App(): React.JSX.Element {
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null)
  const [profilesState, setProfilesState] = useState<ProfilesState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeDragModId, setActiveDragModId] = useState<string | null>(null)
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const [saveAsError, setSaveAsError] = useState<string | null>(null)

  const enabledColumns = useResizableColumns()
  const disabledColumns = useResizableColumns()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    })
  )

  async function loadInitialData(): Promise<void> {
    setSuccessMessage(null)
    setError(null)
    setIsScanning(true)

    try {
      const [nextScanResult, nextProfilesState] = await Promise.all([
        window.api.scanDefaultModsFolder(),
        window.api.loadProfiles()
      ])

      setScanResult(nextScanResult)
      setProfilesState(nextProfilesState)
      setHasUnsavedChanges(false)
    } catch (err) {
      setScanResult(null)
      setProfilesState(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsScanning(false)
    }
  }

  async function handleRefreshMods(): Promise<void> {
    setSuccessMessage(null)
    setError(null)
    setIsScanning(true)

    try {
      const result = await window.api.scanDefaultModsFolder()
      setScanResult(result)
    } catch (err) {
      setScanResult(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsScanning(false)
    }
  }

  async function handleSaveProfile(): Promise<void> {
    setSuccessMessage(null)
    if (!profilesState) return

    setError(null)
    setIsSaving(true)

    try {
      const savedState = await window.api.saveProfiles(profilesState)
      setProfilesState(savedState)
      setHasUnsavedChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleExportToBg3(): Promise<void> {
    setError(null)
    setSuccessMessage(null)
    setIsExporting(true)

    try {
      const invalidMods = enabledMods
        .map((mod) => ({
          name: getModDisplayName(mod),
          missing: getMissingExportFields(mod)
        }))
        .filter((item) => item.missing.length > 0)

      if (invalidMods.length > 0) {
        setError(
          [
            'Cannot export to BG3 because some enabled mods are missing required fields:',
            ...invalidMods.map((item) => `- ${item.name}: ${item.missing.join(', ')}`)
          ].join('\n')
        )
        return
      }

      const exportMods = enabledMods.map(toModuleShortDescInput)
      const result = await window.api.exportModSettings(exportMods)

      setSuccessMessage(
        [
          `Exported ${result.exportedMods} enabled mod(s) to BG3.`,
          `Path: ${result.modSettingsPath}`,
          result.backupPath ? `Backup: ${result.backupPath}` : 'Backup: no previous modsettings.lsx existed'
        ].join('\n')
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsExporting(false)
    }
  }

  function handleOpenSaveProfileAs(): void {
    setSuccessMessage(null)
    const baseName = activeProfile?.name ?? 'New Profile'

    setError(null)
    setSaveAsError(null)
    setSaveAsName(`${baseName} Copy`)
    setIsSaveAsOpen(true)
  }

  function handleCloseSaveProfileAs(): void {
    setIsSaveAsOpen(false)
    setSaveAsName('')
    setSaveAsError(null)
  }

  async function handleConfirmSaveProfileAs(): Promise<void> {
    if (!profilesState) return

    const name = saveAsName.trim()

    if (!name) {
      setSaveAsError('Profile name cannot be empty')
      return
    }

    const duplicatedName = profilesState.profiles.some(
      (profile) => profile.name.trim().toLowerCase() === name.toLowerCase()
    )

    if (duplicatedName) {
      setSaveAsError(`Profile already exists: ${name}`)
      return
    }

    setError(null)
    setSaveAsError(null)
    setIsSaving(true)

    try {
      const existingIds = new Set(profilesState.profiles.map((profile) => profile.id))
      const newProfile = {
        id: createProfileId(existingIds),
        name,
        enabledModUuids: [...enabledModIds]
      }

      const nextState = {
        activeProfileId: newProfile.id,
        profiles: [...profilesState.profiles, newProfile]
      }

      const savedState = await window.api.saveProfiles(nextState)

      setProfilesState(savedState)
      setHasUnsavedChanges(false)
      handleCloseSaveProfileAs()
      } catch (err) {
        setSaveAsError(err instanceof Error ? err.message : String(err))
      } finally {
      setIsSaving(false)
    }
  }

  function handleSelectProfile(profileId: string): void {
    setSuccessMessage(null)
    if (!profilesState) return
    if (profileId === profilesState.activeProfileId) return

    setProfilesState({
      ...profilesState,
      activeProfileId: profileId
    })
  }

  function updateActiveProfileEnabledIds(nextEnabledIds: string[]): void {
    setSuccessMessage(null)
    setProfilesState((current) => {
      if (!current) return current

      const activeProfile = findActiveProfile(current)
      if (!activeProfile) return current

      return {
        ...current,
        activeProfileId: activeProfile.id,
        profiles: current.profiles.map((profile) =>
          profile.id === activeProfile.id
            ? {
                ...profile,
                enabledModUuids: nextEnabledIds
              }
            : profile
        )
      }
    })

    setHasUnsavedChanges(true)
  }

  useEffect(() => {
    void loadInitialData()
  }, [])

  const allMods = useMemo(() => scanResult?.mods ?? [], [scanResult])

  const modsById = useMemo(() => {
    const map = new Map<string, ModItem>()

    for (const mod of allMods) {
      map.set(getModId(mod), mod)
    }

    return map
  }, [allMods])

  const activeProfile = useMemo(() => findActiveProfile(profilesState), [profilesState])

  const enabledModIds = useMemo(() => {
    return uniqueExistingEnabledIds(activeProfile?.enabledModUuids ?? [], allMods)
  }, [activeProfile, allMods])

  const enabledMods = useMemo(() => {
    return enabledModIds.map((id) => modsById.get(id)).filter((mod): mod is ModItem => Boolean(mod))
  }, [enabledModIds, modsById])

  const disabledMods = useMemo(() => {
    const enabledSet = new Set(enabledModIds)

    return allMods.filter((mod) => !enabledSet.has(getModId(mod)))
  }, [allMods, enabledModIds])

  const activeDragMod = activeDragModId ? modsById.get(activeDragModId) ?? null : null
  const scanErrors = scanResult?.errors ?? []

  function getContainerForModId(modId: string): ContainerId {
    return enabledModIds.includes(modId) ? ENABLED_CONTAINER_ID : DISABLED_CONTAINER_ID
  }

  function handleDragStart(event: DragStartEvent): void {
    setActiveDragModId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent): void {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null

    setActiveDragModId(null)

    if (!overId) return
    if (!modsById.has(activeId)) return

    const activeContainer = getContainerForModId(activeId)

    let overContainer: ContainerId

    if (overId === ENABLED_CONTAINER_ID || overId === DISABLED_CONTAINER_ID) {
      overContainer = overId
    } else {
      overContainer = getContainerForModId(overId)
    }

    if (activeContainer === DISABLED_CONTAINER_ID && overContainer === DISABLED_CONTAINER_ID) {
      return
    }

    if (activeContainer === ENABLED_CONTAINER_ID && overContainer === DISABLED_CONTAINER_ID) {
      updateActiveProfileEnabledIds(enabledModIds.filter((id) => id !== activeId))
      return
    }

    if (activeContainer === ENABLED_CONTAINER_ID && overContainer === ENABLED_CONTAINER_ID) {
      const oldIndex = enabledModIds.indexOf(activeId)
      const newIndex =
        overId === ENABLED_CONTAINER_ID ? enabledModIds.length - 1 : enabledModIds.indexOf(overId)

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return
      }

      updateActiveProfileEnabledIds(arrayMove(enabledModIds, oldIndex, newIndex))
      return
    }

    if (activeContainer === DISABLED_CONTAINER_ID && overContainer === ENABLED_CONTAINER_ID) {
      const nextEnabledIds = enabledModIds.filter((id) => id !== activeId)
      const insertIndex =
        overId === ENABLED_CONTAINER_ID ? nextEnabledIds.length : nextEnabledIds.indexOf(overId)

      if (insertIndex === -1) {
        nextEnabledIds.push(activeId)
      } else {
        nextEnabledIds.splice(insertIndex, 0, activeId)
      }

      updateActiveProfileEnabledIds(nextEnabledIds)
    }
  }

  return (
    <div className="app-shell">
      {isSaveAsOpen && (
        <div className="modal-backdrop" onMouseDown={handleCloseSaveProfileAs}>
          <form
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              void handleConfirmSaveProfileAs()
            }}
          >
            <div className="modal-title">Save Profile As...</div>

            <label className="modal-field">
              <span>Profile name</span>

              <input
                autoFocus
                value={saveAsName}
                onChange={(event) => {
                  setSaveAsName(event.target.value)
                  setSaveAsError(null)
                }}
                placeholder="New profile name"
              />
            </label>

            {saveAsError && <div className="modal-error">{saveAsError}</div>}

            <div className="modal-actions">
              <button type="button" onClick={handleCloseSaveProfileAs}>
                Cancel
              </button>

              <button type="submit" disabled={isSaving || !saveAsName.trim()}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
      <header className="app-header">
        <div className="header-left">
          <div className="brand-block">
            <div className="app-title">BG3 Mod Manager</div>
            <div className="app-subtitle">Local .pak profile manager</div>
          </div>

          <label className="profile-select-block">
            <span>Profile</span>

            <select
              className="profile-select"
              value={profilesState?.activeProfileId ?? ''}
              disabled={!profilesState || profilesState.profiles.length === 0}
              onChange={(event) => handleSelectProfile(event.target.value)}
            >
              {profilesState?.profiles.map((profile) => (
                <option value={profile.id} key={profile.id}>
                  {profile.name}
                  {profile.id === activeProfile?.id && hasUnsavedChanges ? ' *' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="header-actions">
          <button onClick={handleSaveProfile} disabled={!profilesState || !hasUnsavedChanges || isSaving}>
            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Profile *' : 'Save Profile'}
          </button>

          <button onClick={handleOpenSaveProfileAs} disabled={!profilesState || isSaving}>
            Save Profile As...
          </button>

          <button
            onClick={handleExportToBg3}
            disabled={!profilesState || hasUnsavedChanges || isExporting}
            title={hasUnsavedChanges ? 'Save profile before exporting to BG3' : undefined}
          >
            {isExporting ? 'Exporting...' : 'Export to BG3'}
          </button>

          <button onClick={handleRefreshMods} disabled={isScanning}>
            {isScanning ? 'Scanning...' : 'Refresh Mods'}
          </button>
        </div>
      </header>

      <div className="app-content">
        <main className="main-panel">
          {error && <div className="error-box">{error}</div>}
          {successMessage && <div className="success-box">{successMessage}</div>}

          <section className="status-row">
            <div className="status-card">
              <div className="status-label">Mods Folder</div>
              <div className="status-value">{scanResult?.folderPath ?? 'Scanning default path...'}</div>
            </div>

            <div className="status-card">
              <div className="status-label">Mods</div>
              <div className="status-value">{allMods.length}</div>
            </div>

            <div className="status-card">
              <div className="status-label">Errors</div>
              <div className="status-value">{scanErrors.length}</div>
            </div>
          </section>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <section className="mod-columns">
              <ModTable
                containerId={ENABLED_CONTAINER_ID}
                title="Enabled Mods"
                mods={enabledMods}
                emptyMessage="Drag mods here to enable them."
                columnWidths={enabledColumns.widths}
                onStartResize={enabledColumns.startResize}
              />

              <ModTable
                containerId={DISABLED_CONTAINER_ID}
                title="Disabled Mods"
                mods={disabledMods}
                emptyMessage="No disabled mods found."
                columnWidths={disabledColumns.widths}
                onStartResize={disabledColumns.startResize}
              />
            </section>

            <DragOverlay>
              {activeDragMod && (
                <div
                  className="mod-table-row drag-overlay"
                  style={{
                    gridTemplateColumns: createGridTemplate(
                      getContainerForModId(getModId(activeDragMod)) === ENABLED_CONTAINER_ID
                        ? enabledColumns.widths
                        : disabledColumns.widths
                    )
                  }}
                >
                  <ModRowContent mod={activeDragMod} />
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {scanErrors.length > 0 && (
            <section className="error-box">
              <strong>Scan Errors</strong>

              {scanErrors.map((scanError) => (
                <div key={scanError.pakPath} style={{ marginTop: 8 }}>
                  {scanError.pakFileName}: {scanError.error}
                </div>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default App