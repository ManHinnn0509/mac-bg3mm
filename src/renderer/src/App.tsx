import { useEffect, useMemo, useState } from 'react'

type ScanResultState = Awaited<ReturnType<typeof window.api.scanDefaultModsFolder>>
type ModItem = ScanResultState['mods'][number]

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString()
}

function getModDisplayName(mod: ModItem): string {
  return mod.mod.name ?? mod.pakFileName
}

function ModRow({ mod }: { mod: ModItem }): React.JSX.Element {
  return (
    <div className="mod-row">
      <div>
        <div className="mod-name" title={getModDisplayName(mod)}>
          {getModDisplayName(mod)}
        </div>
        <div className="mod-meta" title={mod.pakFileName}>
          {mod.pakFileName}
        </div>
      </div>

      <div className="mod-meta" title={mod.mod.author ?? '-'}>
        {mod.mod.author ?? '-'}
      </div>

      <div className="mod-meta" title={mod.mod.version ?? '-'}>
        {mod.mod.version ?? '-'}
      </div>

      <div className="mod-meta" title={formatDate(mod.lastModifiedMs)}>
        {formatDate(mod.lastModifiedMs)}
      </div>
    </div>
  )
}

function App(): React.JSX.Element {
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

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

        <button onClick={handleScanModsFolder} disabled={isScanning}>
          {isScanning ? 'Scanning...' : 'Refresh Mods'}
        </button>
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
            <div className="mod-column">
              <div className="mod-column-header">
                <div className="mod-column-title">Enabled Mods</div>
                <div className="mod-column-count">{enabledMods.length}</div>
              </div>

              <div className="mod-list">
                {enabledMods.length === 0 ? (
                  <div className="empty-state">
                    No enabled mods yet. Profiles and drag/drop are the next step.
                  </div>
                ) : (
                  enabledMods.map((mod) => <ModRow key={mod.mod.uuid ?? mod.pakPath} mod={mod} />)
                )}
              </div>
            </div>

            <div className="mod-column">
              <div className="mod-column-header">
                <div className="mod-column-title">Disabled Mods</div>
                <div className="mod-column-count">{disabledMods.length}</div>
              </div>

              <div className="mod-list">
                {disabledMods.length === 0 ? (
                  <div className="empty-state">No disabled mods found.</div>
                ) : (
                  disabledMods.map((mod) => <ModRow key={mod.mod.uuid ?? mod.pakPath} mod={mod} />)
                )}
              </div>
            </div>
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