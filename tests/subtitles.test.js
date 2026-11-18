import { beforeAll, describe, expect, it } from 'vitest'
import { autoTrackFor, cueAt, langMeta, parseSubtitle, parseTimecode, removeTrack, saveTrack, toSrt, SUBTITLE_LANGS } from '../src/data/subtitles.js'
import { summarise } from '../src/data/ratings.js'

describe('subtitle languages', () => {
  it('ships Arabic, English and Urdu with the right text direction', () => {
    const codes = SUBTITLE_LANGS.map((l) => l.code)
    expect(codes).toEqual(expect.arrayContaining(['ar', 'en', 'ur']))
    expect(langMeta('ar').dir).toBe('rtl')
    expect(langMeta('ur').dir).toBe('rtl')
    expect(langMeta('en').dir).toBe('ltr')
  })

  it('falls back gracefully for an unregistered language', () => {
    const meta = langMeta('fr')
    expect(meta.code).toBe('fr')
    expect(meta.dir).toBe('ltr')
  })
})

describe('parseTimecode', () => {
  it('reads SRT comma and VTT dot forms', () => {
    expect(parseTimecode('00:01:02,500')).toBeCloseTo(62.5, 3)
    expect(parseTimecode('00:01:02.500')).toBeCloseTo(62.5, 3)
  })

  it('accepts an hour-less VTT stamp', () => {
    expect(parseTimecode('01:02.250')).toBeCloseTo(62.25, 3)
  })

  it('handles long durations past an hour', () => {
    expect(parseTimecode('02:30:00,000')).toBe(9000)
  })

  it('rejects malformed input', () => {
    expect(parseTimecode('not a time')).toBeNull()
    expect(parseTimecode('')).toBeNull()
    expect(parseTimecode(undefined)).toBeNull()
  })
})

describe('parseSubtitle', () => {
  const SRT = `1
00:00:01,000 --> 00:00:04,000
First line

2
00:00:05,500 --> 00:00:08,000
<i>Second</i> line
still second`

  it('parses an SRT document into cues', () => {
    const cues = parseSubtitle(SRT)
    expect(cues).toHaveLength(2)
    expect(cues[0]).toEqual({ start: 1, end: 4, text: 'First line' })
  })

  it('keeps multi-line cue text and strips markup', () => {
    const cues = parseSubtitle(SRT)
    expect(cues[1].text).toBe('Second line\nstill second')
  })

  it('parses WebVTT with a header and cue ids', () => {
    const VTT = `WEBVTT

cue-1
00:00:02.000 --> 00:00:03.500
Hello there

NOTE this is ignored

00:00:04.000 --> 00:00:06.000
Goodbye`
    const cues = parseSubtitle(VTT)
    expect(cues.map((c) => c.text)).toEqual(['Hello there', 'Goodbye'])
    expect(cues[0].start).toBe(2)
  })

  it('sorts out-of-order cues by start time', () => {
    const messy = `1
00:00:10,000 --> 00:00:12,000
later

2
00:00:01,000 --> 00:00:02,000
earlier`
    expect(parseSubtitle(messy).map((c) => c.text)).toEqual(['earlier', 'later'])
  })

  it('drops blocks with bad or inverted ranges', () => {
    const bad = `1
00:00:05,000 --> 00:00:02,000
inverted

2
garbage --> garbage
nope`
    expect(parseSubtitle(bad)).toEqual([])
  })

  it('returns [] for empty and junk input', () => {
    expect(parseSubtitle('')).toEqual([])
    expect(parseSubtitle('just some prose, no timings')).toEqual([])
    expect(parseSubtitle(null)).toEqual([])
  })

  it('handles CRLF line endings and a BOM', () => {
    const crlf = '\uFEFF1\r\n00:00:01,000 --> 00:00:02,000\r\nHi\r\n'
    expect(parseSubtitle(crlf)).toEqual([{ start: 1, end: 2, text: 'Hi' }])
  })
})

describe('cueAt', () => {
  const cues = [
    { start: 1, end: 3, text: 'a' },
    { start: 5, end: 7, text: 'b' },
    { start: 9, end: 12, text: 'c' }
  ]

  it('finds the covering cue at boundaries', () => {
    expect(cueAt(cues, 1).text).toBe('a')
    expect(cueAt(cues, 2.9).text).toBe('a')
    expect(cueAt(cues, 6.99).text).toBe('b')
    expect(cueAt(cues, 7)).toBeNull() // end is exclusive
  })

  it('returns null in a gap and past the end', () => {
    expect(cueAt(cues, 4)).toBeNull()
    expect(cueAt(cues, 100)).toBeNull()
    expect(cueAt(cues, 0)).toBeNull()
  })

  it('handles an empty or missing list', () => {
    expect(cueAt([], 1)).toBeNull()
    expect(cueAt(undefined, 1)).toBeNull()
  })
})

describe('toSrt', () => {
  it('round-trips through the parser', () => {
    const cues = [
      { start: 1.5, end: 4, text: 'First' },
      { start: 5, end: 8.25, text: 'Second\ncontinued' }
    ]
    expect(parseSubtitle(toSrt(cues))).toEqual(cues)
  })
})

describe('ratings.summarise', () => {
  it('returns an empty summary with a full zero histogram', () => {
    expect(summarise([])).toEqual({ count: 0, average: 0, histogram: [0, 0, 0, 0, 0] })
  })

  it('averages and rounds to one decimal', () => {
    const s = summarise([{ stars: 5 }, { stars: 4 }, { stars: 4 }])
    expect(s.count).toBe(3)
    expect(s.average).toBeCloseTo(4.3, 1)
  })

  it('builds the histogram lowest-first', () => {
    const s = summarise([{ stars: 1 }, { stars: 5 }, { stars: 5 }])
    expect(s.histogram).toEqual([1, 0, 0, 0, 2])
  })

  it('ignores out-of-range and non-numeric stars', () => {
    const s = summarise([{ stars: 5 }, { stars: 9 }, { stars: 0 }, { stars: 'x' }, {}])
    expect(s.count).toBe(1)
    expect(s.average).toBe(5)
  })

  it('accepts numeric strings', () => {
    expect(summarise([{ stars: '4' }, { stars: '2' }]).average).toBe(3)
  })

  it('survives a missing argument', () => {
    expect(summarise().count).toBe(0)
  })
})

describe('translateCues batching contract', () => {
  // The AI layer is device-first and reads its key/budget state from
  // localStorage; the vitest env is plain node, so give it a stub.
  beforeAll(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      const store = new Map()
      globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear()
      }
    }
  })

  it('keeps original timings when a cue comes back untranslated', async () => {
    // The translator must never shift or drop a cue: a missing line falls back
    // to the source text with its original start/end intact.
    const { translateCues } = await import('../src/ai/subtitleTranslate.js')
    const cues = [
      { start: 0, end: 2, text: 'one' },
      { start: 2, end: 4, text: 'two' },
      { start: 4, end: 6, text: 'three' }
    ]
    // No providers are keyed in the test env, so every cue falls through and the
    // result must be the identity mapping rather than an empty track.
    const res = await translateCues(cues, 'ar', 'Arabic')
    expect(res.cues).toHaveLength(3)
    expect(res.cues.map((c) => [c.start, c.end])).toEqual([
      [0, 2],
      [2, 4],
      [4, 6]
    ])
    expect(res.cues.map((c) => c.text)).toEqual(['one', 'two', 'three'])
    expect(res.translated).toBe(0)
    expect(res.failed).toBe(3)
  })

  it('returns an empty result for an empty track', async () => {
    const { translateCues } = await import('../src/ai/subtitleTranslate.js')
    const res = await translateCues([], 'ur', 'Urdu')
    expect(res.cues).toEqual([])
  })
})

describe('auto captions', () => {
  beforeAll(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      const store = new Map()
      globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear()
      }
    }
  })

  it('shows the best saved track automatically', () => {
    localStorage.clear()
    const cue = { start: 0, end: 1, text: 'test' }
    expect(autoTrackFor('auto-title')).toBe('')
    saveTrack('auto-title', 'en', [cue])
    expect(autoTrackFor('auto-title')).toBe('en')
    saveTrack('auto-title', 'ur', [cue])
    expect(autoTrackFor('auto-title')).toBe('ur')
    removeTrack('auto-title', 'ur')
    expect(autoTrackFor('auto-title')).toBe('en')
  })
})
