import { ChordRenderer } from "@/components/ChordRenderer"

interface ChordPreviewProps {
  content: string
}

export function ChordPreview({ content }: ChordPreviewProps) {
  if (!content.trim())
    return <p className="text-muted-foreground text-sm italic">La preview apparaitra ici...</p>
  return <ChordRenderer content={content} />
}
