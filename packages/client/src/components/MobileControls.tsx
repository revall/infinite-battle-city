import { useEffect, useState } from 'react'

export function useTouchDevice(): boolean {
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
  center?: React.ReactNode
}

// D-pad arm button — part of the cross shape
const ARM: React.CSSProperties = {
  background: '#2e2e2e',
  border: 'none',
  color: '#ccc',
  fontSize: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  cursor: 'pointer',
  // inset shadow gives a "physical button" feel
  boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
}

const ARM_W = 44   // width of each arm
const ARM_H = 44   // height of each arm
const CROSS_CENTER = ARM_W // center square size = arm width

export default function MobileControls({ press, release, center }: Props) {
  const isTouch = useTouchDevice()
  if (!isTouch) return null

  const fireBtn: React.CSSProperties = {
    width: 72, height: 72,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 30%, #e84040, #8b0000)',
    border: '3px solid #5a0000',
    boxShadow: '0 4px 0 #3a0000, 0 6px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,150,150,0.3)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    fontFamily: "'Geist Pixel Square', ui-monospace, monospace",
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div style={{
      background: '#141414',
      borderTop: '2px solid #333',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '14px 24px 18px',
      // safe-area inset for devices with home bar
      paddingBottom: 'max(18px, env(safe-area-inset-bottom))',
      flexShrink: 0,
    }}>

      {/* D-pad — cross shape built from a 3×3 CSS grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `${ARM_W}px ${CROSS_CENTER}px ${ARM_W}px`,
        gridTemplateRows: `${ARM_H}px ${CROSS_CENTER}px ${ARM_H}px`,
        // outer rounded rect behind the cross
        borderRadius: 6,
        overflow: 'hidden',
        background: '#1e1e1e',
        boxShadow: '0 4px 8px rgba(0,0,0,0.6)',
      }}>
        {/* row 1 */}
        <span style={{ background: '#1e1e1e' }} />
        <Btn code="ArrowUp" press={press} release={release}
          style={{ ...ARM, borderRadius: '6px 6px 0 0' }}>▲</Btn>
        <span style={{ background: '#1e1e1e' }} />

        {/* row 2 */}
        <Btn code="ArrowLeft" press={press} release={release}
          style={{ ...ARM, borderRadius: '6px 0 0 6px' }}>◀</Btn>
        {/* center nub */}
        <span style={{
          background: '#252525',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            width: 12, height: 12, borderRadius: '50%',
            background: '#1a1a1a',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
          }} />
        </span>
        <Btn code="ArrowRight" press={press} release={release}
          style={{ ...ARM, borderRadius: '0 6px 6px 0' }}>▶</Btn>

        {/* row 3 */}
        <span style={{ background: '#1e1e1e' }} />
        <Btn code="ArrowDown" press={press} release={release}
          style={{ ...ARM, borderRadius: '0 0 6px 6px' }}>▼</Btn>
        <span style={{ background: '#1e1e1e' }} />
      </div>

      {/* Center slot — START/SELECT area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}>
        {center}
      </div>

      {/* FIRE button */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        color: '#444',
        fontSize: 10,
        fontFamily: "'Geist Pixel Square', ui-monospace, monospace",
        letterSpacing: '0.1em',
      }}>
        <Btn code="Space" press={press} release={release} style={fireBtn}>FIRE</Btn>
        <span>A</span>
      </div>

    </div>
  )
}
