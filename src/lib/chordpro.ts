export interface ChordSegment {
  chord: string | null
  text: string
}

export interface ChordLine {
  segments: ChordSegment[]
}

export function parseChordPro(content: string): ChordLine[] {
  const rawLines = content.split('\n')

  return rawLines.map((line) => {
    const segments: ChordSegment[] = []
    const regex = /\[([^\]]+)\]([^[]*)/g

    const firstBracket = line.indexOf('[')
    if (firstBracket > 0) {
      segments.push({ chord: null, text: line.slice(0, firstBracket) })
    } else if (firstBracket === -1) {
      return { segments: [{ chord: null, text: line }] }
    }

    regex.lastIndex = firstBracket >= 0 ? firstBracket : 0

    let match: RegExpExecArray | null
    while ((match = regex.exec(line)) !== null) {
      segments.push({ chord: match[1], text: match[2] })
    }

    return { segments }
  })
}

export function serializeChordPro(lines: ChordLine[]): string {
  return lines
    .map((line) =>
      line.segments
        .map((seg) => (seg.chord !== null ? `[${seg.chord}]${seg.text}` : seg.text))
        .join('')
    )
    .join('\n')
}

export function wordsToChordPro(lyrics: string, chordMap: Map<string, string>): string {
  const lines = lyrics.split('\n')
  return lines
    .map((line, lineIndex) => {
      const words = line.split(' ')
      return words
        .map((word, wordIndex) => {
          const key = `${lineIndex}-${wordIndex}`
          const chord = chordMap.get(key)
          return chord ? `[${chord}]${word}` : word
        })
        .join(' ')
    })
    .join('\n')
}

export function extractLyrics(content: string): string {
  return content.replace(/\[[^\]]+\]/g, '')
}

export function chordProToWordMap(content: string): Map<string, string> {
  const map = new Map<string, string>()
  const lines = content.split('\n')

  lines.forEach((line, lineIndex) => {
    const plainLine = extractLyrics(line)
    const words = plainLine.split(' ')
    let wordIndex = 0

    const firstBracket = line.indexOf('[')
    if (firstBracket > 0) {
      const preBracketText = line.slice(0, firstBracket)
      const preWords = preBracketText.split(' ').filter((w) => w.length > 0)
      wordIndex += preWords.length
    }

    const regex = /\[([^\]]+)\]([^[]*)/g
    regex.lastIndex = firstBracket >= 0 ? firstBracket : 0

    let match: RegExpExecArray | null
    while ((match = regex.exec(line)) !== null) {
      const chord = match[1]
      const text = match[2]

      if (wordIndex < words.length) {
        map.set(`${lineIndex}-${wordIndex}`, chord)
      }

      const segWords = text.split(' ').filter((w) => w.length > 0)
      wordIndex += segWords.length
    }
  })

  return map
}
