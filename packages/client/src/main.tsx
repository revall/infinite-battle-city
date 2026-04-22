import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Canvas text doesn't reactively re-render when a web font loads — force-fetch
// Geist Mono now so the renderer's ctx.font can use it from the first frame.
if ('fonts' in document) {
  document.fonts.load('9px "Geist Pixel Square"').catch(() => {})
  document.fonts.load('bold 12px "Geist Pixel Square"').catch(() => {})
}

createRoot(document.getElementById('root')!).render(<App />)
