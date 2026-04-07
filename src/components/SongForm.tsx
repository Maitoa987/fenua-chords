"use client"

import type { Style, Instrument } from "@/types/database"
import { ArtistAutocomplete, type ArtistValue } from "@/components/ArtistAutocomplete"

export interface SongFormData {
  title: string
  artist: ArtistValue | null
  style: Style
  instrument: Instrument
  originalKey: string
  capo: number
  tuning: string
}

interface SongFormProps {
  data: SongFormData
  onChange: (data: SongFormData) => void
}

const STYLES: { value: Style; label: string }[] = [
  { value: "bringue", label: "Bringue" },
  { value: "himene", label: "Himene" },
  { value: "variete", label: "Variété" },
  { value: "traditionnel", label: "Traditionnel" },
  { value: "autre", label: "Autre" },
]

const INSTRUMENTS: { value: Instrument; label: string }[] = [
  { value: "guitare", label: "Guitare" },
  { value: "ukulele", label: "Ukulele" },
  { value: "basse", label: "Basse" },
  { value: "ukulele-bass", label: "Ukulele Bass" },
]

const KEYS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F",
  "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
  "Cm", "C#m", "Dbm", "Dm", "D#m", "Ebm", "Em", "Fm",
  "F#m", "Gbm", "Gm", "G#m", "Abm", "Am", "A#m", "Bbm", "Bm",
]

export function SongForm({ data, onChange }: SongFormProps) {
  function update<K extends keyof SongFormData>(key: K, value: SongFormData[K]) {
    onChange({ ...data, [key]: value })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Title — span 2 */}
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Titre *</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Titre de la chanson"
          className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Artist — span 2 */}
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Artiste *</label>
        <ArtistAutocomplete
          value={data.artist}
          onChange={(v) => onChange({ ...data, artist: v })}
        />
        <p className="text-xs text-text-muted mt-1">
          Si l&apos;artiste n&apos;existe pas encore, il sera créé automatiquement.
        </p>
      </div>

      {/* Style */}
      <div>
        <label className="block text-sm font-medium mb-1">Style</label>
        <select
          value={data.style}
          onChange={(e) => update("style", e.target.value as Style)}
          className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Instrument */}
      <div>
        <label className="block text-sm font-medium mb-1">Instrument</label>
        <select
          value={data.instrument}
          onChange={(e) => update("instrument", e.target.value as Instrument)}
          className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {INSTRUMENTS.map((i) => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
      </div>

      {/* Original Key */}
      <div>
        <label className="block text-sm font-medium mb-1">Tonalité</label>
        <select
          value={data.originalKey}
          onChange={(e) => update("originalKey", e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Non spécifiée</option>
          {KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      {/* Capo */}
      <div>
        <label className="block text-sm font-medium mb-1">Capo</label>
        <select
          value={data.capo}
          onChange={(e) => update("capo", parseInt(e.target.value))}
          className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {Array.from({ length: 13 }, (_, i) => (
            <option key={i} value={i}>{i === 0 ? "Sans capo" : `Capo ${i}`}</option>
          ))}
        </select>
      </div>

      {/* Tuning — span 2 */}
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Accordage</label>
        <input
          type="text"
          value={data.tuning}
          onChange={(e) => update("tuning", e.target.value)}
          placeholder="ex: Standard, DADGAD, Open G..."
          className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  )
}
