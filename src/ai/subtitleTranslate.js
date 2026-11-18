// Subtitle translation — reuses the free-first provider pipeline (Lumina Bot).
// Timings are never touched: only cue text is translated, one batch per call so
// long tracks stay inside token budgets. Always labelled "machine" so listeners
// (and editors) know a human has not reviewed it.

import { loadKeys } from './providers'
import { runPipeline } from './pipeline'
import { parseSubtitle } from '../data/subtitles'

const BATCH = 25

function prompt(targetLabel, targetCode, cues) {
  return [
    {
      role: 'system',
      content:
        'You are a professional subtitle translator. Translate each numbered subtitle line into ' +
        `${targetLabel} (${targetCode}). Preserve meaning, tone and religious terminology accuracy. ` +
        'Return ONLY the translations, one per line, prefixed with the same number and a pipe, e.g. "1| translated text". ' +
        'Never merge, split, add or drop lines.'
    },
    {
      role: 'user',
      content: cues.map((c, i) => `${i + 1}| ${c.text.replace(/\n/g, ' ')}`).join('\n')
    }
  ]
}

function parseNumbered(text, count) {
  const out = new Array(count).fill('')
  for (const line of String(text || '').split('\n')) {
    const m = line.match(/^\s*(\d+)\s*[|.\-)\]]\s*(.+)$/)
    if (!m) continue
    const i = Number(m[1]) - 1
    if (i >= 0 && i < count) out[i] = m[2].trim()
  }
  return out
}

// Returns { cues, provider, translated, failed } — cues keep their original timings.
export async function translateCues(cues, targetCode, targetLabel, signal) {
  if (!cues?.length) return { cues: [], translated: 0, failed: 0, provider: null }
  const keys = loadKeys()
  const out = []
  let translated = 0
  let failed = 0
  let provider = null
  for (let i = 0; i < cues.length; i += BATCH) {
    const slice = cues.slice(i, i + BATCH)
    const res = await runPipeline(prompt(targetLabel, targetCode, slice), keys, signal)
    if (res?.text) {
      provider = provider || res.provider
      const lines = parseNumbered(res.text, slice.length)
      slice.forEach((c, j) => {
        const t = lines[j]
        if (t) {
          out.push({ ...c, text: t })
          translated += 1
        } else {
          out.push(c) // keep the original rather than dropping the cue
          failed += 1
        }
      })
    } else {
      failed += slice.length
      out.push(...slice)
    }
  }
  return { cues: out, translated, failed, provider }
}

// Convenience: translate a raw SRT/VTT document and return a new SRT string.
export async function translateDocument(text, targetCode, targetLabel, signal) {
  const cues = parseSubtitle(text)
  const res = await translateCues(cues, targetCode, targetLabel, signal)
  return res
}
