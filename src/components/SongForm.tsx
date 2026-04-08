"use client"

import type { Style, Instrument } from "@/types/database"
import { ArtistAutocomplete, type ArtistValue } from "@/components/ArtistAutocomplete"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

const STYLE_LABEL: Record<Style, string> = Object.fromEntries(
  STYLES.map((s) => [s.value, s.label])
) as Record<Style, string>

const INSTRUMENT_LABEL: Record<Instrument, string> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.value, i.label])
) as Record<Instrument, string>

export function SongForm({ data, onChange }: SongFormProps) {
  function update<K extends keyof SongFormData>(key: K, value: SongFormData[K]) {
    onChange({ ...data, [key]: value })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Title — span 2 */}
      <div className="sm:col-span-2 space-y-1">
        <Label>Titre <span className="text-destructive">*</span></Label>
        <Input
          type="text"
          value={data.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Titre de la chanson"
        />
      </div>

      {/* Artist — span 2 */}
      <div className="sm:col-span-2 space-y-1">
        <Label>Artiste <span className="text-destructive">*</span></Label>
        <ArtistAutocomplete
          value={data.artist}
          onChange={(v) => onChange({ ...data, artist: v })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Si l&apos;artiste n&apos;existe pas encore, il sera créé automatiquement.
        </p>
      </div>

      {/* Style */}
      <div className="space-y-1">
        <Label>Style</Label>
        <Select
          value={data.style}
          onValueChange={(v) => update("style", v as Style)}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(v: Style | null) => v ? STYLE_LABEL[v] : "Sélectionner..."}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STYLES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Instrument */}
      <div className="space-y-1">
        <Label>Instrument</Label>
        <Select
          value={data.instrument}
          onValueChange={(v) => update("instrument", v as Instrument)}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(v: Instrument | null) => v ? INSTRUMENT_LABEL[v] : "Sélectionner..."}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {INSTRUMENTS.map((i) => (
              <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Original Key */}
      <div className="space-y-1">
        <Label>Tonalité</Label>
        <Select
          value={data.originalKey || null}
          onValueChange={(v) => update("originalKey", v ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Non spécifiée" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null as unknown as string}>Non spécifiée</SelectItem>
            {KEYS.map((k) => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Capo */}
      <div className="space-y-1">
        <Label>Capo</Label>
        <Select
          value={String(data.capo)}
          onValueChange={(v) => update("capo", parseInt(v ?? "0"))}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(v: string | null) =>
                v === null ? "Sans capo" : parseInt(v) === 0 ? "Sans capo" : `Capo ${v}`
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 13 }, (_, i) => (
              <SelectItem key={i} value={String(i)}>
                {i === 0 ? "Sans capo" : `Capo ${i}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tuning — span 2 */}
      <div className="sm:col-span-2 space-y-1">
        <Label>Accordage</Label>
        <Input
          type="text"
          value={data.tuning}
          onChange={(e) => update("tuning", e.target.value)}
          placeholder="ex: Standard, DADGAD, Open G..."
        />
      </div>
    </div>
  )
}
