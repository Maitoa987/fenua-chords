"use client"

import { ChordPreview } from "./ChordPreview"

interface ChordProTextareaProps {
  value: string
  onChange: (value: string) => void
}

export function ChordProTextarea({ value, onChange }: ChordProTextareaProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-text-muted mb-2">
          Entourez les accords entre crochets directement dans le texte :{" "}
          <span className="font-mono bg-secondary/15 px-1 rounded">[Am]paroles [C]du couplet</span>
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          placeholder={"[Am]Ia ora na [C]tatou\n[F]E haere [G]mai..."}
          className="w-full font-mono text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
      </div>

      <div>
        <p className="text-xs text-text-muted mb-2">Aperçu</p>
        <div className="border border-border rounded-lg px-4 py-3 bg-secondary/5 min-h-[80px]">
          <ChordPreview content={value} />
        </div>
      </div>
    </div>
  )
}
