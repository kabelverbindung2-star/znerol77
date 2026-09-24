// Runs the Windows-only parts (PowerShell + C# helper, autostart script) for real on a
// Windows machine. Used by CI before a release is published.
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function loadModule(rel, names) {
  const src = readFileSync(new URL(rel, import.meta.url), 'utf8')
  const mod = { exports: {} }
  new Function('module', src.replace(/export const/g, 'const') + `;module.exports={${names.join(',')}};`)(mod)
  return mod.exports
}

const { HELPER_SCRIPT } = loadModule('../src/main/modules/helper-script.ts', ['HELPER_SCRIPT'])
const { AUTOSTART_LIST_SCRIPT } = loadModule('../src/main/modules/ps-scripts.ts', ['AUTOSTART_LIST_SCRIPT'])

const dir = tmpdir()
const script = join(dir, 'znerol-helper-test.ps1')
const dll = join(dir, 'znerol-helper-test.dll')
writeFileSync(script, HELPER_SCRIPT, 'utf8')
if (existsSync(dll)) rmSync(dll)

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function startHelper() {
  const ps = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-CacheDll', dll])
  const h = { ps, buf: '', stderr: '', replies: new Map(), ready: false, id: 0 }
  ps.stdout.setEncoding('utf8')
  ps.stdout.on('data', (d) => {
    h.buf += d
    let i
    while ((i = h.buf.indexOf('\n')) >= 0) {
      const line = h.buf.slice(0, i).trim()
      h.buf = h.buf.slice(i + 1)
      if (!line.startsWith('{')) continue
      const msg = JSON.parse(line)
      if (msg.ready) h.ready = true
      else h.replies.set(msg.id, msg)
    }
  })
  ps.stderr.on('data', (d) => (h.stderr += d))
  return h
}

async function until(h, cond, ms, what) {
  const end = Date.now() + ms
  while (!cond()) {
    if (Date.now() > end) throw new Error(`Timeout: ${what}\n${h.stderr}`)
    await wait(50)
  }
}

async function ask(h, cmd, args = {}) {
  const n = ++h.id
  h.ps.stdin.write(JSON.stringify({ id: n, cmd, ...args }) + '\n')
  await until(h, () => h.replies.has(n), 30000, cmd)
  return h.replies.get(n)
}

function runEncoded(ps1) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(ps1, 'utf16le').toString('base64')
    const p = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded])
    let out = ''
    let err = ''
    p.stdout.setEncoding('utf8')
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (err += d))
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(err || `exit ${code}`))))
  })
}

try {
  // 1) first start: compiles the C# and stores the DLL
  let t0 = Date.now()
  let h = startHelper()
  await until(h, () => h.ready, 90000, 'helper ready (first start)')
  console.log(`ready (first start, compiled) in ${Date.now() - t0} ms, dll cached: ${existsSync(dll)}`)

  const ping = await ask(h, 'ping')
  if (!ping.ok || ping.data !== 'pong') throw new Error('ping failed: ' + JSON.stringify(ping))
  console.log('ping ok')

  // CI runners have no sound card: these may fail, but must answer as JSON
  for (const cmd of ['devices', 'master', 'sessions', 'media']) {
    const r = await ask(h, cmd)
    console.log(cmd, r.ok ? 'ok' : 'error (expected without audio hardware)', JSON.stringify(r.ok ? r.data : r.error).slice(0, 160))
  }

  // system data for the tiles (these replaced WMI/systeminformation, which hung on some PCs)
  const net = await ask(h, 'net')
  console.log('net', JSON.stringify(net).slice(0, 200))
  if (!net.ok || typeof net.data.rx !== 'number') throw new Error('net failed')
  const drives = await ask(h, 'drives')
  console.log('drives', JSON.stringify(drives).slice(0, 200))
  if (!drives.ok || !Array.isArray(drives.data) || drives.data.length === 0) throw new Error('drives failed')
  await ask(h, 'processes')
  await wait(500)
  const t1 = Date.now()
  const procs = await ask(h, 'processes')
  console.log(`processes: ${procs.ok ? procs.data.length : 'ERR'} in ${Date.now() - t1} ms`, JSON.stringify(procs.ok ? procs.data.slice(0, 2) : procs.error).slice(0, 200))
  if (!procs.ok || procs.data.length < 10) throw new Error('processes failed')
  const gpu = await ask(h, 'gpu')
  console.log('gpu (no GPU counters on the runner is fine)', JSON.stringify(gpu).slice(0, 200))

  // rest mode helpers: minimise/restore (the runner has no app windows) and the power mode
  const mini = await ask(h, 'minimizeOthers', { pid: process.pid })
  const back = await ask(h, 'restoreMinimized')
  const mode = await ask(h, 'powerMode')
  console.log('minimizeOthers', JSON.stringify(mini), 'restoreMinimized', JSON.stringify(back), 'powerMode', JSON.stringify(mode))
  if (!mini.ok || !back.ok || !mode.ok) throw new Error('rest mode commands failed')

  // 2) the 500 clicks/s clicker thread: start, count, stop
  const start = await ask(h, 'clickStart', { button: 'left', double: false, move: false, x: 0, y: 0, interval: 2, jitter: 0, limit: 0 })
  if (!start.ok) throw new Error('clickStart failed: ' + JSON.stringify(start))
  await wait(1000)
  const status = await ask(h, 'clickStatus')
  await ask(h, 'clickStop')
  const after = await ask(h, 'clickStatus')
  console.log(`clicker: ${status.data.clicks} clicks in ~1 s at 2 ms interval, running after stop: ${after.data.running}`)
  if (!status.ok || status.data.clicks < 250) throw new Error('clicker too slow: ' + JSON.stringify(status))
  if (after.data.running) throw new Error('clicker did not stop')

  const limited = await ask(h, 'clickStart', { button: 'left', double: false, move: false, x: 0, y: 0, interval: 5, jitter: 0, limit: 20 })
  if (!limited.ok) throw new Error('clickStart (limit) failed')
  await wait(600)
  const lim = await ask(h, 'clickStatus')
  console.log(`clicker with limit 20: ${lim.data.clicks} clicks, running: ${lim.data.running}`)
  if (lim.data.clicks !== 20 || lim.data.running) throw new Error('click limit not respected: ' + JSON.stringify(lim.data))

  const bad = await ask(h, 'nope')
  if (bad.ok) throw new Error('unknown command should fail')
  h.ps.kill()
  await wait(500)

  // 3) second start: must load the cached DLL (fast)
  t0 = Date.now()
  h = startHelper()
  await until(h, () => h.ready, 60000, 'helper ready (cached)')
  const second = Date.now() - t0
  const ping2 = await ask(h, 'ping')
  console.log(`ready (second start, cached DLL) in ${second} ms, ping ${ping2.ok ? 'ok' : 'FAILED'}`)
  if (!ping2.ok) throw new Error('cached helper does not answer')
  h.ps.kill()

  // 4) autostart listing script (the same text the app runs)
  const out = await runEncoded(AUTOSTART_LIST_SCRIPT)
  const list = out.trim() ? JSON.parse(out) : []
  const arr = Array.isArray(list) ? list : [list]
  console.log(`autostart: ${arr.length} entries`, JSON.stringify(arr.slice(0, 3)).slice(0, 300))

  console.log('windows test passed')
  process.exit(0)
} catch (e) {
  console.error(String(e))
  process.exit(1)
}
