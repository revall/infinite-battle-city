import { useEffect, useState } from 'react'
import brickUrl from './assets/brick.svg'
import qrUrl from './assets/qrcode.png'
import { navigate } from './App'
import { NotImplementedDialog, WindowControls, useNotImplemented } from './WindowChrome'

const WINDOW_FRAME: React.CSSProperties = {
  boxShadow:
    'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #000000, inset 2px 2px 0 #dfdfdf, inset -2px -2px 0 #808080, 4px 4px 0 #000',
}

const INSET_FRAME: React.CSSProperties = {
  boxShadow:
    'inset 1px 1px 0 #000000, inset -1px -1px 0 #ffffff, inset 2px 2px 0 #808080, inset -2px -2px 0 #dfdfdf',
}

const TITLEBAR: React.CSSProperties = {
  backgroundImage: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
}

export function QRPage() {
  const notImpl = useNotImplemented()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
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

  const dots = '.'.repeat((tick % 4) + 1).padEnd(4, ' ')

  return (
    <div className="min-h-full bg-black text-white flex flex-col items-center">
      <NotImplementedDialog action={notImpl.action} onClose={notImpl.close} />

      {/* Starfield scanline */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)',
        }}
      />

      {/* Header */}
      <header className="relative w-full flex flex-col items-center pt-10 pb-6 px-4">
        <h1
          className="font-pixel text-center leading-[0.95]"
          style={{ fontSize: 'clamp(44px, 8vw, 112px)' }}
        >
          <span className="block" style={brickStyle}>
            SCAN ME
          </span>
          <span
            className="block mt-3 font-pixel-grid"
            style={{ ...chromeStyle, fontSize: '0.48em' }}
          >
            BEAM IN!
          </span>
        </h1>
        <p className="mt-4 font-sys text-[13px] text-neutral-300 text-center max-w-xl">
          Point your WAP-enabled cellular device at the code below.{' '}
          <span className="animate-blink text-yellow-300">★</span> NO DOWNLOAD REQUIRED{' '}
          <span className="animate-blink text-yellow-300">★</span>
        </p>
      </header>

      {/* Marquee */}
      <div className="relative w-full max-w-4xl px-4">
        <div className="border-y-4 border-double border-yellow-300 bg-[#000080] overflow-hidden">
          <div
            className="animate-marquee whitespace-nowrap font-pixel text-yellow-300 py-2"
            style={{ fontSize: 'clamp(16px, 2vw, 24px)' }}
          >
            <QrMarquee />
            <QrMarquee />
          </div>
        </div>
      </div>

      {/* QR window */}
      <main className="relative w-full max-w-xl px-4 mt-6">
        <div className="bg-[#c0c0c0] p-1 text-black" style={WINDOW_FRAME}>
          {/* Title bar */}
          <div
            className="flex items-center justify-between px-1.5 py-1 text-white font-sys font-bold text-sm"
            style={TITLEBAR}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 bg-[#00ffff] border border-black" />
              <span className="tracking-wide">QRCODE.EXE - MOBILE PORTAL</span>
            </div>
            <WindowControls onAction={notImpl.trigger} />
          </div>

          {/* Menu bar */}
          <div className="flex gap-3 px-2 py-0.5 bg-[#c0c0c0] text-black font-sys text-xs border-b border-[#808080]">
            {['File', 'Scan', 'View', 'Help'].map((m, i) => (
              <span key={m}>
                <u>{m[0]}</u>
                {m.slice(1)}
                {i === 1 && (
                  <span className="animate-blink ml-1 text-red-600">● READY</span>
                )}
              </span>
            ))}
          </div>

          <div className="p-4 flex flex-col items-center gap-4">
            <div className="w-full font-sys text-[12px] text-[#202020] text-center">
              TRANSMITTING IMAGE FROM SERVER{dots}
            </div>

            {/* QR pit */}
            <div
              className="bg-black p-3"
              style={INSET_FRAME}
            >
              <div className="bg-white p-3" style={{ boxShadow: '0 0 0 2px #000' }}>
                <img
                  src={qrUrl}
                  alt="QR code linking to the Battle City Infinite arcade"
                  width={320}
                  height={320}
                  className="block w-[min(320px,72vw)] h-auto"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>

            {/* Info box */}
            <div
              className="w-full bg-white p-3 font-sys text-[12px] text-black"
              style={INSET_FRAME}
            >
              <p className="font-bold mb-1">HOW TO USE</p>
              <ol className="list-decimal pl-5 space-y-0.5">
                <li>Hold your digital camera steady</li>
                <li>Aim at the square picture above</li>
                <li>Follow the magic hyperlink</li>
              </ol>
              <p className="mt-2 text-[11px] italic text-[#404040]">
                Compatible with any device manufactured after 2007.
              </p>
            </div>
          </div>

          {/* Status bar */}
          <div
            className="flex justify-between items-center px-2 py-0.5 bg-[#c0c0c0] text-black font-sys text-[11px] mt-1"
            style={{ boxShadow: 'inset 1px 1px 0 #808080, inset -1px -1px 0 #ffffff' }}
          >
            <span>Status: SIGNAL LOCKED · 2D BARCODE READY</span>
            <span className="font-mono bg-black text-[#00ff00] px-1 border border-[#00ff00]">
              {new Date().toISOString().slice(0, 10)}
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative font-sys text-[11px] text-neutral-400 py-8 text-center px-4">
        <p>
          <a
            href="/"
            onClick={(ev) => {
              ev.preventDefault()
              navigate('/')
            }}
            className="text-[#00ffff] underline hover:text-yellow-300"
          >
            ← back to arcade
          </a>{' '}
          · <span className="italic">best viewed on a 56k modem</span>
        </p>
      </footer>
    </div>
  )
}

function QrMarquee() {
  const items = [
    'scan with your wap phone',
    '2d barcode technology',
    'hyperlink yourself in!',
    'no thumbs required',
  ]
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
