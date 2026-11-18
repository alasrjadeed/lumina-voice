export const voices = [
  {
    id: 'gb-young',
    name: 'Maisie Cole',
    nameUr: 'میزی کول',
    label: 'Young British',
    locale: 'en-GB',
    gender: 'female',
    role: 'Voice artist',
    sample: 'sample-gb-young',
    line: 'Lumina Voice. Close your eyes. The story begins.',
    bio: 'Young British voice. Bright comedy hours with a light Received Pronunciation — unhurried, clear, never clipped.'
  },
  {
    id: 'gb-male',
    name: 'Ryan Hale',
    nameUr: 'رائن ہیل',
    label: 'British male',
    locale: 'en-GB',
    gender: 'male',
    role: 'Voice artist',
    sample: 'sample-gb-male',
    line: 'Lumina Voice presents. Poetry and voices, around the clock.',
    bio: 'British male continuity. Reads crime and espionage IDs, then hands the hour to a Pakistani narrator. Measured Received Pronunciation.'
  },
  {
    id: 'gb-female',
    name: 'Libby Wren',
    nameUr: 'لِبی رین',
    label: 'British female',
    locale: 'en-GB',
    gender: 'female',
    role: 'Voice artist',
    sample: 'sample-gb-female',
    line: 'This is Lumina Voice. A drama follows. Close your eyes.',
    bio: 'British female continuity. Frames dramas and literary hours, then hands the hour to a Pakistani narrator. Warm, unhurried RP.'
  },
  {
    id: 'pk-girl',
    name: 'Hania Rizvi',
    nameUr: 'ہانیہ رضوی',
    label: 'Young girl, Pakistan',
    locale: 'ur-PK',
    gender: 'female',
    role: 'Narrator',
    sample: 'sample-pk-girl',
    line: 'لومینا وائس۔ آنکھیں بند کیجیے… کہانی شروع ہوتی ہے۔',
    bio: 'Young Pakistani reciter. Poetry hours and lantern verses, spoken as if from a Karachi courtyard at dusk — light, clear, never rushed.'
  },
  {
    id: 'pk-male',
    name: 'Asad Rehman',
    nameUr: 'اسد رحمان',
    label: 'Pakistani male',
    locale: 'ur-PK',
    gender: 'male',
    role: 'Narrator',
    sample: 'sample-pk-male',
    line: 'لومینا وائس پیش کرتا ہے۔ آواز سنو۔ چہرہ مت دیکھو۔',
    bio: 'Pakistani male narrator. Espionage, crime, and court farce — the grain of classic Urdu radio drama, spoken, not recited.'
  },
  {
    id: 'pk-female',
    name: 'Uzma Karim',
    nameUr: 'عظمى کریم',
    label: 'Pakistani female',
    locale: 'ur-PK',
    gender: 'female',
    role: 'Narrator',
    sample: 'sample-pk-female',
    line: 'لومینا وائس۔ شاعری اور آوازیں، چوبیس گھنٹے۔ آنکھیں بند کیجیے۔',
    bio: 'Pakistani female narrator. Intimate stage lives and literary hours. Natural Karachi Urdu.'
  }
]

export function getVoice(id) {
  return voices.find((v) => v.id === id)
}

export function voiceForTitle(title) {
  if (!title) return getVoice('pk-female')
  if (title.voiceId) return getVoice(title.voiceId)
  if (title.seriesId === 'raat-ke-musafir' || title.seriesId === 'bandargah' || title.seriesId === 'chandni-darbar') {
    return getVoice('pk-male')
  }
  if (title.seriesId === 'shehr-e-khawab') return getVoice('pk-female')
  if (title.seriesId === 'harry-potter') return getVoice('pk-girl')
  if (title.id === 'nazm-01' || title.id === 'nazm-03') return getVoice('pk-girl')
  if (title.id === 'nazm-02') return getVoice('pk-male')
  if (title.kind === 'Audiobook') return getVoice('pk-female')
  if (title.kind === 'Ghazals') return getVoice('pk-male')
  return getVoice('pk-female')
}

export function titlesByVoice(voiceId, catalog) {
  if (!catalog) return []
  let studio = null
  try {
    if (typeof localStorage !== 'undefined') {
      studio = JSON.parse(localStorage.getItem('lumina-voice-studio-v1') || 'null')
    }
  } catch {
    studio = null
  }
  return catalog.filter((t) => {
    const override = studio?.assignments?.[t.id]?.voiceId
    return (override || t.voiceId || voiceForTitle(t)?.id) === voiceId
  })
}
