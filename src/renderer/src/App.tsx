import { useEffect, useMemo, useState } from 'react'

type ScanResultState = Awaited<ReturnType<typeof window.api.scanDefaultModsFolder>>
type ModItem = ScanResultState['mods'][number]

type ColumnKey = 'name' | 'author' | 'version' | 'modified'

type ColumnWidths = Record<ColumnKey, number>

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  name: 260,
  author: 130,
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

function getModDisplayName(mod: ModItem): string {
  return mod.mod.name ?? mod.pakFileName
}

function ModTable({
  title,
  mods,
  emptyMessage,
  columnWidths,
  onStartResize
}: {
  title: string
  mods: ModItem[]
  emptyMessage: string
  columnWidths: ColumnWidths
  onStartResize: (columnKey: ColumnKey, event: React.MouseEvent<HTMLDivElement>) => void
}): React.JSX.Element {
  const gridTemplateColumns = createGridTemplate(columnWidths)

  return (
    <div className="mod-column">
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

          {mods.length === 0 ? (
            <div className="empty-state">{emptyMessage}</div>
          ) : (
            mods.map((mod) => (
              <div
                className="mod-table-row"
                key={mod.mod.uuid ?? mod.pakPath}
                style={{ gridTemplateColumns }}
              >
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function App(): React.JSX.Element {
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const enabledColumns = useResizableColumns()
  const disabledColumns = useResizableColumns()

  async function handleScanModsFolder(): Promise<void> {
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

  useEffect(() => {
    void handleScanModsFolder()
  }, [])

  const allMods = useMemo(() => scanResult?.mods ?? [], [scanResult])

  // Profile 還沒做，所以暫時全部都是 disabled。
  const enabledMods: ModItem[] = []
  const disabledMods = allMods

  const scanErrors = scanResult?.errors ?? []

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-title">BG3 Mod Manager</div>
          <div className="app-subtitle">Local .pak profile manager</div>
        </div>

        <div className="header-actions">
          <button disabled title="Profile backend coming next">
            Save Profile
          </button>

          <button disabled title="Profile backend coming next">
            Save Profile As...
          </button>

          <button onClick={handleScanModsFolder} disabled={isScanning}>
            {isScanning ? 'Scanning...' : 'Refresh Mods'}
          </button>
        </div>
      </header>

      <div className="app-content">
        <aside className="sidebar">
          <div className="sidebar-title">Profiles</div>

          <div className="profile-item">
            <div style={{ fontWeight: 700 }}>Default</div>
            <div className="mod-meta">Profile system coming next</div>
          </div>
        </aside>

        <main className="main-panel">
          {error && <div className="error-box">{error}</div>}

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

          <section className="mod-columns">
            <ModTable
              title="Enabled Mods"
              mods={enabledMods}
              emptyMessage="No enabled mods yet. Profiles and drag/drop are the next step."
              columnWidths={enabledColumns.widths}
              onStartResize={enabledColumns.startResize}
            />

            <ModTable
              title="Disabled Mods"
              mods={disabledMods}
              emptyMessage="No disabled mods found."
              columnWidths={disabledColumns.widths}
              onStartResize={disabledColumns.startResize}
            />
          </section>

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