import { createRoot } from 'react-dom/client'
import { JazzProvider } from 'jazz-react'
import App from './App.tsx'

const peer = (import.meta.env.VITE_JAZZ_PEER as string) ?? 'wss://cloud.jazz.tools/?key=battle-city-dev'

// storage={[]} disables IndexedDB — Jazz 0.14.x has a transaction-boundary bug with IDB
createRoot(document.getElementById('root')!).render(
  <JazzProvider sync={{ peer: peer as `wss://${string}` }} storage={[] as never}>
    <App />
  </JazzProvider>,
)
