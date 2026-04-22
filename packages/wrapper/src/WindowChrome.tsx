import { useEffect, useState } from 'react'

const BUTTON_FRAME: React.CSSProperties = {
  boxShadow: 'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #404040',
}

const BUTTON_ACTIVE: React.CSSProperties = {
  boxShadow: 'inset 1px 1px 0 #404040, inset -1px -1px 0 #ffffff',
}

const OUTER_FRAME: React.CSSProperties = {
  boxShadow:
    'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #000000, inset 2px 2px 0 #dfdfdf, inset -2px -2px 0 #808080, 4px 4px 0 #000',
}

const TITLEBAR: React.CSSProperties = {
  backgroundImage: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
}

const CONTROLS: { ch: string; label: string }[] = [
  { ch: '_', label: 'Minimize' },
  { ch: '▢', label: 'Maximize' },
  { ch: '✕', label: 'Close' },
]

export function WindowControls({ onAction }: { onAction: (label: string) => void }) {
  return (
    <div className="flex gap-1">
      {CONTROLS.map((b) => (
        <button
          key={b.ch}
          type="button"
          aria-label={b.label}
          onClick={() => onAction(b.label)}
          className="inline-flex items-center justify-center w-5 h-5 bg-[#c0c0c0] text-black text-xs leading-none font-bold cursor-pointer active:[&]:shadow-[inset_1px_1px_0_#404040,inset_-1px_-1px_0_#ffffff]"
          style={BUTTON_FRAME}
          onMouseDown={(e) => {
            ;(e.currentTarget as HTMLElement).style.boxShadow = BUTTON_ACTIVE.boxShadow as string
          }}
          onMouseUp={(e) => {
            ;(e.currentTarget as HTMLElement).style.boxShadow = BUTTON_FRAME.boxShadow as string
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.boxShadow = BUTTON_FRAME.boxShadow as string
          }}
        >
          {b.ch}
        </button>
      ))}
    </div>
  )
}

interface NotImplementedDialogProps {
  action: string | null
  onClose: () => void
}

export function NotImplementedDialog({ action, onClose }: NotImplementedDialogProps) {
  const open = action !== null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notimpl-title"
        className="w-[min(420px,100%)] bg-[#c0c0c0] p-1 text-black"
        style={OUTER_FRAME}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          id="notimpl-title"
          className="flex items-center justify-between px-1.5 py-1 text-white font-sys font-bold text-sm"
          style={TITLEBAR}
        >
          <span className="tracking-wide">ERROR</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-5 h-5 bg-[#c0c0c0] text-black text-xs leading-none font-bold"
            style={BUTTON_FRAME}
          >
            ✕
          </button>
        </div>

        <div className="flex gap-4 items-start p-4 font-sys text-[13px] leading-snug">
          <div
            aria-hidden="true"
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-2xl"
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              backgroundImage:
                'radial-gradient(circle at 30% 30%, #ffd48a 0%, #cc6600 55%, #4a1c00 100%)',
              textShadow: '1px 1px 0 #000',
            }}
          >
            !
          </div>
          <div className="space-y-2">
            <p className="font-bold">Not so fast!</p>
            <p>
              We are not so advanced for <span className="font-bold">{action}</span> functionality
              yet.
            </p>
            <p className="text-[11px] text-[#404040] italic">
              Please try again in the year 2000.
            </p>
          </div>
        </div>

        <div
          className="flex justify-end gap-2 px-4 pb-4 pt-1"
          style={{ borderTop: '1px solid #808080' }}
        >
          <button
            type="button"
            onClick={onClose}
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

export function useNotImplemented() {
  const [action, setAction] = useState<string | null>(null)
  return {
    trigger: (label: string) => setAction(label),
    close: () => setAction(null),
    action,
  }
}
