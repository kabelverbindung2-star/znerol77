// Runs the Windows helper (PowerShell + C#) for real on a Windows machine and checks
// that it compiles, starts and answers. Used by CI before a release is published.
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const src = readFileSync(new URL('../src/main/modules/helper-script.ts', import.meta.url), 'utf8')
const mod = { exports: {} }
new Function('module', src.replace(/export const/g, 'const') + ';module.exports={HELPER_SCRIPT};')(mod)
const file = join(tmpdir(), 'znerol-helper-test.ps1')
writeFileSync(file, mod.exports.HELPER_SCRIPT, 'utf8')

const ps = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file])
let buf = ''
let stderr = ''
const replies = new Map()
let ready = false
ps.stdout.setEncoding('utf8')
ps.stdout.on('data', (d) => {
  buf += d
  let i
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim()
    buf = buf.slice(i + 1)
    if (!line.startsWith('{')) continue
    const msg = JSON.parse(line)
    if (msg.ready) ready = true
    else replies.set(msg.id, msg)
  }
})
ps.stderr.on('data', (d) => (stderr += d))

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function until(cond, ms, what) {
  const end = Date.now() + ms
  while (!cond()) {
    if (Date.now() > end) throw new Error(`Timeout: ${what}\n${stderr}`)
    await wait(100)
  }
}

let id = 0
async function ask(cmd, args = {}) {
  const n = ++id
  ps.stdin.write(JSON.stringify({ id: n, cmd, ...args }) + '\n')
  await until(() => replies.has(n), 30000, cmd)
  return replies.get(n)
}

try {
  await until(() => ready, 60000, 'helper ready')
  console.log('ready')
  const ping = await ask('ping')
  if (!ping.ok || ping.data !== 'pong') throw new Error('ping failed: ' + JSON.stringify(ping))
  console.log('ping ok')
  // CI runners usually have no sound card: these may legitimately fail, but must answer as JSON
  for (const cmd of ['devices', 'master', 'sessions', 'media']) {
    const r = await ask(cmd)
    console.log(cmd, r.ok ? 'ok' : 'error (expected without audio hardware)', JSON.stringify(r.ok ? r.data : r.error).slice(0, 160))
  }
  const bad = await ask('nope')
  if (bad.ok) throw new Error('unknown command should fail')
  console.log('helper test passed')
  ps.kill()
  process.exit(0)
} catch (e) {
  console.error(String(e))
  ps.kill()
  process.exit(1)
}
