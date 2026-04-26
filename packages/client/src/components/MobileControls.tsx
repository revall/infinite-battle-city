import { useEffect, useState } from 'react'

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

interface BtnProps {
  code: string
  press: (code: string) => void
  release: (code: string) => void
  style: React.CSSProperties
  children: React.ReactNode
}

function Btn({ code, press, release, style, children }: BtnProps) {
  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    press(code)
  }
  const up = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    release(code)
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

interface Props {
  press: (code: string) => void
  release: (code: string) => void
}

export default function MobileControls({ press, release }: Props) {
  const isTouch = useTouchDevice()
  if (!isTouch) return null

  const btn: React.CSSProperties = {
    width: 64, height: 64,
    background: 'rgba(255,255,255,0.12)',
    border: '2px solid rgba(255,255,255,0.35)',
    color: 'white', fontSize: 26,
    touchAction: 'none', userSelect: 'none',
    WebkitUserSelect: 'none', cursor: 'pointer',
  }

  const fireBtn: React.CSSProperties = {
    ...btn, width: 96, height: 96, borderRadius: '50%',
    background: 'rgba(245,60,60,0.25)',
    borderColor: 'rgba(245,60,60,0.65)',
    fontSize: 15, fontWeight: 700, letterSpacing: '0.12em',
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 24px 18px',
      background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
      pointerEvents: 'none',
    }}>
      {/* D-pad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 64px)',
        gridTemplateRows: 'repeat(3, 64px)',
        gap: 4,
        pointerEvents: 'auto',
      }}>
        <span />
        <Btn code="ArrowUp"    press={press} release={release} style={btn}>▲</Btn>
        <span />
        <Btn code="ArrowLeft"  press={press} release={release} style={btn}>◀</Btn>
        <span />
        <Btn code="ArrowRight" press={press} release={release} style={btn}>▶</Btn>
        <span />
        <Btn code="ArrowDown"  press={press} release={release} style={btn}>▼</Btn>
        <span />
      </div>

      {/* Fire */}
      <div style={{ pointerEvents: 'auto' }}>
        <Btn code="Space" press={press} release={release} style={fireBtn}>FIRE</Btn>
      </div>
    </div>
  )
}
