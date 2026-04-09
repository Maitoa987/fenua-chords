import { parseChordPro } from '@/lib/chordpro'

interface ChordRendererProps {
  content: string
  className?: string
}

export function ChordRenderer({ content, className }: ChordRendererProps) {
  const lines = parseChordPro(content)

  return (
    <div className={className ?? "font-mono text-base leading-relaxed whitespace-pre-wrap"}>
      {lines.map((line, lineIndex) => {
        const hasChords = line.segments.some((seg) => seg.chord !== null)

        // Empty line = visible blank line for spacing
        const isEmpty = line.segments.length === 0 || (line.segments.length === 1 && !line.segments[0].chord && line.segments[0].text === '')
        if (isEmpty) {
          return <div key={lineIndex} className="h-4" />
        }

        return (
          <div key={lineIndex} className="flex flex-wrap">
            {line.segments.map((seg, segIndex) => (
              <span
                key={segIndex}
                style={{
                  position: 'relative',
                  ...(hasChords ? { paddingTop: '1.4em' } : {}),
                }}
              >
                {seg.chord !== null && (
                  <span
                    style={{ position: 'absolute', top: 0, left: 0 }}
                    className={`font-mono font-bold text-chord whitespace-nowrap ${className ? 'text-[0.85em]' : 'text-sm'}`}
                  >
                    {seg.chord}
                  </span>
                )}
                {seg.text}
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}
