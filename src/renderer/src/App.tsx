import { useState } from 'react'

type PakModInfoState = Awaited<ReturnType<typeof window.api.selectPakAndReadModInfo>>

function App(): React.JSX.Element {
  const [pakInfo, setPakInfo] = useState<PakModInfoState>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSelectPak(): Promise<void> {
    setError(null)

    try {
      const result = await window.api.selectPakAndReadModInfo()
      setPakInfo(result)
    } catch (err) {
      setPakInfo(null)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>BG3 Mod Manager</h1>

      <button onClick={handleSelectPak}>Select .pak and read mod info</button>

      {error && (
        <pre style={{ color: 'crimson', marginTop: 16, whiteSpace: 'pre-wrap' }}>
          {error}
        </pre>
      )}

      {pakInfo && (
        <section style={{ marginTop: 24 }}>
          <h2>{pakInfo.mod.name ?? pakInfo.pakFileName}</h2>

          <table style={{ borderCollapse: 'collapse', marginTop: 16 }}>
            <tbody>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Pak file</th>
                <td style={{ padding: 8 }}>{pakInfo.pakFileName}</td>
              </tr>

              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Pak version</th>
                <td style={{ padding: 8 }}>{pakInfo.pakVersion}</td>
              </tr>

              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Meta path</th>
                <td style={{ padding: 8 }}>{pakInfo.metaPath}</td>
              </tr>

              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
                <td style={{ padding: 8 }}>{pakInfo.mod.name ?? '-'}</td>
              </tr>

              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Author</th>
                <td style={{ padding: 8 }}>{pakInfo.mod.author ?? '-'}</td>
              </tr>

              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Version</th>
                <td style={{ padding: 8 }}>{pakInfo.mod.version ?? '-'}</td>
              </tr>

              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Version64</th>
                <td style={{ padding: 8 }}>{pakInfo.mod.version64 ?? '-'}</td>
              </tr>

              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>UUID</th>
                <td style={{ padding: 8 }}>{pakInfo.mod.uuid ?? '-'}</td>
              </tr>

              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Folder</th>
                <td style={{ padding: 8 }}>{pakInfo.mod.folder ?? '-'}</td>
              </tr>

              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Last modified</th>
                <td style={{ padding: 8 }}>{new Date(pakInfo.lastModifiedMs).toLocaleString()}</td>
              </tr>

              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Dependencies</th>
                <td style={{ padding: 8 }}>{pakInfo.mod.dependencies.length}</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: 24 }}>Debug JSON</h3>

          <pre
            style={{
              padding: 16,
              borderRadius: 8,
              background: '#222',
              color: '#eee',
              overflow: 'auto'
            }}
          >
            {JSON.stringify(pakInfo, null, 2)}
          </pre>
        </section>
      )}

      {!pakInfo && !error && (
        <p style={{ marginTop: 16 }}>
          Choose a BG3 .pak file to test whether the parser can read meta.lsx.
        </p>
      )}
    </main>
  )
}

export default App