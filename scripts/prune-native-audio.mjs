import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'

// Native builds ship only advertisement audio. All catalogue audio is streamed
// from Internet Archive/RSS, so bundling it inflates the APK by hundreds of MB.
const root = path.resolve(import.meta.dirname, '..')
const audioDir = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'audio')

function sizeOf(target) {
  if (statSync(target).isFile()) return statSync(target).size
  return readdirSync(target).reduce((sum, entry) => sum + sizeOf(path.join(target, entry)), 0)
}

if (!existsSync(audioDir)) {
  process.stdout.write('Native audio directory not found — nothing to prune.\n')
  process.exit(0)
}

let kept = 0
let removed = 0
let freed = 0
for (const entry of readdirSync(audioDir)) {
  const target = path.join(audioDir, entry)
  if (entry.startsWith('ad-') && statSync(target).isFile()) {
    kept++
    continue
  }
  freed += sizeOf(target)
  rmSync(target, { recursive: true, force: true })
  removed++
}

process.stdout.write(
  `Native audio pruned: kept ${kept} advertisement file(s), removed ${removed} entr(ies), freed ${(freed / 1024 / 1024).toFixed(1)} MB.\n`
)
