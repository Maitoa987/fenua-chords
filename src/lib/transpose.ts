export const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
export const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

function parseChord(chord: string): { root: string; suffix: string } {
  // Match root: note + optional sharp/flat (2-char roots first, then 1-char)
  const match = chord.match(/^([A-G][b#]?)(.*)$/)
  if (!match) return { root: chord, suffix: '' }
  return { root: match[1], suffix: match[2] }
}

function transposeChord(chord: string, semitones: number): string {
  const { root, suffix } = parseChord(chord)
  const normalizedSemitones = ((semitones % 12) + 12) % 12

  // Determine which array to use based on root
  const usesFlat = NOTES_FLAT.includes(root) && !NOTES_SHARP.includes(root)
  const notes = usesFlat ? NOTES_FLAT : NOTES_SHARP

  const index = notes.indexOf(root)
  if (index === -1) return chord

  const newIndex = (index + normalizedSemitones) % 12
  return notes[newIndex] + suffix
}

export function transposeChordPro(content: string, semitones: number): string {
  if (semitones === 0) return content
  return content.replace(/\[([^\]]+)\]/g, (_, chord) => {
    return `[${transposeChord(chord, semitones)}]`
  })
}

export function getTransposedKey(originalKey: string, semitones: number): string {
  return transposeChord(originalKey, semitones)
}
