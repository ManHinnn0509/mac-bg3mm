import { useState } from 'react'

type PakBasicInfoState = Awaited<ReturnType<typeof window.api.selectPakAndReadBasicInfo>>

function App(): React.JSX.Element {
  const [pakInfo, setPakInfo] = useState<PakBasicInfoState>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSelectPak(): Promise<void> {
    setError(null)

    try {
      const result = await window.api.selectPakAndReadBasicInfo()
      setPakInfo(result)
    } catch (err) {
      setPakInfo(null)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>BG3 Mod Manager</h1>

      <button onClick={handleSelectPak}>Select .pak and read header</button>

      {error && (
        <pre style={{ color: 'crimson', marginTop: 16 }}>
          {error}
        </pre>
      )}

      {pakInfo && (
        <section style={{ marginTop: 24 }}>
          <h2>Pak Basic Info</h2>

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
          Choose a BG3 .pak file to test whether the parser can read its header.
        </p>
      )}
    </main>
  )
}

export default App