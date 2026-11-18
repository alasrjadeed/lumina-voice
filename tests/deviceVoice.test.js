import { describe, expect, it } from 'vitest'
import { prepareSpeechText, rankVoices, speechRate, ttsEngine } from '../src/ai/deviceVoice'

describe('Urdu speech shaping', () => {
  it('uses Urdu punctuation, digits and a natural pause', () => {
    expect(prepareSpeechText('Episode 2, minutes 12...', 'ur')).toBe('Episode ۲، minutes ۱۲۔')
    expect(prepareSpeechText('آنکھیں بند کیجیے… کہانی شروع', 'ur')).toBe('آنکھیں بند کیجیے، کہانی شروع')
    expect(prepareSpeechText('کیسے ہو? ٹھیک!', 'ur')).toBe('کیسے ہو؟ ٹھیک!')
  })

  it('keeps English punctuation for English speech', () => {
    expect(prepareSpeechText('Wait... ready? 2, 3!', 'en-GB')).toBe('Wait, ready? 2, 3!')
  })

  it('strips markup and clamps length without leaving double spaces', () => {
    const out = prepareSpeechText('  [Intro]   <safe>  آواز   سنو  ', 'ur')
    expect(out).toBe('Intro safe آواز سنو')
    expect(prepareSpeechText('x'.repeat(900), 'ur')).toHaveLength(400)
  })

  it('reads Urdu a little slower than the UI speed', () => {
    expect(speechRate(1, 'ur-PK')).toBe(0.95)
    expect(speechRate(1, 'en-GB')).toBe(1)
    expect(speechRate(9, 'ur')).toBe(1.25)
    expect(speechRate(0, 'ur')).toBe(0.95)
    expect(speechRate(0.5, 'ur')).toBe(0.7)
  })

  it('prefers an installed local ur-PK voice over English or network voices', () => {
    const ranked = rankVoices([
      { name: 'English', lang: 'en-US', localService: true },
      { name: 'Urdu cloud', lang: 'ur-PK', localService: false },
      { name: 'Urdu local', lang: 'ur-PK', localService: true },
      { name: 'Urdu India', lang: 'ur-IN', localService: true }
    ], 'ur')
    expect(ranked.map((v) => v.name)).toEqual(['Urdu local', 'Urdu cloud', 'Urdu India', 'English'])
  })

  it('reports no engine outside a browser or native app', () => {
    expect(ttsEngine()).toBe('none')
  })
})
