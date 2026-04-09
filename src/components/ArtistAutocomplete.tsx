"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { XIcon } from "lucide-react"

export interface ArtistValue {
  id: string | null
  name: string
}

interface ArtistAutocompleteProps {
  value: ArtistValue[]
  onChange: (value: ArtistValue[]) => void
}

const supabase = createClient()

export function ArtistAutocomplete({ value, onChange }: ArtistAutocompleteProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ArtistValue[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("artists")
      .select("id, name")
      .ilike("name", `%${q}%`)
      .limit(8)
    setResults((data ?? []).map((a) => ({ id: a.id as string, name: a.name as string })))
    setLoading(false)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter out already-selected artists from results
  const selectedIds = new Set(value.map((a) => a.id).filter(Boolean))
  const selectedNames = new Set(value.map((a) => a.name.toLowerCase()))
  const filteredResults = results.filter(
    (r) => !selectedIds.has(r.id) && !selectedNames.has(r.name.toLowerCase())
  )

  function selectExisting(artist: ArtistValue) {
    onChange([...value, artist])
    setQuery("")
    setOpen(false)
    setResults([])
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function selectNew() {
    onChange([...value, { id: null, name: query.trim() }])
    setQuery("")
    setOpen(false)
    setResults([])
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function removeArtist(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  const showCreateOption =
    query.trim().length > 0 &&
    !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase()) &&
    !selectedNames.has(query.trim().toLowerCase())

  return (
    <div ref={containerRef} className="relative">
      {/* Selected artists as tags + input */}
      <div className="flex flex-wrap items-center gap-1.5 min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
        {value.map((artist, index) => (
          <span
            key={`${artist.id ?? artist.name}-${index}`}
            className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-medium"
          >
            {artist.name}
            {artist.id === null && (
              <span className="text-xs opacity-60 ml-0.5">(nouveau)</span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => removeArtist(index)}
              className="ml-0.5 hover:opacity-70 rounded-full"
              aria-label={`Retirer ${artist.name}`}
            >
              <XIcon />
            </Button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder={value.length === 0 ? "Nom de l'artiste" : "Ajouter un artiste..."}
          className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground"
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {open && (filteredResults.length > 0 || showCreateOption || loading) && (
        <div className="absolute z-20 w-full mt-1 shadow-lg rounded-xl overflow-hidden border border-border">
          <Command shouldFilter={false}>
            <CommandList>
              {loading && (
                <CommandEmpty>Recherche...</CommandEmpty>
              )}
              {!loading && filteredResults.length === 0 && !showCreateOption && (
                <CommandEmpty>Aucun resultat.</CommandEmpty>
              )}
              {!loading && filteredResults.length > 0 && (
                <CommandGroup>
                  {filteredResults.map((artist) => (
                    <CommandItem
                      key={artist.id}
                      value={artist.name}
                      onSelect={() => selectExisting(artist)}
                    >
                      {artist.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {!loading && showCreateOption && (
                <CommandGroup>
                  <CommandItem
                    value={`__create__${query.trim()}`}
                    onSelect={selectNew}
                    className="text-primary font-medium"
                  >
                    Creer &ldquo;{query.trim()}&rdquo;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
