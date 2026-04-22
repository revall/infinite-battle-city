import { useEffect, useRef, useState } from 'react'
import brickUrl from './assets/brick.svg'
import { navigate } from './App'

interface Entry {
  id: number
  name: string
  homepage: string | null
  location: string | null
  message: string
  created_at: number
}

const LIMITS = { name: 40, homepage: 200, location: 60, message: 800 } as const

const WINDOW_FRAME: React.CSSProperties = {
  boxShadow:
    'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #000000, inset 2px 2px 0 #dfdfdf, inset -2px -2px 0 #808080, 4px 4px 0 #000',
}

const INSET_FRAME: React.CSSProperties = {
  boxShadow:
    'inset 1px 1px 0 #000000, inset -1px -1px 0 #ffffff, inset 2px 2px 0 #808080, inset -2px -2px 0 #dfdfdf',
}

const BUTTON_FRAME: React.CSSProperties = {
  boxShadow:
    'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #000000, inset 2px 2px 0 #dfdfdf, inset -2px -2px 0 #808080',
}

const TITLEBAR: React.CSSProperties = {
  backgroundImage: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
}

export function GuestbookPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = () => {
    setLoadError(null)
    fetch('/api/guestbook')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as { entries: Entry[] }
      })
      .then((data) => setEntries(data.entries))
      .catch((err: Error) => setLoadError(err.message))
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleAdded = (entry: Entry) => {
    setEntries((prev) => [entry, ...(prev ?? [])])
  }

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
            GUESTBOOK
          </span>
          <span
            className="block mt-3 font-pixel-grid"
            style={{ ...chromeStyle, fontSize: '0.48em' }}
          >
            SIGN IT NOW!
          </span>
        </h1>
        <p className="mt-4 font-sys text-[13px] text-neutral-300 text-center max-w-xl">
          Leave your mark on the information superhighway.{' '}
          <span className="animate-blink text-yellow-300">★</span> ALL ENTRIES WELCOME{' '}
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
            <GbMarquee />
            <GbMarquee />
          </div>
        </div>
      </div>

      {/* Sign form window */}
      <main className="relative w-full max-w-4xl px-4 mt-6">
        <SignForm onAdded={handleAdded} />
      </main>

      {/* Entries list */}
      <section className="relative w-full max-w-4xl px-4 mt-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2
            className="font-pixel text-yellow-300"
            style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}
          >
            ★ SIGNATURES ★
          </h2>
          <span className="font-sys text-[12px] text-neutral-400">
            {entries === null
              ? 'loading…'
              : `${entries.length} visitor${entries.length === 1 ? '' : 's'} on record`}
          </span>
        </div>

        {loadError && (
          <div
            className="bg-[#c0c0c0] text-black p-3 font-sys text-[12px]"
            style={WINDOW_FRAME}
          >
            Could not load the guestbook ({loadError}).{' '}
            <button
              type="button"
              onClick={refresh}
              className="underline text-blue-900"
            >
              try again
            </button>
          </div>
        )}

        {entries && entries.length === 0 && !loadError && (
          <div
            className="bg-[#c0c0c0] text-black p-4 font-sys text-[13px] text-center"
            style={WINDOW_FRAME}
          >
            Nobody has signed yet. <span className="font-bold">Be the first!</span>
          </div>
        )}

        <ul className="space-y-5 pb-10">
          {(entries ?? []).map((e, idx) => (
            <EntryCard key={e.id} entry={e} index={idx} />
          ))}
        </ul>
      </section>

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
          · <span className="italic">thanks for signing!</span>
        </p>
      </footer>
    </div>
  )
}

function GbMarquee() {
  const items = [
    'welcome to the guestbook',
    'please sign below',
    'tell us where you are from',
    'no flaming allowed',
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

interface SignFormProps {
  onAdded: (entry: Entry) => void
}

function SignForm({ onAdded }: SignFormProps) {
  const [name, setName] = useState('')
  const [homepage, setHomepage] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSigned, setJustSigned] = useState(false)
  const nameRef = useRef<HTMLInputElement | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)

    const trimmedName = name.trim()
    const trimmedMessage = message.trim()
    if (!trimmedName) {
      setError('Please enter your name.')
      nameRef.current?.focus()
      return
    }
    if (!trimmedMessage) {
      setError('Please write a message.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          homepage: homepage.trim(),
          location: location.trim(),
          message: trimmedMessage,
        }),
      })
      const data = (await res.json().catch(() => null)) as
        | { entry: Entry }
        | { error: string }
        | null
      if (!res.ok || !data || 'error' in data) {
        const msg = data && 'error' in data ? data.error : `HTTP ${res.status}`
        setError(msg)
        return
      }
      onAdded(data.entry)
      setName('')
      setHomepage('')
      setLocation('')
      setMessage('')
      setJustSigned(true)
      setTimeout(() => setJustSigned(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[#c0c0c0] p-1 text-black" style={WINDOW_FRAME}>
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-1.5 py-1 text-white font-sys font-bold text-sm"
        style={TITLEBAR}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 bg-[#ff00ff] border border-black" />
          <span className="tracking-wide">GUESTBOOK.EXE - SIGN IN</span>
        </div>
        <div className="flex gap-1">
          {['_', '▢', '✕'].map((ch) => (
            <span
              key={ch}
              className="inline-flex items-center justify-center w-5 h-5 bg-[#c0c0c0] text-black text-xs leading-none font-bold"
              style={BUTTON_FRAME}
            >
              {ch}
            </span>
          ))}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="p-4 font-sys text-[13px] space-y-3"
      >
        <fieldset className="border-2 border-[#808080] px-3 pt-2 pb-3" style={{ borderStyle: 'groove' }}>
          <legend className="px-2 font-bold">Your Information</legend>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Name *"
              value={name}
              onChange={setName}
              placeholder="e.g. Cool Surfer 42"
              maxLength={LIMITS.name}
              inputRef={nameRef}
              autoFocus
            />
            <Field
              label="Location"
              value={location}
              onChange={setLocation}
              placeholder="e.g. Phoenix, AZ"
              maxLength={LIMITS.location}
            />
          </div>
          <div className="mt-3">
            <Field
              label="Homepage URL"
              value={homepage}
              onChange={setHomepage}
              placeholder="http://www.geocities.com/..."
              maxLength={LIMITS.homepage}
              type="url"
            />
          </div>
        </fieldset>

        <fieldset className="border-2 border-[#808080] px-3 pt-2 pb-3" style={{ borderStyle: 'groove' }}>
          <legend className="px-2 font-bold">Your Message *</legend>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, LIMITS.message))}
            maxLength={LIMITS.message}
            rows={5}
            placeholder="Say hi, share a cool site, or drop some ASCII art..."
            className="block w-full bg-white text-black font-sys text-[13px] p-2 outline-none resize-y"
            style={INSET_FRAME}
          />
          <div className="flex justify-between text-[11px] text-[#404040] mt-1">
            <span>No HTML. Be excellent to each other.</span>
            <span>
              {message.length} / {LIMITS.message}
            </span>
          </div>
        </fieldset>

        {error && (
          <div
            className="flex items-start gap-2 bg-[#fff8d0] text-black p-2 border border-[#808080] font-sys text-[12px]"
            role="alert"
          >
            <span className="font-black text-red-700">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {justSigned && !error && (
          <div
            className="flex items-start gap-2 bg-[#ccffcc] text-black p-2 border border-[#808080] font-sys text-[12px]"
            role="status"
          >
            <span className="font-black text-green-700 animate-blink">✓</span>
            <span>Thanks for signing the guestbook!</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-[#404040] italic">
            * required · messages are public
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="font-sys text-[13px] px-6 py-1 bg-[#c0c0c0] text-black disabled:text-[#808080]"
            style={BUTTON_FRAME}
          >
            {submitting ? 'Signing…' : <span><u>S</u>ign Guestbook</span>}
          </button>
        </div>
      </form>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  type?: string
  autoFocus?: boolean
  inputRef?: React.MutableRefObject<HTMLInputElement | null>
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = 'text',
  autoFocus,
  inputRef,
}: FieldProps) {
  return (
    <label className="block">
      <span className="block font-bold mb-1">{label}</span>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        className="block w-full bg-white text-black font-sys text-[13px] px-2 py-1 outline-none"
        style={INSET_FRAME}
      />
    </label>
  )
}

const ENTRY_ACCENTS = ['#ff00ff', '#00ffff', '#ffff00', '#ff8800', '#66ff66'] as const

function EntryCard({ entry, index }: { entry: Entry; index: number }) {
  const accent = ENTRY_ACCENTS[index % ENTRY_ACCENTS.length]
  return (
    <li className="bg-[#c0c0c0] p-1 text-black" style={WINDOW_FRAME}>
      <div
        className="flex items-center justify-between px-1.5 py-1 text-white font-sys font-bold text-sm"
        style={TITLEBAR}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block w-4 h-4 border border-black shrink-0"
            style={{ backgroundColor: accent }}
          />
          <span className="tracking-wide truncate">
            #{String(entry.id).padStart(4, '0')} — {entry.name.toUpperCase()}
          </span>
        </div>
        <span className="font-mono text-[11px] hidden sm:inline">
          {formatY2KDate(entry.created_at)}
        </span>
      </div>

      <div className="p-3 font-sys text-[13px] space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#202020]">
          <span>
            <span className="font-bold">From:</span> {entry.name}
          </span>
          {entry.location && (
            <span>
              <span className="font-bold">Location:</span> {entry.location}
            </span>
          )}
          {entry.homepage && (
            <span>
              <span className="font-bold">Homepage:</span>{' '}
              <a
                href={entry.homepage}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-blue-900 underline break-all"
              >
                {prettyUrl(entry.homepage)}
              </a>
            </span>
          )}
          <span className="sm:hidden">
            <span className="font-bold">Signed:</span>{' '}
            <span className="font-mono">{formatY2KDate(entry.created_at)}</span>
          </span>
        </div>

        <div
          className="bg-white p-2 font-sys text-[13px] whitespace-pre-wrap break-words"
          style={INSET_FRAME}
        >
          {entry.message}
        </div>
      </div>
    </li>
  )
}

function prettyUrl(u: string): string {
  try {
    const parsed = new URL(u)
    const base = parsed.host + parsed.pathname.replace(/\/$/, '')
    return base.length > 60 ? base.slice(0, 57) + '...' : base
  } catch {
    return u
  }
}

function formatY2KDate(ms: number): string {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd}/${yyyy} ${hh}:${mi}`
}
