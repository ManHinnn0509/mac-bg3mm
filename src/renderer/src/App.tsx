// src/renderer/src/App.tsx

import { useState } from 'react'

type ScanResultState = Awaited<ReturnType<typeof window.api.selectModsFolderAndScan>>

function App(): React.JSX.Element {
  const [scanResult, setScanResult] = useState<ScanResultState>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  async function handleScanModsFolder(): Promise<void> {
    setError(null)
    setIsScanning(true)

    try {
      const result = await window.api.selectModsFolderAndScan()
      setScanResult(result)
    } catch (err) {
      setScanResult(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsScanning(false)
    }
  }

  const mods = scanResult?.mods ?? []
  const scanErrors = scanResult?.errors ?? []

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>BG3 Mod Manager</h1>

      <button onClick={handleScanModsFolder} disabled={isScanning}>
        {isScanning ? 'Scanning...' : 'Select Mods Folder and Scan'}
      </button>

      {error && (
        <pre style={{ color: 'crimson', marginTop: 16, whiteSpace: 'pre-wrap' }}>{error}</pre>
      )}

      {scanResult && (
        <section style={{ marginTop: 24 }}>
          <h2>Scan Result</h2>

          <p>
            Folder: <strong>{scanResult.folderPath}</strong>
          </p>

          <p>
            Mods: <strong>{mods.length}</strong>
          </p>

          <p>
            Errors: <strong>{scanErrors.length}</strong>
          </p>

          <h3>Mods</h3>

          <div
            style={{
              maxHeight: 520,
              overflow: 'auto',
              border: '1px solid #555',
              borderRadius: 8
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Author</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Version</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>UUID</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Modified</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Pak</th>
                </tr>
              </thead>

              <tbody>
                {mods.map((mod) => (
                  <tr key={mod.mod.uuid ?? mod.pakPath}>
                    <td style={{ padding: 8, borderTop: '1px solid #333' }}>
                      {mod.mod.name ?? '-'}
                    </td>

                    <td style={{ padding: 8, borderTop: '1px solid #333' }}>
                      {mod.mod.author ?? '-'}
                    </td>

                    <td style={{ padding: 8, borderTop: '1px solid #333' }}>
                      {mod.mod.version ?? '-'}
                    </td>

                    <td
                      style={{
                        padding: 8,
                        borderTop: '1px solid #333',
                        fontFamily: 'monospace',
                        fontSize: 12
                      }}
                    >
                      {mod.mod.uuid ?? '-'}
                    </td>

                    <td style={{ padding: 8, borderTop: '1px solid #333' }}>
                      {new Date(mod.lastModifiedMs).toLocaleString()}
                    </td>

                    <td style={{ padding: 8, borderTop: '1px solid #333' }}>
                      {mod.pakFileName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {scanErrors.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Scan Errors</h3>

              <div
                style={{
                  maxHeight: 240,
                  overflow: 'auto',
                  border: '1px solid #884444',
                  borderRadius: 8
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8 }}>Pak</th>
                      <th style={{ textAlign: 'left', padding: 8 }}>Error</th>
                    </tr>
                  </thead>

                  <tbody>
                    {scanErrors.map((scanError) => (
                      <tr key={scanError.pakPath}>
                        <td style={{ padding: 8, borderTop: '1px solid #333' }}>
                          {scanError.pakFileName}
                        </td>

                        <td style={{ padding: 8, borderTop: '1px solid #333' }}>
                          {scanError.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {!scanResult && !error && (
        <p style={{ marginTop: 16 }}>
          Choose your BG3 Mods folder. The app will scan all .pak files and read their meta.lsx.
        </p>
      )}
    </main>
  )
}

export default App