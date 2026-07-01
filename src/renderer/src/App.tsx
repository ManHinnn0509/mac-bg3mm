import { useState } from 'react'

type PakEntriesInfoState = Awaited<ReturnType<typeof window.api.selectPakAndReadEntriesInfo>>

function App(): React.JSX.Element {
  const [pakInfo, setPakInfo] = useState<PakEntriesInfoState>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSelectPak(): Promise<void> {
    setError(null)

    try {
      const result = await window.api.selectPakAndReadEntriesInfo()
      setPakInfo(result)
    } catch (err) {
      setPakInfo(null)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const previewEntries = pakInfo?.entries.slice(0, 100) ?? []

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>BG3 Mod Manager</h1>

      <button onClick={handleSelectPak}>Select .pak and read entries</button>

      {error && (
        <pre style={{ color: 'crimson', marginTop: 16, whiteSpace: 'pre-wrap' }}>
          {error}
        </pre>
      )}

      {pakInfo && (
        <section style={{ marginTop: 24 }}>
          <h2>{pakInfo.pakFileName}</h2>

          <p>
            Pak version: <strong>{pakInfo.pakVersion}</strong>
          </p>

          <p>
            Entries: <strong>{pakInfo.numberOfFiles}</strong>
          </p>

          <p>
            File list offset: <strong>{pakInfo.header.fileListOffset}</strong>
          </p>

          <h3>First {previewEntries.length} entries</h3>

          <div
            style={{
              maxHeight: 420,
              overflow: 'auto',
              border: '1px solid #555',
              borderRadius: 8
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Method</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Size</th>
                  <th style={{ textAlign: 'right', padding: 8 }}>Uncompressed</th>
                </tr>
              </thead>

              <tbody>
                {previewEntries.map((entry) => (
                  <tr key={`${entry.offset}-${entry.name}`}>
                    <td style={{ padding: 8, borderTop: '1px solid #333' }}>{entry.name}</td>
                    <td style={{ padding: 8, borderTop: '1px solid #333', textAlign: 'right' }}>
                      {entry.compressionMethod}
                    </td>
                    <td style={{ padding: 8, borderTop: '1px solid #333', textAlign: 'right' }}>
                      {entry.sizeOnDisk}
                    </td>
                    <td style={{ padding: 8, borderTop: '1px solid #333', textAlign: 'right' }}>
                      {entry.uncompressedSize}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Debug JSON</h3>

          <pre
            style={{
              padding: 16,
              borderRadius: 8,
              background: '#222',
              color: '#eee',
              overflow: 'auto'
            }}
          >
            {JSON.stringify(
              {
                pakPath: pakInfo.pakPath,
                pakFileName: pakInfo.pakFileName,
                pakVersion: pakInfo.pakVersion,
                numberOfFiles: pakInfo.numberOfFiles,
                header: pakInfo.header
              },
              null,
              2
            )}
          </pre>
        </section>
      )}

      {!pakInfo && !error && (
        <p style={{ marginTop: 16 }}>
          Choose a BG3 .pak file to test whether the parser can read its compressed file list.
        </p>
      )}
    </main>
  )
}

export default App