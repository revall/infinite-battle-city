import { useEffect, useState } from 'react'
import brickUrl from './assets/brick.svg'
import { GuestbookPage } from './GuestbookPage'
import { QRPage } from './QRPage'
import { NotImplementedDialog, WindowControls, useNotImplemented } from './WindowChrome'

const GAME_URL = (import.meta.env.VITE_GAME_URL as string | undefined) ?? '/play/'

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1)
  return p
}

function useRoute(): string {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname))
  useEffect(() => {
    const onPop = () => setPath(normalizePath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return path
}

export function navigate(to: string) {
  window.history.pushState(null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function App() {
  const path = useRoute()
  if (path === '/guestbook') return <GuestbookPage />
  if (path === '/qr') return <QRPage />
  return <HomePage />
}

function HomePage() {
  const [visits, setVisits] = useState<number | null>(null)
  const notImpl = useNotImplemented()

  useEffect(() => {
    let cancelled = false
    fetch('/api/visits', { method: 'POST' })
      .then((r) => (r.ok ? (r.json() as Promise<{ count: number }>) : null))
      .then((data) => {
        if (cancelled) return
        if (data && typeof data.count === 'number') setVisits(data.count)
        else setVisits(133742 + Math.floor(Math.random() * 999))
      })
      .catch(() => {
        if (!cancelled) setVisits(133742 + Math.floor(Math.random() * 999))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const brickStyle = {
    backgroundImage: `url("${brickUrl}")`,
    backgroundSize: '0.32em 0.16em',
    backgroundRepeat: 'repeat',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    letterSpacing: '0.04em',
    fontWeight: 700,
  } as const

  const chromeStyle = {
    backgroundImage:
      'linear-gradient(180deg, #ff00ff 0%, #ffffff 32%, #00ffff 55%, #ff00ff 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    filter: 'drop-shadow(0 0 10px #ff00ffcc) drop-shadow(0 2px 0 #000)',
    letterSpacing: '0.08em',
  } as const

  return (
    <div className="min-h-full bg-black text-white flex flex-col items-center">
      <WelcomeDialog />
      <NotImplementedDialog action={notImpl.action} onClose={notImpl.close} />

      {/* Starfield scanline vibe */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)',
        }}
      />

      {/* Title */}
      <header className="relative w-full flex flex-col items-center pt-10 pb-6 px-4">
        <h1
          className="font-pixel text-center leading-[0.95]"
          style={{ fontSize: 'clamp(56px, 11vw, 160px)' }}
        >
          <span className="block" style={brickStyle}>
            BATTLE CITY
          </span>
          <span
            className="block mt-3 font-pixel-grid"
            style={{ ...chromeStyle, fontSize: '0.62em' }}
          >
            INFINITE
          </span>
        </h1>
      </header>

      {/* Marquee slogan */}
      <div className="relative w-full max-w-6xl px-4">
        <div className="border-y-4 border-double border-yellow-300 bg-[#000080] overflow-hidden">
          <div
            className="animate-marquee whitespace-nowrap font-pixel text-yellow-300 py-2"
            style={{ fontSize: 'clamp(18px, 2.2vw, 28px)' }}
          >
            <MarqueeStrip />
            <MarqueeStrip />
          </div>
        </div>
      </div>

      {/* Win98 window wrapping the iframe */}
      <main className="relative w-full max-w-6xl px-4 mt-6">
        <div
          className="bg-[#c0c0c0] p-1"
          style={{
            boxShadow:
              'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #000000, inset 2px 2px 0 #dfdfdf, inset -2px -2px 0 #808080, 4px 4px 0 #000',
          }}
        >
          {/* Title bar */}
          <div
            className="flex items-center justify-between px-1.5 py-1 text-white font-sys font-bold text-sm"
            style={{
              backgroundImage: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 bg-yellow-300 border border-black" />
              <span className="tracking-wide">BATTLECITY.EXE - MULTIPLAYER ROOM</span>
            </div>
            <WindowControls onAction={notImpl.trigger} />
          </div>

          {/* Menu bar */}
          <div className="flex gap-3 px-2 py-0.5 bg-[#c0c0c0] text-black font-sys text-xs border-b border-[#808080]">
            {['File', 'Edit', 'Play', 'Help'].map((m, i) => (
              <span key={m}>
                <u>{m[0]}</u>
                {m.slice(1)}
                {i === 2 && <span className="animate-blink ml-1 text-red-600">● LIVE</span>}
              </span>
            ))}
          </div>

          {/* Iframe pit */}
          <div
            className="bg-black"
            style={{
              boxShadow:
                'inset 1px 1px 0 #000000, inset -1px -1px 0 #ffffff, inset 2px 2px 0 #808080, inset -2px -2px 0 #dfdfdf',
            }}
          >
            <iframe
              src={GAME_URL}
              title="Battle City Infinite"
              className="block w-full bg-black border-0"
              style={{ aspectRatio: '4 / 3' }}
            />
          </div>

          {/* Status bar */}
          <div
            className="flex justify-between items-center px-2 py-0.5 bg-[#c0c0c0] text-black font-sys text-[11px] mt-1"
            style={{ boxShadow: 'inset 1px 1px 0 #808080, inset -1px -1px 0 #ffffff' }}
          >
            <span>Status: CONNECTED · 40 TANKS MAX</span>
            <span>
              Visitors:{' '}
              <span className="font-mono bg-black text-[#00ff00] px-1 border border-[#00ff00]">
                {visits === null ? '------' : visits.toLocaleString()}
              </span>
            </span>
          </div>
        </div>
      </main>

      {/* Badges row */}
      <section className="relative w-full max-w-6xl px-4 mt-8 flex flex-wrap items-center justify-center gap-4">
        <IEBadge />
        <ConstructionBadge />
        <NetscapeBadge />
      </section>

      {/* Footer */}
      <footer className="relative font-sys text-[11px] text-neutral-400 py-8 text-center px-4">
        <p>
          © 2026 BATTLE CITY INFINITE · MADE FOR THE Y2K HACKATHON ·{' '}
          <a
            href="/guestbook"
            onClick={(e) => {
              e.preventDefault()
              navigate('/guestbook')
            }}
            className="text-[#00ffff] underline hover:text-yellow-300"
          >
            sign guestbook
          </a>{' '}
          · <span className="text-[#00ffff] underline">webring</span>
        </p>
        <p className="mt-1 italic">&lt;HAND-CODED IN NOTEPAD ON WINDOWS 98&gt;</p>
      </footer>
    </div>
  )
}

function MarqueeStrip() {
  const items = new Array(3).fill('now with INTERNET MULTIPLAYER technology')
  return (
    <span className="inline-block pr-16">
      {items.map((t, i) => (
        <span key={i} className="mx-8">
          <span className="text-red-400">★</span>{' '}
          <span className="uppercase">{t}</span>{' '}
          <span className="text-red-400">★</span>
        </span>
      ))}
    </span>
  )
}

function WelcomeDialog() {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="w-[min(440px,100%)] bg-[#c0c0c0] p-1 text-black"
        style={{
          boxShadow:
            'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #000000, inset 2px 2px 0 #dfdfdf, inset -2px -2px 0 #808080, 4px 4px 0 #000',
        }}
      >
        <div
          id="welcome-title"
          className="flex items-center justify-between px-1.5 py-1 text-white font-sys font-bold text-sm"
          style={{ backgroundImage: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)' }}
        >
          <span className="tracking-wide">SYSTEM NOTICE</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="inline-flex items-center justify-center w-5 h-5 bg-[#c0c0c0] text-black text-xs leading-none font-bold"
            style={{ boxShadow: 'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #404040' }}
          >
            ✕
          </button>
        </div>

        <div className="flex gap-4 items-start p-4 font-sys text-[13px] leading-snug">
          <div
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-2xl italic"
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              backgroundImage:
                'radial-gradient(circle at 30% 30%, #8ad6ff 0%, #1a6fd4 55%, #082a66 100%)',
              textShadow: '1px 1px 0 #000',
            }}
          >
            i
          </div>
          <div className="space-y-2">
            <p className="font-bold">Hello, traveler from the future! 👋</p>
            <p>
              This site has been optimized for{' '}
              <span className="font-bold">Internet Explorer 5.5</span> at{' '}
              <span className="font-bold">800×600</span> resolution.
            </p>
            <p className="text-[12px] text-[#404040]">
              Your browser appears to be from the year 2026 or later. Some animated GIFs may
              render too smoothly. Thank you for your patience.
            </p>
          </div>
        </div>

        <div
          className="flex justify-end gap-2 px-4 pb-4 pt-1"
          style={{ borderTop: '1px solid #808080' }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            autoFocus
            className="font-sys text-[13px] px-6 py-1 bg-[#c0c0c0] text-black"
            style={{
              boxShadow:
                'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #000000, inset 2px 2px 0 #dfdfdf, inset -2px -2px 0 #808080',
            }}
          >
            <u>O</u>K
          </button>
        </div>
      </div>
    </div>
  )
}

function IEBadge() {
  return (
    <div
      className="inline-flex items-stretch bg-[#c0c0c0] border-2 border-black"
      style={{ boxShadow: '2px 2px 0 #000' }}
    >
      <div
        className="w-14 flex items-center justify-center text-white text-3xl font-black italic"
        style={{
          fontFamily: '"Times New Roman", Times, serif',
          backgroundImage:
            'radial-gradient(circle at 30% 30%, #6ab7ff 0%, #0a50b4 60%, #062f6a 100%)',
          textShadow: '1px 1px 0 #000, 0 0 6px #ffffffaa',
        }}
      >
        <span className="-mt-1">e</span>
      </div>
      <div className="px-3 py-1.5 font-sys text-[10px] leading-tight text-black flex flex-col justify-center">
        <div className="font-bold uppercase">This site works best in</div>
        <div className="font-black text-[13px] tracking-wide">Internet Explorer 5.5</div>
        <div className="italic text-[9px] text-[#404040]">800×600 · 16-bit color</div>
      </div>
    </div>
  )
}

function ConstructionBadge() {
  return (
    <div
      className="inline-flex items-center gap-2 bg-[#ffcc00] border-2 border-black px-3 py-1.5 font-sys text-[10px] text-black"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, #ffcc00 0 12px, #000 12px 16px, #ffcc00 16px 28px)',
        boxShadow: '2px 2px 0 #000',
      }}
    >
      <span className="bg-[#ffcc00] px-2 py-1 border border-black font-black uppercase tracking-wider">
        <span className="animate-blink">⚠</span> Under Construction
      </span>
    </div>
  )
}

function NetscapeBadge() {
  return (
    <div
      className="inline-flex items-stretch bg-[#c0c0c0] border-2 border-black"
      style={{ boxShadow: '2px 2px 0 #000' }}
    >
      <div
        className="w-14 flex items-center justify-center text-3xl"
        style={{
          backgroundImage:
            'linear-gradient(180deg, #2a2a2a 0%, #000 60%, #202050 100%)',
        }}
      >
        <span
          style={{
            backgroundImage:
              'radial-gradient(circle at 40% 35%, #ffffff 0%, #00ff66 30%, #003311 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 0 4px #00ff66)',
          }}
        >
          N
        </span>
      </div>
      <div className="px-3 py-1.5 font-sys text-[10px] leading-tight text-black flex flex-col justify-center">
        <div className="font-bold uppercase">Also optimized for</div>
        <div className="font-black text-[13px] tracking-wide">Netscape Navigator 4</div>
        <div className="italic text-[9px] text-[#404040]">56k modem friendly</div>
      </div>
    </div>
  )
}
