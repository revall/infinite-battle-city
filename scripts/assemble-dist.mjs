#!/usr/bin/env node
// Merge packages/wrapper/dist and packages/client/dist into a single repo-root dist/
// layout: wrapper at /, client at /play
import { cp, rm, mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'dist')
const wrapperDist = path.join(root, 'packages/wrapper/dist')
const clientDist = path.join(root, 'packages/client/dist')

async function exists(p) {
  try { await stat(p); return true } catch { return false }
}

if (!(await exists(wrapperDist))) throw new Error(`missing ${wrapperDist} — run wrapper build first`)
if (!(await exists(clientDist))) throw new Error(`missing ${clientDist} — run client build first`)

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

await cp(wrapperDist, out, { recursive: true })
await cp(clientDist, path.join(out, 'play'), { recursive: true })

console.log(`assembled dist/ — wrapper at /, client at /play`)
