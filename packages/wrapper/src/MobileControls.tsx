import { useEffect, useState, type RefObject } from 'react'

interface Props {
  iframeRef: RefObject<HTMLIFrameElement | null>
}

function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)')
    setIsTouch(mq.matches)
    const h = (e: MediaQueryListEvent) => setIsTouch(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return isTouch
}

function Btn({
  code, send, style, children,
}: {
  code: string
  send: (type: 'input-press' | 'input-release', code: string) => void
  style: React.CSSProperties
  children: React.ReactNode
}) {
  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    send('input-press', code)
  }
  const up = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    send('input-release', code)
  }
  return (
    <button
      style={style}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

export default function MobileControls({ iframeRef }: Props) {
  const isTouch = useTouchDevice()
  if (!isTouch) return null

  const send = (type: 'input-press' | 'input-release', code: string) => {
    iframeRef.current?.contentWindow?.postMessage({ type, code }, '*')
  }

  const btn: React.CSSProperties = {
    width: 64, height: 64,
    background: 'rgba(255,255,255,0.14)',
    border: '2px solid rgba(255,255,255,0.4)',
    color: 'white',
    fontSize: 28,
    fontFamily: 'inherit',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    cursor: 'pointer',
  }

  const fireBtn: React.CSSProperties = {
    ...btn,
    width: 104, height: 104,
    borderRadius: '50%',
    background: 'rgba(245,60,60,0.28)',
    borderColor: 'rgba(245,60,60,0.7)',
    fontSize: 18,
    letterSpacing: '0.15em',
    fontWeight: 700,
  }

  // D-pad is a 3×3 grid with buttons in the + pattern; fire sits to the right.
  // The wrapper is a normal flow block so it sits between the iframe and the badges row.
  return (
    <section
      className="w-full max-w-6xl px-4 mt-6 flex items-center justify-between gap-6"
      aria-label="Touch controls"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 64px)',
          gridTemplateRows: 'repeat(3, 64px)',
          gap: 6,
        }}
      >
        <span />
        <Btn code="ArrowUp"    send={send} style={btn}>▲</Btn>
        <span />
        <Btn code="ArrowLeft"  send={send} style={btn}>◀</Btn>
        <span />
        <Btn code="ArrowRight" send={send} style={btn}>▶</Btn>
        <span />
        <Btn code="ArrowDown"  send={send} style={btn}>▼</Btn>
        <span />
      </div>

      <Btn code="Space" send={send} style={fireBtn}>FIRE</Btn>
    </section>
  )
}
