import type { Direction } from '@battle-city/shared'

export interface InputState {
  moveDir: Direction | null
  shoot: boolean
}

const KEY_MAP: Record<string, keyof InputState | 'dir'> = {
  ArrowUp: 'dir', ArrowDown: 'dir', ArrowLeft: 'dir', ArrowRight: 'dir',
  KeyW: 'dir', KeyS: 'dir', KeyA: 'dir', KeyD: 'dir',
  Space: 'shoot',
}

const KEY_DIR: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
}

export interface InputHandler {
  getInput: () => InputState
  attach: () => () => void
  /** Inject a key-down (used by touch controls to reuse the same held set). */
  press: (code: string) => void
  release: (code: string) => void
}

export function createInputHandler(): InputHandler {
  const held = new Set<string>()

  const onKeyDown = (e: KeyboardEvent) => { held.add(e.code); if (KEY_MAP[e.code]) e.preventDefault() }
  const onKeyUp = (e: KeyboardEvent) => held.delete(e.code)

  const getInput = (): InputState => {
    let moveDir: Direction | null = null
    for (const code of held) {
      const dir = KEY_DIR[code]
      if (dir) { moveDir = dir; break }
    }
    return { moveDir, shoot: held.has('Space') }
  }

  const attach = () => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }

  return {
    getInput,
    attach,
    press: (code) => held.add(code),
    release: (code) => held.delete(code),
  }
}
