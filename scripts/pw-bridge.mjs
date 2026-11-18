#!/usr/bin/env node
// Lumina Voice · PipeWire status bridge
// Tiny local HTTP server that reports whether station audio is actually
// playing through the system sound server. The browser cannot talk to
// PipeWire directly, so the studio polls this instead:
//
//   node scripts/pw-bridge.mjs        # serves http://localhost:4311/pipewire
//
// Response:
//   { "available": true, "playing": true, "volume": 0.72, "muted": false, "sink": "alsa_output.pci-0000.00.1f.3.analog-stereo" }
//   { "available": false, "error": "…" }   (PipeWire not reachable)
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'

const PORT = Number(process.env.PW_BRIDGE_PORT || 4311)
const POLL_MS = 2000
const cache = { data: null, at: 0 }

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 1500, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) =>
      err ? reject(err) : resolve(stdout)
    )
  })
}

async function probe() {
  // Volume + mute from wpctl (fast, stable output format).
  let volume = 0
  let muted = false
  const volOut = await run('wpctl', ['get-volume', '@DEFAULT_AUDIO_SINK@'])
  const m = volOut.match(/Volume:\s*([0-9.]+)/)
  if (m) volume = Number(m[1])
  muted = /\[MUTED\]/i.test(volOut)

  // Playing + sink name from pw-dump: any running audio output stream.
  let playing = false
  let sink = ''
  const dump = JSON.parse(await run('pw-dump', []))
  for (const node of dump) {
    if (node?.type !== 'PipeWire:Interface:Node' || !node.info) continue
    const props = node.info.props || {}
    if (props['media.class'] === 'Stream/Output/Audio' && props.state === 'running') playing = true
    if (props['media.class'] === 'Audio/Sink' && !sink) sink = props['node.name'] || ''
  }
  return { available: true, playing, volume, muted, sink }
}

async function status() {
  if (cache.data && Date.now() - cache.at < POLL_MS) return cache.data
  try {
    cache.data = await probe()
  } catch (e) {
    cache.data = { available: false, error: String(e.message || e) }
  }
  cache.at = Date.now()
  return cache.data
}

createServer(async (req, res) => {
  if ((req.url || '').startsWith('/pipewire')) {
    const body = JSON.stringify(await status())
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    })
    res.end(body)
  } else {
    res.writeHead(404)
    res.end('Lumina PipeWire bridge · try GET /pipewire')
  }
}).listen(PORT, () => {
  console.log(`Lumina PipeWire bridge · http://localhost:${PORT}/pipewire (polling every ${POLL_MS}ms)`)
})
